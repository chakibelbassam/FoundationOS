import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

  useEffect(() => {
    setDraftState(null);
    setSaveState('idle');
    setSaveError(null);
    if (!profile) {
      setApplied(DEFAULT_PREFERENCES);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadPreferences(profile.id)
      .then((stored) => {
        if (cancelled) return;
        setApplied(stored ? { ...DEFAULT_PREFERENCES, ...stored } : DEFAULT_PREFERENCES);
      })
      .catch(() => {
        if (!cancelled) setApplied(DEFAULT_PREFERENCES);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
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
    const next = draft ?? applied;
    setSaveState('saving');
    setSaveError(null);
    try {
      const saved = await savePreferences(profile.id, next);
      setApplied({ ...DEFAULT_PREFERENCES, ...saved });
      setDraftState(null);
      setSaveState('saved');
      return true;
    } catch (error) {
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
