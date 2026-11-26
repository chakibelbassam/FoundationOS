import type { ApiFailure, ClientConfig, Entry, Preferences, Profile, ServerCheck } from './types';

let sessionToken: string | null = null;
let generation = 0;
const unauthorizedListeners = new Set<() => void>();
const activeControllers = new Set<AbortController>();
const reachListeners = new Set<() => void>();

export function setToken(token: string | null) {
  sessionToken = token;
  generation += 1;
}

export function currentGeneration() {
  return generation;
}

export function abortActiveRequests() {
  for (const controller of activeControllers) {
    try {
      controller.abort();
    } catch {
      /* ignore */
    }
  }
  activeControllers.clear();
}

export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

// Fires after any successful (2xx) API response. The server chip uses it to
// recheck immediately when traffic already proves the server is reachable,
// instead of waiting for the next poll.
export function onServerReachable(listener: () => void) {
  reachListeners.add(listener);
  return () => {
    reachListeners.delete(listener);
  };
}

function notifyReachable() {
  if (reachListeners.size === 0) return;
  for (const listener of reachListeners) {
    try {
      listener();
    } catch {
      /* a listener must never break the request */
    }
  }
}

function notifyUnauthorized() {
  for (const listener of unauthorizedListeners) listener();
}

export class ApiError extends Error {
  failure: ApiFailure;
  constructor(failure: ApiFailure) {
    super(failure.kind === 'server' || failure.kind === 'offline' || failure.kind === 'invalid' ? failure.message : failure.kind);
    this.failure = failure;
  }
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: unknown }).name === 'AbortError')
  );
}

interface RequestOptions {
  signal?: AbortSignal | null;
}

async function request<T>(path: string, init: RequestInit = {}, expect: 'json' | 'text' = 'json', options: RequestOptions = {}): Promise<T> {
  // Capture the token and generation for this request. A 401 only ends the
  // session when it belongs to the still-active token: a late 401 from the
  // previous member's request after a switch must not clear the new session.
  const requestToken = sessionToken;
  const requestGeneration = generation;
  const controller = new AbortController();
  activeControllers.add(controller);
  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const headers = new Headers(init.headers);
  if (requestToken) headers.set('authorization', `Bearer ${requestToken}`);
  headers.set('accept', 'application/json');
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted || isAbortError(error)) {
      throw new ApiError({ kind: 'aborted' });
    }
    throw new ApiError({ kind: 'offline', message: (error as Error).message || 'Server unreachable' });
  } finally {
    activeControllers.delete(controller);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
  if (controller.signal.aborted || options.signal?.aborted) {
    throw new ApiError({ kind: 'aborted' });
  }
  if (response.status === 401) {
    if (requestToken !== null && requestGeneration === generation && requestToken === sessionToken) {
      notifyUnauthorized();
    }
    throw new ApiError({ kind: 'unauthorized' });
  }
  if (response.status === 404) throw new ApiError({ kind: 'not-found' });
  if (response.status === 502) throw new ApiError({ kind: 'offline', message: 'Server unreachable' });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* keep the generic message */
    }
    throw new ApiError({ kind: 'server', status: response.status, message });
  }
  if (expect === 'text') {
    const text = (await response.text()) as T;
    notifyReachable();
    return text;
  }
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('json')) {
    throw new ApiError({ kind: 'invalid', message: 'The server returned an unreadable response.' });
  }
  const payload = (await response.json()) as T;
  notifyReachable();
  return payload;
}

export function filesPath(path: string) {
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (!clean) return '/files';
  return `/files/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

export const api = {
  config: (options?: RequestOptions) => request<ClientConfig>('/client-config', {}, 'json', options),
  profile: (options?: RequestOptions) => request<Profile>('/profile', {}, 'json', options),
  list: (path: string, options?: RequestOptions) => request<Entry[] | { text: string }>(filesPath(path), {}, 'json', options),
  read: (path: string, options?: RequestOptions) => request<{ text: string } | Entry[]>(filesPath(path), {}, 'json', options),
};

export async function checkServer(options?: RequestOptions): Promise<ClientConfig> {
  return request<ClientConfig>('/client-config', {}, 'json', options);
}

export async function getServerCheck(options?: RequestOptions): Promise<ServerCheck> {
  const config = await checkServer(options);
  return config.check;
}

export async function loadPreferences(options?: RequestOptions): Promise<Preferences | null> {
  const result = await request<{ preferences: Preferences | null }>(
    '/preferences/load',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    },
    'json',
    options,
  );
  return result.preferences;
}

export async function savePreferences(preferences: Preferences, options?: RequestOptions): Promise<Preferences> {
  const result = await request<{ preferences: Preferences }>(
    '/preferences/save',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ preferences }),
    },
    'json',
    options,
  );
  return result.preferences;
}
