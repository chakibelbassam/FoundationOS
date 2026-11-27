import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setToken } from './client';
import type { Entry } from './types';

function response(status: number, body: unknown, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    setToken('session-token');
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('reads a folder listing through the /api prefix with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [{ name: 'Weather', type: 'folder' }]));
    const entries = await api.list('Projects/alpha');
    expect(entries).toEqual([{ name: 'Weather', type: 'folder' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/files/Projects/alpha');
    expect((init.headers as Headers).get('authorization')).toBe('Bearer session-token');
  });

  it('encodes path segments but keeps the separator', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [] as Entry[]));
    await api.list('a b/c d');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/files/a%20b/c%20d');
  });

  it('treats 401 as an expired session and notifies listeners', async () => {
    const listener = vi.fn();
    const { onUnauthorized } = await import('./client');
    const unsubscribe = onUnauthorized(listener);
    fetchMock.mockResolvedValueOnce(response(401, { error: 'Sign-in required' }));
    await expect(api.profile()).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('treats 502 as the server being unreachable', async () => {
    fetchMock.mockResolvedValueOnce(response(502, { error: 'Server unreachable' }));
    await expect(api.list('')).rejects.toMatchObject({ failure: { kind: 'offline' } });
  });

  it('rejects a non-JSON success as unreadable', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    await expect(api.list('')).rejects.toMatchObject({ failure: { kind: 'invalid' } });
  });

  it('keeps a silent connect 401 off the global unauthorized channel', async () => {
    const { onUnauthorized } = await import('./client');
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    try {
      fetchMock.mockResolvedValueOnce(response(401, { error: 'Sign in' }));
      await expect(api.profile({ notifyUnauthorized: false })).rejects.toMatchObject({
        failure: { kind: 'unauthorized' },
      });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('ignores a stale 401 after a member switch and handles the active 401 once', async () => {
    const { onUnauthorized, abortActiveRequests } = await import('./client');
    abortActiveRequests();
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    try {
      setToken('token-alice');
      let resolveStale!: (value: Response) => void;
      fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveStale = resolve;
      }));
      const stale = api.profile();
      // The member switches before the first request answers.
      setToken('token-blair');
      resolveStale(response(401, { error: 'Sign in' }));
      await expect(stale).rejects.toMatchObject({ failure: { kind: 'unauthorized' } });
      expect(listener).not.toHaveBeenCalled();

      fetchMock.mockResolvedValueOnce(response(401, { error: 'Sign in' }));
      await expect(api.profile()).rejects.toMatchObject({ failure: { kind: 'unauthorized' } });
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it('aborts in-flight requests on demand without notifying', async () => {
    const { onUnauthorized, abortActiveRequests } = await import('./client');
    abortActiveRequests();
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    try {
      setToken('token-alice');
      fetchMock.mockImplementationOnce(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      );
      const pending = api.list('Projects');
      abortActiveRequests();
      await expect(pending).rejects.toMatchObject({ failure: { kind: 'aborted' } });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('honours a caller AbortSignal for directory and file reads', async () => {
    const { abortActiveRequests } = await import('./client');
    abortActiveRequests();
    setToken('token-alice');
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const pending = api.read('Projects/Weather/README.md', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ failure: { kind: 'aborted' } });
  });

  it('notifies server-reachable listeners on success but not on failure', async () => {
    const { abortActiveRequests, onServerReachable } = await import('./client');
    abortActiveRequests();
    setToken('token-alice');
    const listener = vi.fn();
    const unsubscribe = onServerReachable(listener);
    try {
      fetchMock.mockResolvedValueOnce(response(200, [{ name: 'Weather', type: 'folder' }]));
      await api.list('');
      expect(listener).toHaveBeenCalledTimes(1);
      fetchMock.mockResolvedValueOnce(response(502, { error: 'Server unreachable' }));
      await expect(api.list('')).rejects.toMatchObject({ failure: { kind: 'offline' } });
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it('notifies server-unreachable on offline failures but not on aborts or answers', async () => {
    const { abortActiveRequests, onServerUnreachable } = await import('./client');
    abortActiveRequests();
    setToken('token-alice');
    const listener = vi.fn();
    const unsubscribe = onServerUnreachable(listener);
    try {
      // The network drops: unreachable.
      fetchMock.mockRejectedValueOnce(new Error('connection reset'));
      await expect(api.list('')).rejects.toMatchObject({ failure: { kind: 'offline' } });
      expect(listener).toHaveBeenCalledTimes(1);
      // The host answers for a dead server: unreachable.
      fetchMock.mockResolvedValueOnce(response(502, { error: 'Server unreachable' }));
      await expect(api.list('')).rejects.toMatchObject({ failure: { kind: 'offline' } });
      expect(listener).toHaveBeenCalledTimes(2);
      // A 401 proves the host answered: silent.
      fetchMock.mockResolvedValueOnce(response(401, { error: 'Sign in' }));
      await expect(api.profile()).rejects.toMatchObject({ failure: { kind: 'unauthorized' } });
      expect(listener).toHaveBeenCalledTimes(2);
      // Success proves reachability the other way: silent here.
      fetchMock.mockResolvedValueOnce(response(200, [{ name: 'Weather', type: 'folder' }]));
      await api.list('');
      expect(listener).toHaveBeenCalledTimes(2);
      // Aborting is navigation, not an outage: silent.
      fetchMock.mockImplementationOnce(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      );
      const pending = api.list('Projects');
      abortActiveRequests();
      await expect(pending).rejects.toMatchObject({ failure: { kind: 'aborted' } });
      expect(listener).toHaveBeenCalledTimes(2);
    } finally {
      unsubscribe();
    }
  });
});
