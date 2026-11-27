import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { setToken } from '../api/client';
import { SessionProvider, useSession } from './SessionContext';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const ALICE = { id: '11111111-1111-4111-8111-111111111111', name: 'alice', role: 'member' } as const;

describe('session connect (Sev-1 copy)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    setToken(null);
    sessionStorage.clear();
  });

  it('reports an invalid or revoked token instead of a superseded connection', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'Sign in' }));
    const hook = renderHook(() => useSession(), { wrapper: SessionProvider });
    let result!: { ok: boolean; error?: string };
    await act(async () => {
      result = await hook.result.current.connect('revoked-or-unknown-token');
    });
    expect(result).toEqual({ ok: false, error: 'That session token is not valid or has been revoked.' });
    expect(hook.result.current.error).toBe('That session token is not valid or has been revoked.');
    expect(hook.result.current.status).toBe('none');
    expect(hook.result.current.profile).toBeNull();
    hook.unmount();
  });

  it('still reports a genuinely superseded attempt as superseded', async () => {
    let rejectFirst!: (error: unknown) => void;
    fetchMock.mockImplementationOnce(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          rejectFirst = reject;
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ALICE));
    const hook = renderHook(() => useSession(), { wrapper: SessionProvider });
    let first!: { ok: boolean; error?: string };
    let second!: { ok: boolean; error?: string };
    await act(async () => {
      const pending = hook.result.current.connect('first-token');
      second = await hook.result.current.connect('second-token');
      first = await pending;
    });
    expect(second.ok).toBe(true);
    expect(first).toEqual({ ok: false, error: 'Superseded by a newer connection.' });
    expect(hook.result.current.profile?.name).toBe('alice');
    expect(rejectFirst).toBeDefined();
    hook.unmount();
  });
});
