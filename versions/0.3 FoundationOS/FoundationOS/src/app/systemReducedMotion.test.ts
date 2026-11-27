import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSystemReducedMotion } from './PreferencesContext';

type Listener = (event: { matches: boolean }) => void;

let matches = false;
let listeners = new Set<Listener>();

function setMatches(value: boolean) {
  matches = value;
  for (const listener of Array.from(listeners)) listener({ matches: value });
}

beforeEach(() => {
  matches = false;
  listeners = new Set();
  vi.stubGlobal('matchMedia', () => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: string, listener: Listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: Listener) => {
      listeners.delete(listener);
    },
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('live Follow-system motion (Sev-3)', () => {
  it('reports the OS setting and updates when it flips mid-session', () => {
    const { result, unmount } = renderHook(() => useSystemReducedMotion());
    expect(result.current).toBe(false);
    act(() => {
      setMatches(true);
    });
    expect(result.current).toBe(true);
    act(() => {
      setMatches(false);
    });
    expect(result.current).toBe(false);
    unmount();
  });

  it('removes the media listener on unmount', () => {
    const { unmount } = renderHook(() => useSystemReducedMotion());
    expect(listeners.size).toBe(1);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
