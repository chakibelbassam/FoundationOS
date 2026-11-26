import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { checkServer } from '../api/client';
import { ServerProvider, useServer } from './ServerContext';

vi.mock('../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../api/client')>();
  return { ...mod, checkServer: vi.fn(), onServerReachable: vi.fn(() => () => {}) };
});

const mockedCheck = vi.mocked(checkServer);

function okConfig() {
  return {
    clientVersion: '0.2',
    expectedServerVersion: '0.1',
    serverUrl: 'http://127.0.0.1:1',
    check: { ok: true as const, status: 'ready' as const, version: '0.1', schema: 2, checkedAt: new Date(0).toISOString() },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  mockedCheck.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('server chip backoff (Sev-3)', () => {
  it('retries a failed check after 2 s and 5 s, then leaves the 30 s poll in charge', async () => {
    mockedCheck.mockRejectedValue(new Error('down'));
    let hook!: { result: { current: ReturnType<typeof useServer> }; unmount: () => void };
    await act(async () => {
      hook = renderHook(() => useServer(), { wrapper: ServerProvider });
    });
    expect(mockedCheck).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(mockedCheck).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockedCheck).toHaveBeenCalledTimes(3);
    // No further backoff retries inside the poll window.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(mockedCheck).toHaveBeenCalledTimes(3);
    // The regular 30 s interval owns the next check (and re-arms its ladder).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mockedCheck).toHaveBeenCalledTimes(4);
    // Unmounting clears every pending timer: nothing fires afterwards.
    hook.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000);
    });
    expect(mockedCheck).toHaveBeenCalledTimes(4);
    expect(hook.result.current.config).toBeNull();
  });

  it('reports ready as soon as a check succeeds', async () => {
    mockedCheck.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(okConfig());
    let hook!: { result: { current: ReturnType<typeof useServer> }; unmount: () => void };
    await act(async () => {
      hook = renderHook(() => useServer(), { wrapper: ServerProvider });
    });
    expect(mockedCheck).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(hook.result.current.config?.check.ok).toBe(true);
    hook.unmount();
  });
});
