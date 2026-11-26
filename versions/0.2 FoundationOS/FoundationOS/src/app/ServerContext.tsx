import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { checkServer } from '../api/client';
import type { ClientConfig } from '../api/types';

interface ServerValue {
  config: ClientConfig | null;
  loading: boolean;
  check: () => Promise<ClientConfig | null>;
}

const ServerContext = createContext<ServerValue | null>(null);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const next = await checkServer();
      setConfig(next);
      return next;
    } catch {
      setConfig((previous) => previous ? { ...previous, check: { ok: false, status: 'unreachable', error: 'The client host did not answer.', checkedAt: new Date().toISOString() } } : previous);
      return null;
    } finally {
      setLoading(false);
    }
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
    };
  }, [check]);

  const value = useMemo(() => ({ config, loading, check }), [config, loading, check]);
  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer() {
  const value = useContext(ServerContext);
  if (!value) throw new Error('useServer must be used inside ServerProvider');
  return value;
}
