import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { bumpGeneration } from '../api/client';
import { SessionProvider, useSession } from './SessionContext';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const ALICE = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'alice',
  username: 'alice',
  role: 'member',
  email: null,
  bio: null,
  avatarUrl: null,
  createdAt: '2026-11-27T00:00:00.000Z',
};

const OWNER = { ...ALICE, id: '22222222-2222-4222-8222-222222222222', name: 'erik', username: 'erik', role: 'owner' };

describe('session provider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    bumpGeneration();
    sessionStorage.clear();
  });

  it('restores a cookie session on mount', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ALICE));
    const hook = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.profile?.name).toBe('alice');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profile');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin');
    hook.unmount();
  });

  it('reports invalid credentials without ending the form', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'Sign in' }));
    const hook = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(hook.result.current.status).toBe('none'));
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'The username or password is not correct.' }));
    let result!: { ok: boolean; error?: string };
    await act(async () => {
      result = await hook.result.current.signIn('alice', 'wrong', true);
    });
    expect(result).toEqual({ ok: false, error: 'The username or password is not correct.' });
    expect(hook.result.current.status).toBe('none');
    hook.unmount();
  });

  it('signs in and keeps the profile in memory', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'Sign in' }));
    const hook = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(hook.result.current.status).toBe('none'));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { profile: ALICE }));
    let result!: { ok: boolean };
    await act(async () => {
      result = await hook.result.current.signIn('alice', 'secret12', true);
    });
    expect(result.ok).toBe(true);
    expect(hook.result.current.status).toBe('ready');
    expect(hook.result.current.profile?.username).toBe('alice');
    hook.unmount();
  });

  it('setup stores the recovery code for the one-time dialog', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'Sign in' }));
    const hook = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(hook.result.current.status).toBe('none'));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { profile: OWNER, recoveryCode: 'ABCD-EFGH-JKLM-NPQR' }));
    let result!: { ok: boolean };
    await act(async () => {
      result = await hook.result.current.setupOwner('CLAIM', 'erik', 'secret12', '');
    });
    expect(result.ok).toBe(true);
    expect(hook.result.current.recoveryCode).toBe('ABCD-EFGH-JKLM-NPQR');
    expect(hook.result.current.profile?.role).toBe('owner');
    hook.unmount();
  });

  it('clears local access when sign-out cannot be confirmed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ALICE));
    const hook = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'Server failure' }));
    let result!: { ok: boolean; warning?: string };
    await act(async () => {
      result = await hook.result.current.signOut();
    });
    expect(result.ok).toBe(true);
    expect(result.warning).toMatch(/could not confirm/i);
    expect(hook.result.current.status).toBe('none');
    expect(hook.result.current.profile).toBeNull();
    hook.unmount();
  });
});
