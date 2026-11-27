import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  abortActiveRequests,
  api,
  ApiError,
  bumpGeneration,
  onUnauthorized,
} from '../api/client';
import type { Profile } from '../api/types';

const HINT_KEY = 'foundationos.v0.3.member';
const LAST_KEY = 'foundationos.v0.3.last-member';

export interface MemberHint {
  id: string;
  name: string;
}

export function readHint(): MemberHint | null {
  try {
    const raw = sessionStorage.getItem(HINT_KEY) ?? sessionStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberHint;
    if (typeof parsed?.id === 'string' && typeof parsed?.name === 'string') return parsed;
  } catch {
    /* ignore malformed storage */
  }
  return null;
}

function rememberMember(profile: Profile) {
  try {
    const hint = JSON.stringify({ id: profile.id, name: profile.name });
    sessionStorage.setItem(HINT_KEY, hint);
    sessionStorage.setItem(LAST_KEY, hint);
  } catch {
    /* storage may be unavailable */
  }
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.failure.kind === 'unauthorized') return 'The username or password is not correct.';
    if (error.failure.kind === 'offline') return 'The server is unreachable. Start the v0.3 server and try again.';
    if (error.failure.kind === 'aborted') return 'The attempt was superseded.';
    if (error.failure.kind === 'server') return error.failure.message;
  }
  return 'Something went wrong. Try again.';
}

type Result = { ok: true } | { ok: false; error: string };

interface SessionValue {
  status: 'loading' | 'none' | 'ready';
  profile: Profile | null;
  error: string | null;
  wasReplaced: boolean;
  recoveryCode: string | null;
  signIn: (username: string, password: string, remember: boolean) => Promise<Result>;
  setupOwner: (claim: string, username: string, password: string, email: string) => Promise<Result>;
  join: (code: string, username: string, password: string, email: string) => Promise<Result>;
  signOut: () => Promise<{ ok: boolean; warning?: string }>;
  signOutAll: () => Promise<{ ok: boolean; warning?: string }>;
  refresh: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  clearReplaced: () => void;
  clearRecoveryCode: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'loading' | 'none' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [wasReplaced, setWasReplaced] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applyProfile = useCallback((next: Profile) => {
    const hint = readHint();
    setProfileState(next);
    setStatus('ready');
    setError(null);
    if (hint && hint.id !== next.id) setWasReplaced(true);
    rememberMember(next);
    bumpGeneration();
  }, []);

  const clearSession = useCallback((message: string | null) => {
    abortActiveRequests();
    bumpGeneration();
    setProfileState(null);
    setStatus('none');
    setError(message);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.profile({ notifyUnauthorized: false })
      .then((next) => {
        if (!cancelled) applyProfile(next);
      })
      .catch((failure) => {
        if (cancelled) return;
        setStatus('none');
        setError(failure instanceof ApiError && failure.failure.kind === 'offline' ? messageOf(failure) : null);
      });
    return () => {
      cancelled = true;
      abortActiveRequests();
    };
  }, [applyProfile]);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      if (!mounted.current) return;
      clearSession('Your session ended. Sign in again to continue.');
    });
    return () => {
      unsubscribe();
    };
  }, [clearSession]);

  const signIn = useCallback(async (username: string, password: string, remember: boolean): Promise<Result> => {
    abortActiveRequests();
    setError(null);
    try {
      const result = await api.signIn(username.trim(), password, remember);
      applyProfile(result.profile);
      return { ok: true };
    } catch (failure) {
      const message = messageOf(failure);
      setError(message);
      return { ok: false, error: message };
    }
  }, [applyProfile]);

  const setupOwner = useCallback(async (claim: string, username: string, password: string, email: string): Promise<Result> => {
    setError(null);
    try {
      const result = await api.setupOwner(claim, username.trim(), password, email);
      setRecoveryCode(result.recoveryCode);
      applyProfile(result.profile);
      return { ok: true };
    } catch (failure) {
      const message = messageOf(failure);
      setError(message);
      return { ok: false, error: message };
    }
  }, [applyProfile]);

  const join = useCallback(async (code: string, username: string, password: string, email: string): Promise<Result> => {
    setError(null);
    try {
      const result = await api.join(code, username.trim(), password, email);
      applyProfile(result.profile);
      return { ok: true };
    } catch (failure) {
      const message = messageOf(failure);
      setError(message);
      return { ok: false, error: message };
    }
  }, [applyProfile]);

  const signOut = useCallback(async () => {
    let warning: string | undefined;
    try {
      await api.signOut();
    } catch (failure) {
      if (!(failure instanceof ApiError && failure.failure.kind === 'unauthorized')) {
        warning = 'Local access ended. The server could not confirm the sign-out, so this session may still be valid on the server.';
      }
    }
    clearSession(null);
    return { ok: true, warning };
  }, [clearSession]);

  const signOutAll = useCallback(async () => {
    let warning: string | undefined;
    try {
      await api.signOutAll();
    } catch (failure) {
      if (!(failure instanceof ApiError && failure.failure.kind === 'unauthorized')) {
        warning = 'Local access ended. The server could not confirm that every session ended.';
      }
    }
    clearSession(null);
    return { ok: true, warning };
  }, [clearSession]);

  const refresh = useCallback(async () => {
    try {
      const next = await api.profile({ notifyUnauthorized: false });
      applyProfile(next);
    } catch (failure) {
      if (failure instanceof ApiError && failure.failure.kind === 'unauthorized') clearSession(null);
    }
  }, [applyProfile, clearSession]);

  const value = useMemo<SessionValue>(() => ({
    status,
    profile,
    error,
    wasReplaced,
    recoveryCode,
    signIn,
    setupOwner,
    join,
    signOut,
    signOutAll,
    refresh,
    setProfile: applyProfile,
    clearReplaced: () => setWasReplaced(false),
    clearRecoveryCode: () => setRecoveryCode(null),
  }), [status, profile, error, wasReplaced, recoveryCode, signIn, setupOwner, join, signOut, signOutAll, refresh, applyProfile]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
