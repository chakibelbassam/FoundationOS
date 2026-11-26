import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadPreferences, savePreferences } from '../api/client';
import type { Preferences } from '../api/types';
import { useSession } from '../app/SessionContext';

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  surface: 'glass',
  density: 'comfortable',
  motion: 'on',
  cursor: 'target',
  background: 'topography',
  projects: [],
  recentApps: [],
};

export const PREFERENCE_OPTIONS = {
  theme: ['system', 'light', 'dark'],
  surface: ['solid', 'glass'],
  density: ['comfortable', 'compact'],
  motion: ['on', 'off', 'system'],
  cursor: ['system', 'target'],
  background: ['standard', 'topography', 'magic-rings', 'lightfall', 'ghost-fibers'],
} as const;

export const MAX_PINNED_PROJECTS = 8;
export const MAX_RECENT_APPS = 8;
const MAX_PATH_LENGTH = 200;

// Member-relative paths only: no leading slash, no parent escapes, no
// backslashes or control characters. Mirrors the host validation.
export function isMemberPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_PATH_LENGTH) return false;
  if (value.startsWith('/') || value.endsWith('/') || value.includes('\\')) return false;
  if (/(^|\/)\.\.(\/|$)/.test(value)) return false;
  if (/[\0-\x1f\x7f]/.test(value)) return false;
  return value.split('/').every((part) => part.trim().length > 0);
}

// Pure list rules, unit-tested: pinning refuses beyond the cap with an error,
// recency de-duplicates newest-first and evicts the oldest beyond the cap.
export function toggleProjectInList(
  current: string[],
  path: string,
): { projects: string[] } | { error: string } {
  const target = path.replace(/\/+$/, '');
  if (!isMemberPath(target)) return { error: 'That folder cannot be pinned.' };
  if (current.includes(target)) {
    return { projects: current.filter((entry) => entry !== target) };
  }
  if (current.length >= MAX_PINNED_PROJECTS) {
    return { error: `You can pin up to ${MAX_PINNED_PROJECTS} projects. Unpin one first.` };
  }
  return { projects: [...current, target] };
}

export function recordAppInList(current: string[], path: string): string[] {
  const target = path.replace(/\/+$/, '');
  if (!isMemberPath(target)) return current;
  return [target, ...current.filter((entry) => entry !== target)].slice(0, MAX_RECENT_APPS);
}

interface PreferencesValue {
  applied: Preferences;
  draft: Preferences | null;
  effective: Preferences;
  loading: boolean;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  setDraft: (next: Preferences) => void;
  updateDraft: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  apply: () => Promise<boolean>;
  cancel: () => void;
  reset: () => void;
  toggleProject: (path: string) => Promise<boolean>;
  recordRecentApp: (path: string) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { profile } = useSession();
  const [applied, setApplied] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [draft, setDraftState] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const memberRef = useRef<string | undefined>(profile?.id);
  const appliedRef = useRef(applied);
  appliedRef.current = applied;

