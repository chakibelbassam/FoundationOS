import type {
  AccountSummary,
  ApiFailure,
  ClientConfig,
  Entry,
  Invitation,
  NewInvitation,
  Preferences,
  Profile,
  ResetCode,
  ServerCheck,
} from './types';

let generation = 0;
const unauthorizedListeners = new Set<() => void>();
const activeControllers = new Set<AbortController>();
const reachListeners = new Set<() => void>();
const unreachableListeners = new Set<() => void>();

export function bumpGeneration() {
  generation += 1;
  return generation;
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

export function onServerReachable(listener: () => void) {
  reachListeners.add(listener);
  return () => {
    reachListeners.delete(listener);
  };
}

function notifyReachable() {
  for (const listener of reachListeners) {
    try {
      listener();
    } catch {
      /* a listener must never break the request */
    }
  }
}

export function onServerUnreachable(listener: () => void) {
  unreachableListeners.add(listener);
  return () => {
    unreachableListeners.delete(listener);
  };
}

function notifyUnreachable() {
  for (const listener of unreachableListeners) {
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
  notifyUnauthorized?: boolean;
}

async function request<T>(path: string, init: RequestInit = {}, expect: 'json' | 'text' = 'json', options: RequestOptions = {}): Promise<T> {
  const requestGeneration = generation;
  const controller = new AbortController();
  activeControllers.add(controller);
  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers,
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted || isAbortError(error)) {
      throw new ApiError({ kind: 'aborted' });
    }
    notifyUnreachable();
    throw new ApiError({ kind: 'offline', message: (error as Error).message || 'Server unreachable' });
  } finally {
    activeControllers.delete(controller);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
  if (controller.signal.aborted || options.signal?.aborted) {
    throw new ApiError({ kind: 'aborted' });
  }
  if (response.status === 401) {
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* keep the caller's fallback copy */
    }
    if (options.notifyUnauthorized !== false && requestGeneration === generation) {
      notifyUnauthorized();
    }
    throw new ApiError({ kind: 'unauthorized', message });
  }
  if (response.status === 404) throw new ApiError({ kind: 'not-found' });
  if (response.status === 502) {
    notifyUnreachable();
    throw new ApiError({ kind: 'offline', message: 'Server unreachable' });
  }
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
  signIn: (username: string, password: string, remember: boolean) =>
    request<{ profile: Profile }>(
      '/sessions',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password, remember }) },
      'json',
      { notifyUnauthorized: false },
    ),
  setupOwner: (claim: string, username: string, password: string, email: string) =>
    request<{ profile: Profile; recoveryCode: string }>(
      '/setup',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claim, username, password, email: email || null }) },
      'json',
      { notifyUnauthorized: false },
    ),
  join: (code: string, username: string, password: string, email: string) =>
    request<{ profile: Profile }>(
      '/accounts/join',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, username, password, email: email || null }) },
      'json',
      { notifyUnauthorized: false },
    ),
  signOut: () => request<{ signedOut: boolean }>('/sessions/current', { method: 'DELETE' }, 'json', { notifyUnauthorized: false }),
  signOutAll: () =>
    request<{ signedOut: boolean }>(
      '/sessions/sign-out-all',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true }) },
      'json',
      { notifyUnauthorized: false },
    ),
  updateProfile: (changes: { username?: string; email?: string | null; bio?: string | null }) =>
    request<Profile>('/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(changes) }),
  changePassword: (current: string, next: string) =>
    request<{ changed: boolean }>(
      '/profile/password',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ current, next }) },
      'json',
      { notifyUnauthorized: false },
    ),
  closeAccount: (password: string) =>
    request<{ closedAt: string; retainedUntil: string }>(
      '/profile/close',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) },
      'json',
      { notifyUnauthorized: false },
    ),
  uploadAvatar: async (file: File) =>
    request<{ avatarUrl: string }>(
      '/profile/avatar',
      { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: await file.arrayBuffer() },
      'json',
    ),
  removeAvatar: () => request<{ removed: boolean }>('/profile/avatar', { method: 'DELETE' }),
  accounts: () => request<AccountSummary[]>('/accounts'),
  invitations: () => request<Invitation[]>('/invitations'),
  createInvitation: () => request<NewInvitation>('/invitations', { method: 'POST' }),
  revokeInvitation: (id: string) => request<{ revoked: boolean }>(`/invitations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createResetCode: (accountId: string) =>
    request<ResetCode>('/reset-codes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accountId }),
    }),
  recoverOwner: (username: string, code: string, password: string) =>
    request<{ recoveryCode: string }>(
      '/recovery/owner',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, code, password }) },
      'json',
      { notifyUnauthorized: false },
    ),
  resetMember: (code: string, password: string) =>
    request<{ reset: boolean }>(
      '/recovery/member',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, password }) },
      'json',
      { notifyUnauthorized: false },
    ),
};

export async function checkServer(options?: RequestOptions): Promise<ClientConfig> {
  return request<ClientConfig>('/client-config', {}, 'json', options);
}

export async function getServerCheck(options?: RequestOptions): Promise<ServerCheck> {
  const config = await checkServer(options);
  return config.check;
}

export async function loadPreferences(options?: RequestOptions): Promise<Preferences | null> {
  const result = await request<{ preferences: Preferences | null }>('/preferences', { method: 'GET' }, 'json', options);
  return result.preferences;
}

export async function savePreferences(preferences: Preferences, options?: RequestOptions): Promise<Preferences> {
  const result = await request<{ preferences: Preferences }>(
    '/preferences',
    { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ preferences }) },
    'json',
    options,
  );
  return result.preferences;
}
