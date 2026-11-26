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
};

export const PREFERENCE_OPTIONS = {
  theme: ['system', 'light', 'dark'],
  surface: ['solid', 'glass'],
  density: ['comfortable', 'compact'],
  motion: ['on', 'off', 'system'],
  cursor: ['system', 'target'],
} as const;

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
    setDraftState((current) => ({ ...(current ?? applied), [key]: value }));
    setSaveState('idle');
    setSaveError(null);
  }, [applied]);

  const apply = useCallback(async () => {
    if (!profile) return false;
    const memberId = profile.id;
    const next = draft ?? applied;
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
  }, [applied, draft, profile]);

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
  }), [applied, draft, effective, loading, saveState, saveError, setDraft, updateDraft, apply, cancel, reset]);

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
