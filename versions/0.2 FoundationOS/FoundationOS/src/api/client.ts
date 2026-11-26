import type { ApiFailure, ClientConfig, Entry, Preferences, Profile, ServerCheck } from './types';

let sessionToken: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export function setToken(token: string | null) {
  sessionToken = token;
}

export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
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

async function request<T>(path: string, init: RequestInit = {}, expect: 'json' | 'text' = 'json'): Promise<T> {
  const headers = new Headers(init.headers);
  if (sessionToken) headers.set('authorization', `Bearer ${sessionToken}`);
  headers.set('accept', 'application/json');
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers });
  } catch (error) {
    throw new ApiError({ kind: 'offline', message: (error as Error).message || 'Server unreachable' });
  }
  if (response.status === 401) {
    notifyUnauthorized();
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
  if (expect === 'text') return (await response.text()) as T;
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('json')) {
    throw new ApiError({ kind: 'invalid', message: 'The server returned an unreadable response.' });
  }
  return (await response.json()) as T;
}

export function filesPath(path: string) {
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (!clean) return '/files';
  return `/files/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

export const api = {
  config: () => request<ClientConfig>('/client-config'),
  profile: () => request<Profile>('/profile'),
  list: (path: string) => request<Entry[] | { text: string }>(filesPath(path)),
  read: (path: string) => request<{ text: string } | Entry[]>(filesPath(path)),
};

export async function checkServer(): Promise<ClientConfig> {
  return request<ClientConfig>('/client-config');
}

export async function getServerCheck(): Promise<ServerCheck> {
  const config = await checkServer();
  return config.check;
}

export async function loadPreferences(memberId: string): Promise<Preferences | null> {
  const result = await request<{ preferences: Preferences | null }>('/preferences/load', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  return result.preferences;
}

export async function savePreferences(memberId: string, preferences: Preferences): Promise<Preferences> {
  const result = await request<{ preferences: Preferences }>('/preferences/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ memberId, preferences }),
  });
  return result.preferences;
}
