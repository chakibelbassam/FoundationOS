export type Role = 'owner' | 'member';

export interface Profile {
  id: string;
  name: string;
  username: string;
  role: Role;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Entry {
  name: string;
  type: 'file' | 'folder';
}

export interface FolderEntry extends Entry {
  type: 'folder';
  path: string;
  app?: AppDescriptor | null;
}

export interface FileEntry extends Entry {
  type: 'file';
  path: string;
  size?: number;
}

export type ShelfEntry = FolderEntry | FileEntry;

export interface AppDescriptor {
  name: string;
  brief?: string;
  hasReadme?: boolean;
}

export interface ServerCheck {
  ok: boolean;
  status: 'ready' | 'unreachable' | 'incompatible';
  version?: string;
  schema?: number;
  error?: string;
  checkedAt?: string;
}

export interface ClientConfig {
  clientVersion: string;
  expectedServerVersion: string;
  serverUrl: string;
  setup: 'required' | 'ready';
  check: ServerCheck;
}

export type ThemeChoice = 'system' | 'light' | 'dark';
export type SurfaceChoice = 'solid' | 'glass';
export type DensityChoice = 'comfortable' | 'compact';
export type MotionChoice = 'on' | 'off' | 'system';
export type CursorChoice = 'system' | 'target';

export type BackgroundChoice = 'standard' | 'topography' | 'magic-rings' | 'lightfall' | 'ghost-fibers';

export interface Preferences {
  theme: ThemeChoice;
  surface: SurfaceChoice;
  density: DensityChoice;
  motion: MotionChoice;
  cursor: CursorChoice;
  background: BackgroundChoice;
  projects: string[];
  recentApps: string[];
}

export interface Invitation {
  id: string;
  state: 'pending' | 'used' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface AccountSummary {
  id: string;
  username: string;
  role: Role;
  email: string | null;
  created_at: string;
  closed_at: string | null;
  retained_until: string | null;
}

export interface NewInvitation {
  id: string;
  code: string;
  expiresAt: string;
}

export interface ResetCode {
  id: string;
  code: string;
  expiresAt: string;
}

export type ApiFailure =
  | { kind: 'unauthorized'; message?: string }
  | { kind: 'not-found' }
  | { kind: 'aborted' }
  | { kind: 'offline'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'server'; status: number; message: string };
