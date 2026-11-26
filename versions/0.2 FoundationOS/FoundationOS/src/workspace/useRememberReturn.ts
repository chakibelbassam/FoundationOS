import { useCallback, useEffect, useState } from 'react';
import { rememberReturn, takeReturn } from './focusReturn';

export interface NavigationFrom {
  route: string;
  path: string;
}

export function fromState(state: unknown): NavigationFrom | null {
  return (state as { from?: NavigationFrom } | null)?.from ?? null;
}

/**
 * Remembers the control that opened the current view so the origin can restore focus.
 * The target is set when the user navigates back (button or browser Back) rather than on
 * unmount, which avoids cleanup-ordering races with the origin view's mount effects.
 */
export function useReturnFocus(from: NavigationFrom | null) {
  useEffect(() => {
    if (!from) return;
    const handler = () => rememberReturn(from.route, from.path);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [from]);

  return useCallback(() => {
    if (from) rememberReturn(from.route, from.path);
  }, [from]);
}

/** Reads a pending return target one tick after mount, after any popstate handler has run. */
export function useTakeReturn(route: string, key: string) {
  const [returnPath, setReturnPath] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    setReturnPath(null);
    const timer = window.setTimeout(() => {
      setReturnPath(takeReturn(route));
      setSettled(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [route, key]);
  return { returnPath, settled };
}
