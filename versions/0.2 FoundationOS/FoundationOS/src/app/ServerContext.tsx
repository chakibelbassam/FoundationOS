import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { checkServer, onServerReachable, onServerUnreachable } from '../api/client';
import type { ClientConfig } from '../api/types';

interface ServerValue {
  config: ClientConfig | null;
  loading: boolean;
  check: () => Promise<ClientConfig | null>;
}

const ServerContext = createContext<ServerValue | null>(null);

// Short backoff ladder after a failed check: a restarted host or server
// flips the header chip within seconds instead of at the next 30 s poll.
const RETRY_DELAYS = [2000, 5000];

export function ServerProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const configRef = useRef(config);
  configRef.current = config;
  const retryTimers = useRef<number[]>([]);
  const checkRef = useRef<() => Promise<ClientConfig | null>>(async () => null);
  // A check of our own is already in flight: skip redundant rechecks so one
  // failing episode costs one extra check, not a storm of them.
  const checkingRef = useRef(false);

  const clearRetries = useCallback(() => {
    for (const timer of retryTimers.current) window.clearTimeout(timer);
    retryTimers.current = [];
  }, []);

  const runCheck = useCallback(async (rearm: boolean) => {
    if (rearm) clearRetries();
    checkingRef.current = true;
    try {
      const next = await checkServer();
      setConfig(next);
      return next;
    } catch {
      setConfig((previous) => previous ? { ...previous, check: { ok: false, status: 'unreachable', error: 'The client host did not answer.', checkedAt: new Date().toISOString() } } : previous);
      // Keep the chip honest: retry soon, then leave the regular poll
      // cadence. Retries never re-arm themselves, so a dead server costs two
      // extra checks per episode, not a storm.
      if (rearm) {
        for (const delay of RETRY_DELAYS) {
          retryTimers.current.push(window.setTimeout(() => {
            void runCheck(false);
          }, delay));
        }
      }
      return null;
    } finally {
      checkingRef.current = false;
      setLoading(false);
    }
  }, [clearRetries]);

  const check = useCallback(async () => {
    return runCheck(true);
  }, [runCheck]);
  checkRef.current = check;

  // Any successful API call proves the server answers: recheck at once when
  // the chip currently disagrees, instead of waiting for the next poll.
  useEffect(() => {
    return onServerReachable(() => {
      const current = configRef.current;
      if (!current || !current.check.ok) void checkRef.current();
    });
  }, []);

  // Any failed request proves the server stopped answering: recheck at once
  // when the chip still claims ready, instead of waiting for the next poll.
  // The edge trigger (only while ok) plus the in-flight guard keep one
  // failing episode to a single extra check.
  useEffect(() => {
    return onServerUnreachable(() => {
      if (checkingRef.current) return;
      const current = configRef.current;
      if (current && current.check.ok) void checkRef.current();
    });
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, 30000);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      for (const pending of retryTimers.current) window.clearTimeout(pending);
      retryTimers.current = [];
    };
  }, [check]);

  const value = useMemo(() => ({ config, loading, check }), [config, loading, check]);
  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer() {
  const value = useContext(ServerContext);
  if (!value) throw new Error('useServer must be used inside ServerContext');
  return value;
}
