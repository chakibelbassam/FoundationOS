import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Entry } from '../api/types';

export type DirectoryState =
  | { status: 'loading' }
  | { status: 'ready'; entries: Entry[] }
  | { status: 'empty' }
  | { status: 'not-found' }
  | { status: 'offline'; message: string }
  | { status: 'invalid'; message: string };

export function useDirectory(path: string) {
  const [state, setState] = useState<DirectoryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    const ticket = ++requestRef.current;
    const controller = new AbortController();
    setState({ status: 'loading' });
    (async () => {
      try {
        const result = await api.list(path);
        if (ticket !== requestRef.current) return;
        if (Array.isArray(result)) {
          setState(result.length ? { status: 'ready', entries: result } : { status: 'empty' });
        } else {
          setState({ status: 'invalid', message: 'This location is a file, not a folder.' });
        }
      } catch (error) {
        if (ticket !== requestRef.current) return;
        if (error instanceof ApiError) {
          if (error.failure.kind === 'not-found') setState({ status: 'not-found' });
          else if (error.failure.kind === 'offline') setState({ status: 'offline', message: error.failure.message });
          else if (error.failure.kind === 'unauthorized') setState({ status: 'offline', message: 'Session expired' });
          else setState({ status: 'invalid', message: error.message });
        } else {
          setState({ status: 'invalid', message: 'The folder could not be read.' });
        }
      }
    })();
    return () => {
      controller.abort();
    };
  }, [path, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, reload };
}
