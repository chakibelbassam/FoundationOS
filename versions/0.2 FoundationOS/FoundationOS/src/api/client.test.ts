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
});