  useEffect(() => {
    memberRef.current = profile?.id;
    setDraftState(null);
    setSaveState('idle');
    setSaveError(null);
    if (!profile) {
      setApplied(DEFAULT_PREFERENCES);
      return;
    }
    const memberId = profile.id;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    loadPreferences({ signal: controller.signal })
      .then((stored) => {
        if (cancelled || memberRef.current !== memberId) return;
        setApplied(stored ? { ...DEFAULT_PREFERENCES, ...stored } : DEFAULT_PREFERENCES);
      })
      .catch((error) => {
        if (cancelled || memberRef.current !== memberId) return;
        if (error && typeof error === 'object' && 'failure' in error) {
          if ((error as { failure: { kind: string } }).failure.kind === 'aborted') return;
        }
        if (!cancelled) setApplied(DEFAULT_PREFERENCES);
      })
      .finally(() => {
        if (!cancelled && memberRef.current === memberId) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [profile]);

  const setDraft = useCallback((next: Preferences) => {
    setDraftState(next);
    setSaveState('idle');
    setSaveError(null);
  }, []);

  const updateDraft = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setDraftState((current) => ({ ...(current ?? appliedRef.current), [key]: value }));
    setSaveState('idle');
    setSaveError(null);
  }, []);

  const apply = useCallback(async () => {
    if (!profile) return false;
    const memberId = profile.id;
    // Rebase the draft over the current saved values so immediate saves that
    // landed while the draft was open (pins, recent apps) are not clobbered.
    const next = { ...appliedRef.current, ...(draft ?? {}) };
    setSaveState('saving');
    setSaveError(null);
    try {
      const saved = await savePreferences(next);
      // A member switch during the save must not apply stale results.
      if (memberRef.current !== memberId) return false;
      setApplied({ ...DEFAULT_PREFERENCES, ...saved });
      setDraftState(null);
      setSaveState('saved');
      return true;
    } catch (error) {
      if (memberRef.current !== memberId) return false;
      if (error && typeof error === 'object' && 'failure' in error) {
        if ((error as { failure: { kind: string } }).failure.kind === 'aborted') return false;
      }
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'The settings could not be saved.');
      return false;
    }
  }, [draft, profile]);

  const cancel = useCallback(() => {
    setDraftState(null);
    setSaveState('idle');
    setSaveError(null);
  }, []);

  const reset = useCallback(() => {
    setDraftState(DEFAULT_PREFERENCES);
    setSaveState('idle');
    setSaveError(null);
  }, []);

  // Immediate saves bypass the draft so pins and recency persist at once. A
  // failure is surfaced through saveState/saveError and the saved values
  // stay untouched.
  const saveImmediate = useCallback(
    async (mutate: (current: Preferences) => Preferences | { error: string }): Promise<boolean> => {
      if (!profile) return false;
      const memberId = profile.id;
      const outcome = mutate(appliedRef.current);
      if ('error' in outcome) {
        setSaveState('error');
        setSaveError(outcome.error);
        return false;
      }
      setSaveState('saving');
      setSaveError(null);
      try {
        const saved = await savePreferences(outcome);
        if (memberRef.current !== memberId) return false;
        setApplied({ ...DEFAULT_PREFERENCES, ...saved });
        setSaveState('saved');
        return true;
      } catch (error) {
        if (memberRef.current !== memberId) return false;
        if (error && typeof error === 'object' && 'failure' in error) {
          if ((error as { failure: { kind: string } }).failure.kind === 'aborted') return false;
        }
        setSaveState('error');
        setSaveError(error instanceof Error ? error.message : 'The settings could not be saved.');
        return false;
      }
    },
    [profile],
  );

  const toggleProject = useCallback(
    (path: string) => {
      return saveImmediate((current) => {
        const outcome = toggleProjectInList(current.projects ?? [], path);
        if ('error' in outcome) return outcome;
        return { ...current, projects: outcome.projects };
      });
    },
    [saveImmediate],
  );

  const recordRecentApp = useCallback(
    (path: string) => {
      const target = path.replace(/\/+$/, '');
      if (!isMemberPath(target)) return Promise.resolve();
      const current = appliedRef.current.recentApps ?? [];
      if (current[0] === target) return Promise.resolve();
      return saveImmediate((state) => ({
        ...state,
        recentApps: recordAppInList(state.recentApps ?? [], path),
      })).then(() => undefined);
    },
    [saveImmediate],
  );

  const effective = draft ?? applied;

  const value = useMemo<PreferencesValue>(() => ({
    applied,
    draft,
    effective,
    loading,
    saveState,
    saveError,
    setDraft,
    updateDraft,
    apply,
    cancel,
    reset,
    toggleProject,
    recordRecentApp,
  }), [applied, draft, effective, loading, saveState, saveError, setDraft, updateDraft, apply, cancel, reset, toggleProject, recordRecentApp]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function motionIsReduced(choice: Preferences['motion']) {
  if (choice === 'off') return true;
  if (choice === 'system') return prefersReducedMotion();
  return false;
}
