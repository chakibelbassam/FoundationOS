import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, onUnauthorized, setToken } from '../api/client';
import type { Profile } from '../api/types';

const HINT_KEY = 'foundationos.v0.2.member';
const LAST_KEY = 'foundationos.v0.2.last-member';

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

export function rememberMember(profile: Profile) {
  try {
    sessionStorage.setItem(HINT_KEY, JSON.stringify({ id: profile.id, name: profile.name }));
    sessionStorage.setItem(LAST_KEY, JSON.stringify({ id: profile.id, name: profile.name }));
  } catch {
    /* storage may be unavailable */
  }
}

interface SessionValue {
  status: 'none' | 'connecting' | 'ready';
  profile: Profile | null;
  error: string | null;
  wasReplaced: boolean;
  connect: (token: string) => Promise<{ ok: true; profile: Profile } | { ok: false; error: string }>;
  disconnect: () => void;
  clearReplaced: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'none' | 'connecting' | 'ready'>('none');
  const [error, setError] = useState<string | null>(null);
  const [wasReplaced, setWasReplaced] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const connect = useCallback(async (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return { ok: false as const, error: 'Enter an existing member session token.' };
    setStatus('connecting');
    setError(null);
    setToken(trimmed);
    try {
      const next = await api.profile();
      tokenRef.current = trimmed;
      setProfile(next);
      setStatus('ready');
      const hint = readHint();
      if (hint && hint.id !== next.id) setWasReplaced(true);
      rememberMember(next);
      return { ok: true as const, profile: next };
    } catch (failure) {
      setToken(null);
      tokenRef.current = null;
      setProfile(null);
      setStatus('none');
      const message =
        failure && typeof failure === 'object' && 'failure' in failure
          ? (failure as { failure: { kind: string; message?: string } }).failure.kind === 'unauthorized'
            ? 'That session token is not valid or has been revoked.'
            : (failure as { failure: { message?: string } }).failure.message ?? 'Could not reach the server.'
          : 'Could not connect.';
      setError(message);
      return { ok: false as const, error: message };
    }
  }, []);

  const disconnect = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    setProfile(null);
    setStatus('none');
    setError(null);
  }, []);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setToken(null);
      tokenRef.current = null;
      setProfile(null);
      setStatus('none');
      setError('Your session expired. Connect again to continue.');
    });
    return () => {
      unsubscribe();
    };
  }, []);
  const value = useMemo<SessionValue>(
    () => ({ status, profile, error, wasReplaced, connect, disconnect, clearReplaced: () => setWasReplaced(false) }),
    [status, profile, error, wasReplaced, connect, disconnect],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
