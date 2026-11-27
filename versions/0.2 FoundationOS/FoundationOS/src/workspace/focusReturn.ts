/**
 * The return target is recorded on the *current* history entry before navigating away.
 * When the user returns (Back button, browser Back, even after a reload) the origin view
 * reads it from its own location state, so no event-ordering or unmount race applies.
 */
export function setResumeFocus(path: string) {
  if (typeof window === 'undefined' || !window.history?.state) return;
  const state = window.history.state as { usr?: Record<string, unknown> } & Record<string, unknown>;
  const usr = { ...(state.usr ?? {}), resumeFocus: path };
  window.history.replaceState({ ...state, usr }, '');
}

export function readResumeFocus(state: unknown): string | null {
  const value = (state as { resumeFocus?: unknown } | null)?.resumeFocus;
  return typeof value === 'string' && value ? value : null;
}

export function clearResumeFocus() {
  if (typeof window === 'undefined' || !window.history?.state) return;
  const state = window.history.state as { usr?: Record<string, unknown> } & Record<string, unknown>;
  if (!state.usr?.resumeFocus) return;
  const usr = { ...state.usr };
  delete usr.resumeFocus;
  window.history.replaceState({ ...state, usr }, '');
}

// Attribute-selector escaping with a fallback for environments without
// CSS.escape (jsdom).
export function escapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}
