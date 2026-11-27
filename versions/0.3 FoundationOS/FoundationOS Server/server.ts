import { createServer } from 'node:http';
import { createHash, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { existsSync, lstatSync, mkdirSync, realpathSync, rmSync, writeSync } from 'node:fs';
import { mkdir, open, readFile, readdir, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const version = '0.3';
const supported = 3;
const IDLE_DAYS = 30;
const ABSOLUTE_DAYS = 180;
const RETAIN_DAYS = 30;
const RESERVED = new Set([
  'admin', 'owner', 'api', 'status', 'profile', 'files', 'sessions', 'invitations',
  'accounts', 'settings', 'login', 'signup', 'setup', 'recovery', 'preferences',
  'health', 'logout', 'pair', 'join', 'reset', 'avatar',
]);
const USERNAME_RE = /^[a-z][a-z0-9_-]{1,38}$/;
const COOKIE_PREFIX = 'fo_sess_';
const scryptAsync = promisify(scrypt);

const data = path.resolve(process.env.FOUNDATIONOS_DATA || path.join(process.env.LOCALAPPDATA || homedir(), 'FoundationOS', 'store'));
mkdirSync(data, { recursive: true, mode: 0o700 });
const root = realpathSync.native(data);
const dbPath = path.join(root, 'foundationos.sqlite');
const existed = existsSync(dbPath);
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

const schema = `
CREATE TABLE schema_meta(version INTEGER NOT NULL);
CREATE TABLE installation(id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE accounts(
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK(role IN ('owner','member')),
  password_hash TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  avatar_ext TEXT,
  avatar_updated_at TEXT,
  recovery_digest TEXT,
  recovery_issued_at TEXT,
  created_at TEXT NOT NULL,
  closed_at TEXT,
  retained_until TEXT
);
CREATE TABLE sessions(
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_digest TEXT NOT NULL UNIQUE,
  install_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  absolute_expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE TABLE invitations(
  id TEXT PRIMARY KEY,
  code_digest TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  used_by TEXT,
  revoked_at TEXT
);
CREATE TABLE reset_codes(
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code_digest TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT
);
CREATE TABLE setup_claims(
  id TEXT PRIMARY KEY,
  token_digest TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE preferences(
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE paired_clients(
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  paired_at TEXT NOT NULL
);
CREATE TABLE events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  kind TEXT NOT NULL,
  account_id TEXT,
  detail TEXT
);
`;

const hasMeta = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_meta'").get() as { name?: string } | undefined;
let installId = '';
if (hasMeta) {
  const stored = (db.prepare('SELECT version FROM schema_meta LIMIT 1').get() as { version: number } | undefined)?.version;
  if (stored !== supported) {
    const why = stored === undefined ? 'the store has no schema version' : stored < supported
      ? `this store is schema ${stored}; FoundationOS 0.3 only opens a fresh 0.3 store`
      : `this store is schema ${stored}; this server supports schema ${supported}`;
    const message = `FoundationOS ${version} refuses to start: ${why}. Start with a new data folder (set FOUNDATIONOS_DATA) or use the matching FoundationOS version. The existing store was not changed.`;
    try { writeSync(1, JSON.stringify({ event: 'store-refused', message }) + '\n'); } catch { /* ignore */ }
    console.error(message);
    process.exit(1);
  }
  installId = (db.prepare('SELECT id FROM installation LIMIT 1').get() as { id: string }).id;
} else if (existed) {
  const message = `FoundationOS ${version} refuses to start: this database has no 0.3 schema. Start with a new data folder (set FOUNDATIONOS_DATA). The existing store was not changed.`;
  try { writeSync(1, JSON.stringify({ event: 'store-refused', message }) + '\n'); } catch { /* ignore */ }
  console.error(message);
  process.exit(1);
} else {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(schema);
    db.prepare('INSERT INTO schema_meta(version) VALUES (?)').run(supported);
    installId = randomBytes(8).toString('hex');
    db.prepare('INSERT INTO installation(id, created_at) VALUES (?,?)').run(installId, new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
  }
}

const homesPath = path.join(root, 'homes');
const retainedPath = path.join(root, 'retained');
mkdirSync(homesPath, { recursive: true, mode: 0o700 });
mkdirSync(retainedPath, { recursive: true, mode: 0o700 });

const nowMs = () => process.env.FOUNDATIONOS_NOW ? Date.parse(process.env.FOUNDATIONOS_NOW) : Date.now();
const now = () => new Date(nowMs()).toISOString();
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const fresh = (bytes = 32) => randomBytes(bytes).toString('base64url');
const day = 24 * 60 * 60 * 1000;

function reply(res: any, code: number, value: unknown, headers: Record<string, string | string[]> = {}) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}
function log(event: string, detail: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...detail }));
}
function event(kind: string, accountId: string | null, detail: unknown = {}) {
  try {
    db.prepare('INSERT INTO events(at, kind, account_id, detail) VALUES (?,?,?,?)').run(now(), kind, accountId, JSON.stringify(detail));
  } catch { /* events are best effort */ }
}
function refuse(status: number, error: string, headers: Record<string, string> = {}): never {
  throw { status, error, headers };
}
function normalizeUsername(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}
function validUsername(username: string) {
  return USERNAME_RE.test(username) && !RESERVED.has(username);
}
function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}
function validName(name: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(name) && !name.endsWith('.') &&
    !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i.test(name);
}
function isLoopbackHost(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '::1' || /^127\.(\d{1,3}\.){2}\d{1,3}$/.test(h) || /^::ffff:127\.(\d{1,3}\.){2}\d{1,3}$/.test(h);
}
function guardOrigin(req: any) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'http:' || !isLoopbackHost(parsed.hostname)) refuse(403, 'Cross-site request refused');
    } catch { refuse(403, 'Cross-site request refused'); }
  }
  const site = typeof req.headers['sec-fetch-site'] === 'string' ? req.headers['sec-fetch-site'] : '';
  if (site && site !== 'same-origin' && site !== 'none') refuse(403, 'Cross-site request refused');
}

const attempts = new Map<string, { count: number; step: number; until: number; last: number }>();
const LADDER = [60_000, 180_000, 300_000, 900_000];
function limitRemaining(key: string) {
  const entry = attempts.get(key);
  if (!entry) return 0;
  if (nowMs() - entry.last > day) { attempts.delete(key); return 0; }
  return Math.max(0, entry.until - nowMs());
}
function limitFail(key: string) {
  const entry = attempts.get(key) ?? { count: 0, step: 0, until: 0, last: 0 };
  entry.count += 1;
  entry.last = nowMs();
  if (entry.count % 5 === 0) {
    entry.step = Math.min(entry.step + 1, 4);
    entry.until = nowMs() + LADDER[entry.step - 1];
  }
  attempts.set(key, entry);
}
function limitClear(key: string) { attempts.delete(key); }

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }) as Buffer;
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${key.toString('base64url')}`;
}
async function verifyPassword(password: string, stored: string) {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  }) as Buffer;
  return key.length === expected.length && timingSafeEqual(key, expected);
}
function recoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  const bytes = randomBytes(16);
  for (let i = 0; i < 16; i += 1) raw += alphabet[bytes[i] % alphabet.length];
  return raw.match(/.{4}/g)!.join('-');
}
function compactCode(code: string) { return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); }
function sixDigits() { return String(randomInt(0, 1_000_000)).padStart(6, '0'); }

function cookieName() { return `${COOKIE_PREFIX}${installId}`; }
function parseCookies(req: any) {
  const out: Record<string, string> = {};
  const raw = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index > 0) out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}
function cookieToken(req: any) { return parseCookies(req)[cookieName()] ?? null; }
function bearer(req: any) {
  return /^Bearer ([\w-]{43})$/.exec(req.headers.authorization || '')?.[1] ?? null;
}
function setSessionCookie(token: string, remember: boolean, res: any) {
  const maxAge = remember ? `; Max-Age=${IDLE_DAYS * 86400}` : '';
  res.setHeader('Set-Cookie', `${cookieName()}=${token}; HttpOnly; SameSite=Lax; Path=/${maxAge}`);
}
function clearSessionCookie(res: any) {
  res.setHeader('Set-Cookie', `${cookieName()}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

type Account = {
  id: string; username: string; role: string; email: string | null; bio: string | null;
  avatar_ext: string | null; created_at: string; closed_at: string | null;
};
function accountById(id: string) {
  return db.prepare('SELECT id, username, role, email, bio, avatar_ext, created_at, closed_at FROM accounts WHERE id=?').get(id) as Account | undefined;
}
function accountByUsername(username: string) {
  return db.prepare('SELECT id, username, role, email, bio, avatar_ext, created_at, closed_at FROM accounts WHERE username=? COLLATE NOCASE').get(username) as Account | undefined;
}
function publicProfile(account: Account) {
  return {
    id: account.id,
    name: account.username,
    username: account.username,
    role: account.role,
    email: account.email,
    bio: account.bio,
    avatarUrl: account.avatar_ext ? `/api/profile/avatar?v=${encodeURIComponent(account.avatar_ext)}` : null,
    createdAt: account.created_at,
  };
}

function caller(req: any) {
  const token = bearer(req) ?? cookieToken(req);
  if (!token) refuse(401, 'Sign in');
  const row = db.prepare(`
    SELECT s.id AS sid, s.account_id, s.expires_at, s.absolute_expires_at, s.revoked_at,
           a.id, a.username, a.role, a.email, a.bio, a.avatar_ext, a.created_at, a.closed_at
    FROM sessions s JOIN accounts a ON a.id=s.account_id
    WHERE s.token_digest=?
  `).get(digest(token)) as any;
  if (!row) refuse(401, 'Invalid or expired session');
  if (row.revoked_at) refuse(401, 'Invalid or expired session');
  if (row.closed_at) refuse(401, 'Invalid or expired session');
  const at = nowMs();
  if (at >= Date.parse(row.expires_at) || at >= Date.parse(row.absolute_expires_at)) {
    db.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').run(now(), row.sid);
    refuse(401, 'Invalid or expired session');
  }
  const nextIdle = Math.min(at + IDLE_DAYS * day, Date.parse(row.absolute_expires_at));
  db.prepare('UPDATE sessions SET last_seen_at=?, expires_at=? WHERE id=?').run(now(), new Date(nextIdle).toISOString(), row.sid);
  return { sid: row.sid, account: {
    id: row.id, username: row.username, role: row.role, email: row.email, bio: row.bio,
    avatar_ext: row.avatar_ext, created_at: row.created_at, closed_at: row.closed_at,
  } as Account };
}
function requireOwner(req: any) {
  const who = caller(req);
  if (who.account.role !== 'owner') refuse(403, 'Only the owner can do that');
  return who;
}
function createSession(accountId: string, remember: boolean) {
  const id = randomUUID();
  const token = fresh();
  const at = nowMs();
  const idle = remember ? IDLE_DAYS * day : day;
  const absolute = remember ? ABSOLUTE_DAYS * day : day;
  db.prepare(`INSERT INTO sessions(id, account_id, token_digest, install_id, created_at, last_seen_at, expires_at, absolute_expires_at, revoked_at)
    VALUES (?,?,?,?,?,?,?,?,NULL)`).run(
    id, accountId, digest(token), installId, now(),
    new Date(at).toISOString(), new Date(at + idle).toISOString(), new Date(at + absolute).toISOString(),
  );
  return token;
}
function revokeAll(accountId: string) {
  db.prepare('UPDATE sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL').run(now(), accountId);
}
function homeDir(id: string) { return path.join(homesPath, id); }
function filesOf(id: string) {
  mustDir(homesPath);
  mustDir(homeDir(id));
  const folder = path.join(homeDir(id), 'files');
  mustDir(folder);
  return folder;
}
function mustDir(p: string) {
  const info = lstatSync(p);
  if (!info.isDirectory() || realpathSync.native(p) !== p) refuse(404, 'Unknown path');
}
function regularFile(p: string, info = lstatSync(p)) {
  return info.isFile() && info.nlink === 1 && realpathSync.native(p) === p;
}
function realDir(p: string, info = lstatSync(p)) {
  return info.isDirectory() && realpathSync.native(p) === p;
}
function createHome(id: string) {
  const home = homeDir(id);
  try {
    mkdirSync(home, { mode: 0o700 });
    mkdirSync(path.join(home, 'files'), { mode: 0o700 });
  } catch (error) {
    try { rmSync(home, { recursive: true, force: true }); } catch { /* best effort */ }
    throw error;
  }
}

async function rawBody(req: any, limit: number, message: string) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += (chunk as Buffer).length;
    if (bytes > limit) refuse(413, message);
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
async function jsonBody(req: any, limit = 8192): Promise<any> {
  let text: string;
  try {
    text = (await rawBody(req, limit, 'Request is too large')).toString('utf8');
  } catch (error) {
    if ((error as { status?: number }).status === 413) throw error;
    refuse(400, 'Request must be UTF-8 JSON');
  }
  try { return text ? JSON.parse(text) : {}; } catch { refuse(400, 'Request must be JSON'); }
}
function segments(text: string): string[] | null {
  let decoded: string;
  try { decoded = decodeURIComponent(text); } catch { return null; }
  if (decoded === '') return [];
  const parts = decoded.split('/');
  if (parts.length > 16 || parts.join('/').length > 240 || !parts.every(validName)) return null;
  return parts;
}
function locate(folder: string, parts: string[]) {
  let current = folder;
  for (const [i, part] of parts.entries()) {
    const next = path.join(current, part);
    if (path.relative(folder, next).startsWith('..')) refuse(404, 'Unknown path');
    if (existsSync(next)) {
      const info = lstatSync(next);
      if (info.isFile()) { if (!regularFile(next, info)) refuse(404, 'Unknown path'); }
      else if (info.isDirectory()) { if (!realDir(next, info)) refuse(404, 'Unknown path'); }
      else refuse(404, 'Unknown path');
      if (i < parts.length - 1 && !info.isDirectory()) refuse(404, 'Unknown path');
    } else if (i < parts.length - 1) refuse(404, 'Unknown path');
    current = next;
  }
  return current;
}
async function listing(target: string) {
  mustDir(target);
  const entries = await readdir(target, { withFileTypes: true });
  const out: { name: string; type: string }[] = [];
  for (const entry of entries) {
    if (!validName(entry.name)) continue;
    const full = path.join(target, entry.name);
    try {
      const info = lstatSync(full);
      if (regularFile(full, info)) out.push({ name: entry.name, type: 'file' });
      else if (realDir(full, info)) out.push({ name: entry.name, type: 'folder' });
    } catch { /* vanished */ }
  }
  out.sort((a, b) => (a.name < b.name ? -1 : 1));
  return out;
}

const PREFERENCE_SETS: Record<string, string[]> = {
  theme: ['system', 'light', 'dark'],
  surface: ['solid', 'glass'],
  density: ['comfortable', 'compact'],
  motion: ['on', 'off', 'system', 'follow system'],
  cursor: ['system', 'target'],
  background: ['standard', 'topography', 'magic-rings', 'lightfall', 'ghost-fibers'],
};
const PATH_KEYS = ['projects', 'recentApps'];
function isMemberPath(value: unknown) {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 200) return false;
  if (value.startsWith('/') || value.endsWith('/') || value.includes('\\')) return false;
  if (/(^|\/)\.\.(\/|$)/.test(value)) return false;
  if (/[\0-\x1f\x7f]/.test(value)) return false;
  return value.split('/').every(part => part.trim().length > 0);
}
function checkPreferences(preferences: any) {
  if (typeof preferences !== 'object' || preferences === null || Array.isArray(preferences)) return 'preferences must be an object';
  for (const [key, value] of Object.entries(preferences)) {
    if (PATH_KEYS.includes(key)) {
      if (!Array.isArray(value) || value.length > 8 || !value.every(isMemberPath)) return `Invalid value for "${key}"`;
      continue;
    }
    const allowed = PREFERENCE_SETS[key];
    if (!allowed) return `Unknown preference "${key}"`;
    if (typeof value !== 'string' || !allowed.includes(value.toLowerCase())) return `Invalid value for "${key}"`;
  }
  return null;
}

function pngSize(buffer: Buffer) {
  if (buffer.length < 24) return null;
  if (!buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
function jpegSize(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buffer.length) {
    if (buffer[i] !== 0xff) { i += 1; continue; }
    const marker = buffer[i + 1];
    if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; }
    const length = buffer.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}
function imageInfo(buffer: Buffer) {
  const png = pngSize(buffer);
  if (png) return { ext: 'png', ...png };
  const jpeg = jpegSize(buffer);
  if (jpeg) return { ext: 'jpg', ...jpeg };
  return null;
}

async function handle(req: any, res: any) {
  const route = (req.url || '/').split('?')[0];
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') guardOrigin(req);
  try {
    if (route === '/status') {
      if (method !== 'GET') refuse(405, 'Use GET');
      const owner = db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE role='owner' AND closed_at IS NULL").get() as { n: number };
      return reply(res, 200, { version, status: 'ready', schema: supported, setup: owner.n === 0 ? 'required' : 'ready' });
    }
    if (route === '/pair') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const input = await jsonBody(req);
      if (typeof input.url !== 'string' || !/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(input.url)) refuse(400, 'Give a loopback client URL');
      db.prepare('INSERT INTO paired_clients(id, url, paired_at) VALUES (?,?,?)').run(randomUUID(), input.url, now());
      return reply(res, 200, { paired: true });
    }

    if (route === '/setup') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const input = await jsonBody(req);
      const owner = db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE role='owner'").get() as { n: number };
      if (owner.n > 0) refuse(409, 'This installation already has an owner. Sign in instead.');
      const username = normalizeUsername(input.username);
      if (!validUsername(username)) refuse(400, 'Use a lowercase username of 2 to 39 characters. Some names are reserved.');
      if (typeof input.password !== 'string' || input.password.length < 6) refuse(400, 'Use a password of at least 6 characters.');
      // Setup tokens are base64url and case-sensitive; do not normalise them like a typed code.
      const claim = String(input.claim ?? '').trim();
      const row = db.prepare('SELECT id, expires_at, used_at FROM setup_claims WHERE token_digest=?').get(digest(claim)) as { id: string; expires_at: string; used_at: string | null } | undefined;
      if (!row || row.used_at || Date.parse(row.expires_at) <= nowMs()) refuse(401, 'That setup link is no longer valid. Open FoundationOS from the server console again.');
      const email = input.email ? String(input.email).trim() : null;
      if (email && !validEmail(email)) refuse(400, 'Enter a valid email address or leave it empty.');
      const id = randomUUID();
      const passwordHash = await hashPassword(input.password);
      const code = recoveryCode();
      try { createHome(id); } catch { refuse(500, 'The private Home could not be created.'); }
      try {
        db.exec('BEGIN IMMEDIATE');
        db.prepare('INSERT INTO accounts(id, username, role, password_hash, email, created_at, recovery_digest, recovery_issued_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(id, username, 'owner', passwordHash, email, now(), digest(compactCode(code)), now());
        const claimed = db.prepare('UPDATE setup_claims SET used_at=? WHERE id=? AND used_at IS NULL').run(now(), row.id);
        if (claimed.changes !== 1) refuse(409, 'That setup link was already used.');
        db.exec('COMMIT');
      } catch (error) {
        if (db.isTransaction) db.exec('ROLLBACK');
        try { rmSync(homeDir(id), { recursive: true, force: true }); } catch { /* ignore */ }
        if (/UNIQUE constraint failed/i.test((error as Error).message || '')) refuse(409, 'That username is already taken.');
        throw error;
      }
      const token = createSession(id, true);
      setSessionCookie(token, true, res);
      const account = accountById(id)!;
      event('owner-created', id, { username });
      return reply(res, 200, { profile: publicProfile(account), recoveryCode: code });
    }

    if (route === '/sessions') {
      if (method !== 'POST') refuse(405, 'Use POST to sign in');
      const input = await jsonBody(req);
      const username = normalizeUsername(input.username);
      const key = `login:${username}`;
      const wait = limitRemaining(key);
      if (wait > 0) return reply(res, 429, { error: 'Too many attempts. Try again later.' }, { 'Retry-After': String(Math.ceil(wait / 1000)) });
      const account = accountByUsername(username);
      const ok = account && !account.closed_at && typeof input.password === 'string'
        ? await verifyPassword(input.password, (db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(account.id) as { password_hash: string }).password_hash)
        : false;
      if (!account || !ok) {
        limitFail(key);
        event('sign-in-failed', account?.id ?? null, { username });
        refuse(401, 'The username or password is not correct.');
      }
      limitClear(key);
      const remember = input.remember !== false;
      const token = createSession(account.id, remember);
      setSessionCookie(token, remember, res);
      event('sign-in', account.id, { username });
      return reply(res, 200, { profile: publicProfile(account) });
    }

    if (route === '/sessions/current') {
      if (method !== 'DELETE') refuse(405, 'Use DELETE');
      const who = caller(req);
      db.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').run(now(), who.sid);
      clearSessionCookie(res);
      event('sign-out', who.account.id, { session: who.sid });
      return reply(res, 200, { signedOut: true });
    }

    if (route === '/sessions/sign-out-all') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const who = caller(req);
      const input = await jsonBody(req);
      if (input.confirm !== true) refuse(400, 'Confirm that every session for this account should end.');
      revokeAll(who.account.id);
      clearSessionCookie(res);
      event('sign-out-all', who.account.id, {});
      return reply(res, 200, { signedOut: true });
    }

    if (route === '/profile') {
      if (method === 'GET') {
        const who = caller(req);
        return reply(res, 200, publicProfile(who.account));
      }
      if (method !== 'PATCH') refuse(405, 'Use GET or PATCH');
      const who = caller(req);
      const input = await jsonBody(req);
      const changes: string[] = [];
      const values: any[] = [];
      if (input.username !== undefined) {
        const username = normalizeUsername(input.username);
        if (!validUsername(username)) refuse(400, 'Use a lowercase username of 2 to 39 characters. Some names are reserved.');
        changes.push('username=?'); values.push(username);
      }
      if (input.email !== undefined) {
        const email = input.email === null || input.email === '' ? null : String(input.email).trim();
        if (email && !validEmail(email)) refuse(400, 'Enter a valid email address or leave it empty.');
        changes.push('email=?'); values.push(email);
      }
      if (input.bio !== undefined) {
        const bio = input.bio === null || input.bio === '' ? null : String(input.bio);
        if (bio && bio.length > 500) refuse(400, 'Keep the introduction to 500 characters or fewer.');
        changes.push('bio=?'); values.push(bio);
      }
      if (!changes.length) refuse(400, 'Give a username, email or introduction to change.');
      try {
        db.prepare(`UPDATE accounts SET ${changes.join(', ')} WHERE id=?`).run(...values, who.account.id);
      } catch (error) {
        if (/UNIQUE constraint failed/i.test((error as Error).message || '')) refuse(409, 'That username is already taken.');
        throw error;
      }
      const account = accountById(who.account.id)!;
      event('profile-updated', account.id, { fields: changes.length });
      return reply(res, 200, publicProfile(account));
    }

    if (route === '/preferences') {
      const who = caller(req);
      if (method === 'GET') {
        const row = db.prepare('SELECT json, updated_at FROM preferences WHERE account_id=?').get(who.account.id) as { json: string; updated_at: string } | undefined;
        return reply(res, 200, { accountId: who.account.id, preferences: row ? JSON.parse(row.json) : null, updatedAt: row?.updated_at ?? null });
      }
      if (method !== 'PUT') refuse(405, 'Use GET or PUT');
      const input = await jsonBody(req, 65536);
      const problem = checkPreferences(input.preferences);
      if (problem) refuse(400, problem);
      db.prepare(`INSERT INTO preferences(account_id, json, updated_at) VALUES (?,?,?)
        ON CONFLICT(account_id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at`)
        .run(who.account.id, JSON.stringify(input.preferences), now());
      return reply(res, 200, { accountId: who.account.id, preferences: input.preferences, updatedAt: now() });
    }

    if (route === '/accounts') {
      const who = requireOwner(req);
      if (method !== 'GET') refuse(405, 'Use GET');
      const rows = db.prepare('SELECT id, username, role, email, created_at, closed_at, retained_until FROM accounts ORDER BY username').all();
      return reply(res, 200, rows);
    }

    if (route === '/invitations') {
      const who = requireOwner(req);
      if (method === 'GET') {
        const rows = db.prepare('SELECT id, created_at, expires_at, used_at, revoked_at FROM invitations ORDER BY created_at DESC LIMIT 50').all() as any[];
        return reply(res, 200, rows.map(row => ({
          id: row.id,
          state: row.revoked_at ? 'revoked' : row.used_at ? 'used' : Date.parse(row.expires_at) <= nowMs() ? 'expired' : 'pending',
          createdAt: row.created_at, expiresAt: row.expires_at, usedAt: row.used_at,
        })));
      }
      if (method !== 'POST') refuse(405, 'Use GET or POST');
      let code = sixDigits();
      for (let i = 0; i < 20; i += 1) {
        if (!db.prepare('SELECT 1 FROM invitations WHERE code_digest=?').get(digest(code))) break;
        code = sixDigits();
      }
      const id = randomUUID();
      const expires = new Date(nowMs() + day).toISOString();
      db.prepare('INSERT INTO invitations(id, code_digest, created_by, created_at, expires_at) VALUES (?,?,?,?,?)')
        .run(id, digest(code), who.account.id, now(), expires);
      event('invitation-created', who.account.id, { invitation: id });
      return reply(res, 200, { id, code, expiresAt: expires });
    }

    if (route.startsWith('/invitations/')) {
      const who = requireOwner(req);
      if (method !== 'DELETE') refuse(405, 'Use DELETE');
      const id = route.slice('/invitations/'.length);
      const row = db.prepare('SELECT id, used_at, revoked_at FROM invitations WHERE id=?').get(id) as any;
      if (!row || row.used_at || row.revoked_at) refuse(404, 'Unknown invitation');
      db.prepare('UPDATE invitations SET revoked_at=? WHERE id=?').run(now(), id);
      return reply(res, 200, { revoked: true });
    }

    if (route === '/accounts/join') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const key = `join:${req.socket.remoteAddress ?? 'local'}`;
      const wait = limitRemaining(key);
      if (wait > 0) return reply(res, 429, { error: 'Too many attempts. Try again later.' }, { 'Retry-After': String(Math.ceil(wait / 1000)) });
      const input = await jsonBody(req);
      const code = compactCode(String(input.code ?? ''));
      const invitation = db.prepare('SELECT id, expires_at, used_at, revoked_at FROM invitations WHERE code_digest=?').get(digest(code)) as any;
      if (!invitation || invitation.used_at || invitation.revoked_at || Date.parse(invitation.expires_at) <= nowMs()) {
        limitFail(key);
        refuse(401, 'That invitation is not valid. Ask the owner for a new one.');
      }
      const username = normalizeUsername(input.username);
      if (!validUsername(username)) refuse(400, 'Use a lowercase username of 2 to 39 characters. Some names are reserved.');
      if (typeof input.password !== 'string' || input.password.length < 6) refuse(400, 'Use a password of at least 6 characters.');
      const email = input.email ? String(input.email).trim() : null;
      if (email && !validEmail(email)) refuse(400, 'Enter a valid email address or leave it empty.');
      const id = randomUUID();
      const passwordHash = await hashPassword(input.password);
      try { createHome(id); } catch { refuse(500, 'The private Home could not be created.'); }
      try {
        db.exec('BEGIN IMMEDIATE');
        db.prepare('INSERT INTO accounts(id, username, role, password_hash, email, created_at) VALUES (?,?,?,?,?,?)')
          .run(id, username, 'member', passwordHash, email, now());
        const claimed = db.prepare('UPDATE invitations SET used_at=?, used_by=? WHERE id=? AND used_at IS NULL AND revoked_at IS NULL').run(now(), id, invitation.id);
        if (claimed.changes !== 1) refuse(409, 'That invitation was already used.');
        db.exec('COMMIT');
      } catch (error) {
        if (db.isTransaction) db.exec('ROLLBACK');
        try { rmSync(homeDir(id), { recursive: true, force: true }); } catch { /* ignore */ }
        if (/UNIQUE constraint failed/i.test((error as Error).message || '')) {
          limitFail(key);
          refuse(409, 'That username is already taken. Choose another.');
        }
        throw error;
      }
      limitClear(key);
      const token = createSession(id, true);
      setSessionCookie(token, true, res);
      const account = accountById(id)!;
      event('member-created', id, { username });
      return reply(res, 200, { profile: publicProfile(account) });
    }

    if (route === '/reset-codes') {
      const who = requireOwner(req);
      if (method !== 'POST') refuse(405, 'Use POST');
      const input = await jsonBody(req);
      const target = db.prepare('SELECT id, role, closed_at FROM accounts WHERE id=?').get(String(input.accountId ?? '')) as any;
      if (!target || target.closed_at) refuse(404, 'Unknown account');
      if (target.role === 'owner') refuse(400, 'Use owner recovery for the owner account.');
      let code = sixDigits();
      for (let i = 0; i < 20; i += 1) {
        if (!db.prepare('SELECT 1 FROM reset_codes WHERE code_digest=?').get(digest(code))) break;
        code = sixDigits();
      }
      const id = randomUUID();
      const expires = new Date(nowMs() + 30 * 60 * 1000).toISOString();
      db.prepare('INSERT INTO reset_codes(id, account_id, code_digest, created_by, created_at, expires_at) VALUES (?,?,?,?,?,?)')
        .run(id, target.id, digest(code), who.account.id, now(), expires);
      db.prepare('UPDATE reset_codes SET revoked_at=? WHERE account_id=? AND id<>? AND revoked_at IS NULL').run(now(), target.id, id);
      event('reset-code-created', who.account.id, { account: target.id });
      return reply(res, 200, { id, code, expiresAt: expires });
    }

    if (route === '/recovery/owner') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const input = await jsonBody(req);
      const username = normalizeUsername(input.username);
      const key = `recovery:${username}`;
      const wait = limitRemaining(key);
      if (wait > 0) return reply(res, 429, { error: 'Too many attempts. Try again later.' }, { 'Retry-After': String(Math.ceil(wait / 1000)) });
      const account = accountByUsername(username);
      const row = account ? db.prepare('SELECT recovery_digest, closed_at FROM accounts WHERE id=?').get(account.id) as any : null;
      const code = compactCode(String(input.code ?? ''));
      const ok = row && !row.closed_at && row.recovery_digest && digest(code) === row.recovery_digest;
      if (!ok) {
        limitFail(key);
        refuse(401, 'The username or recovery code is not correct.');
      }
      if (typeof input.password !== 'string' || input.password.length < 6) refuse(400, 'Use a password of at least 6 characters.');
      const passwordHash = await hashPassword(input.password);
      const nextCode = recoveryCode();
      db.prepare('UPDATE accounts SET password_hash=?, recovery_digest=?, recovery_issued_at=? WHERE id=?')
        .run(passwordHash, digest(compactCode(nextCode)), now(), account!.id);
      revokeAll(account!.id);
      event('owner-recovered', account!.id, {});
      return reply(res, 200, { recoveryCode: nextCode });
    }

    if (route === '/recovery/member') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const input = await jsonBody(req);
      const key = `member-reset:${req.socket.remoteAddress ?? 'local'}`;
      const wait = limitRemaining(key);
      if (wait > 0) return reply(res, 429, { error: 'Too many attempts. Try again later.' }, { 'Retry-After': String(Math.ceil(wait / 1000)) });
      const code = compactCode(String(input.code ?? ''));
      const row = db.prepare('SELECT id, account_id, expires_at, used_at, revoked_at FROM reset_codes WHERE code_digest=?').get(digest(code)) as any;
      if (!row || row.used_at || row.revoked_at || Date.parse(row.expires_at) <= nowMs()) {
        limitFail(key);
        refuse(401, 'That reset code is not valid. Ask the owner for a new one.');
      }
      if (typeof input.password !== 'string' || input.password.length < 6) refuse(400, 'Use a password of at least 6 characters.');
      const passwordHash = await hashPassword(input.password);
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(passwordHash, row.account_id);
        db.prepare('UPDATE reset_codes SET used_at=? WHERE id=?').run(now(), row.id);
        revokeAll(row.account_id);
        db.exec('COMMIT');
      } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
      limitClear(key);
      event('member-recovered', row.account_id, {});
      return reply(res, 200, { reset: true });
    }

    if (route === '/profile/password') {
      const who = caller(req);
      if (method !== 'POST') refuse(405, 'Use POST');
      const input = await jsonBody(req);
      const hash = (db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(who.account.id) as { password_hash: string }).password_hash;
      if (typeof input.current !== 'string' || !(await verifyPassword(input.current, hash))) refuse(401, 'The current password is not correct.');
      if (typeof input.next !== 'string' || input.next.length < 6) refuse(400, 'Use a password of at least 6 characters.');
      const nextHash = await hashPassword(input.next);
      db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(nextHash, who.account.id);
      revokeAll(who.account.id);
      clearSessionCookie(res);
      event('password-changed', who.account.id, {});
      return reply(res, 200, { changed: true });
    }

    if (route === '/profile/avatar') {
      const who = caller(req);
      if (method === 'GET') {
        if (!who.account.avatar_ext) refuse(404, 'No picture');
        const file = path.join(homeDir(who.account.id), `avatar.${who.account.avatar_ext}`);
        const body = await readFile(file);
        res.writeHead(200, {
          'Content-Type': who.account.avatar_ext === 'png' ? 'image/png' : 'image/jpeg',
          'Content-Length': body.length,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        return res.end(body);
      }
      if (method === 'DELETE') {
        if (who.account.avatar_ext) {
          await rm(path.join(homeDir(who.account.id), `avatar.${who.account.avatar_ext}`), { force: true });
          db.prepare('UPDATE accounts SET avatar_ext=NULL, avatar_updated_at=NULL WHERE id=?').run(who.account.id);
        }
        return reply(res, 200, { removed: true });
      }
      if (method !== 'POST') refuse(405, 'Use GET, POST or DELETE');
      const body = await rawBody(req, 2 * 1024 * 1024, 'Pictures must be 2 MB or smaller');
      const info = imageInfo(body);
      if (!info) refuse(400, 'Choose a PNG or JPEG picture.');
      if (info.width < 1 || info.height < 1 || info.width > 4096 || info.height > 4096) refuse(400, 'Pictures must be 4096 pixels or smaller on each side.');
      const file = path.join(homeDir(who.account.id), `avatar.${info.ext}`);
      await writeFile(file, body, { mode: 0o600 });
      if (who.account.avatar_ext && who.account.avatar_ext !== info.ext) {
        await rm(path.join(homeDir(who.account.id), `avatar.${who.account.avatar_ext}`), { force: true });
      }
      db.prepare('UPDATE accounts SET avatar_ext=?, avatar_updated_at=? WHERE id=?').run(info.ext, now(), who.account.id);
      event('avatar-updated', who.account.id, { ext: info.ext });
      return reply(res, 200, { avatarUrl: `/api/profile/avatar?v=${Date.now()}` });
    }

    if (route === '/profile/close') {
      const who = caller(req);
      if (method !== 'POST') refuse(405, 'Use POST');
      if (who.account.role === 'owner') refuse(400, 'The owner account cannot be deleted. Transfer ownership first.');
      const input = await jsonBody(req);
      const hash = (db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(who.account.id) as { password_hash: string }).password_hash;
      if (typeof input.password !== 'string' || !(await verifyPassword(input.password, hash))) refuse(401, 'The password is not correct.');
      const closedAt = now();
      const retainUntil = new Date(nowMs() + RETAIN_DAYS * day).toISOString();
      const from = homeDir(who.account.id);
      const to = path.join(retainedPath, who.account.id);
      try { await mkdir(retainedPath, { recursive: true, mode: 0o700 }); await rename(from, to); }
      catch { refuse(500, 'The private Home could not be taken offline.'); }
      try {
        db.exec('BEGIN IMMEDIATE');
        db.prepare('UPDATE accounts SET closed_at=?, retained_until=?, recovery_digest=NULL WHERE id=?').run(closedAt, retainUntil, who.account.id);
        db.prepare('UPDATE reset_codes SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL').run(closedAt, who.account.id);
        revokeAll(who.account.id);
        db.exec('COMMIT');
      } catch (error) {
        if (db.isTransaction) db.exec('ROLLBACK');
        try { await rename(to, from); } catch { /* ignore */ }
        throw error;
      }
      clearSessionCookie(res);
      event('account-closed', who.account.id, { retainedUntil: retainUntil });
      return reply(res, 200, { closedAt, retainedUntil: retainUntil });
    }

    if (route === '/folder') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const who = caller(req);
      const input = await jsonBody(req);
      if (typeof input.path !== 'string') refuse(400, 'Give a folder path');
      const parts = segments(input.path);
      if (!parts || !parts.length) refuse(400, 'Give a valid folder path');
      const folder = filesOf(who.account.id);
      const target = locate(folder, parts);
      if (existsSync(target)) refuse(409, 'Already exists');
      try { await mkdir(target, { mode: 0o700 }); } catch { refuse(404, 'Unknown path'); }
      event('folder', who.account.id, { path: parts.join('/') });
      return reply(res, 200, { path: parts.join('/') });
    }

    if (route === '/files' || route.startsWith('/files/')) {
      if (route === '/files' && method !== 'GET') refuse(405, 'Use GET to list or address a file path');
      const parts = route === '/files' ? [] as string[] : segments(route.slice(7));
      if (parts === null) refuse(404, 'Unknown path');
      const who = caller(req);
      const folder = filesOf(who.account.id);
      const target = locate(folder, parts);
      const rel = parts.join('/');
      if (method === 'GET') {
        if (!existsSync(target)) refuse(404, 'Unknown path');
        const info = lstatSync(target);
        if (info.isFile()) {
          if (!regularFile(target, info)) refuse(404, 'Unknown path');
          return reply(res, 200, { text: await readFile(target, 'utf8') });
        }
        return reply(res, 200, await listing(target));
      }
      if (method === 'PUT') {
        if (!parts.length) refuse(405, 'Use a file path');
        if (existsSync(target)) {
          const info = lstatSync(target);
          if (info.isDirectory()) refuse(409, 'A folder exists at that path');
          if (!regularFile(target, info)) refuse(404, 'Unknown path');
        }
        const raw = await rawBody(req, 65536, 'Text file exceeds 64 KiB');
        let text: string;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(raw); } catch { refuse(400, 'Text must be UTF-8'); }
        const temp = path.join(path.dirname(target), '.' + randomUUID() + '.tmp');
        const fd = await open(temp, 'wx', 0o600);
        try {
          try { await fd.writeFile(text); } finally { await fd.close(); }
          await rename(temp, target);
        } finally { await rm(temp, { force: true }); }
        event('write', who.account.id, { path: rel });
        return reply(res, 200, { path: rel });
      }
      if (method === 'DELETE') {
        if (!parts.length) refuse(405, 'Use a file path');
        if (!existsSync(target)) refuse(404, 'Unknown path');
        const info = lstatSync(target);
        if (info.isFile()) {
          if (!regularFile(target, info)) refuse(404, 'Unknown path');
          await rm(target);
        } else if (info.isDirectory()) {
          if (!realDir(target, info)) refuse(404, 'Unknown path');
          try { await rmdir(target); } catch (error) {
            const code = (error as NodeJS.ErrnoException)?.code;
            if (code === 'ENOTEMPTY' || code === 'EEXIST') refuse(409, 'Folder is not empty');
            refuse(404, 'Unknown path');
          }
        } else refuse(404, 'Unknown path');
        event('delete', who.account.id, { path: rel });
        return reply(res, 200, { path: rel });
      }
      refuse(405, 'Use GET, PUT or DELETE');
    }

    refuse(404, 'Unknown route');
  } catch (error) {
    if (error && typeof (error as { status?: unknown }).status === 'number') {
      const { status, error: message, headers } = error as { status: number; error: string; headers?: Record<string, string> };
      log('refusal', { route, status, error: message });
      return reply(res, status, { error: message }, headers ?? {});
    }
    console.error(error);
    log('refusal', { route, status: 404, error: 'Workspace unavailable' });
    return reply(res, 404, { error: 'Workspace unavailable' });
  }
}

function purgeExpired() {
  const rows = db.prepare('SELECT id, username, retained_until FROM accounts WHERE closed_at IS NOT NULL AND retained_until IS NOT NULL AND retained_until <= ?').all(now()) as any[];
  for (const row of rows) {
    try { rmSync(path.join(retainedPath, row.id), { recursive: true, force: true }); } catch { /* ignore */ }
    db.prepare('DELETE FROM preferences WHERE account_id=?').run(row.id);
    db.prepare('DELETE FROM reset_codes WHERE account_id=?').run(row.id);
    db.prepare('DELETE FROM sessions WHERE account_id=?').run(row.id);
    db.prepare('DELETE FROM invitations WHERE used_by=?').run(row.id);
    db.prepare('DELETE FROM accounts WHERE id=?').run(row.id);
    event('account-purged', null, { account: row.id });
  }
  return rows.length;
}

const server = createServer((req, res) => {
  handle(req, res).catch(() => {
    try { reply(res, 404, { error: 'Workspace unavailable' }); } catch { /* closed */ }
  });
});

let hostChild: any = null;
let urls: { server: string; client: string | null } = { server: '', client: null };

function openBrowser(url: string) {
  if (process.env.FOUNDATIONOS_NO_OPEN === '1') return;
  try {
    const child = spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch { /* best effort */ }
}

function startClient(claim?: string) {
  if (hostChild) return hostChild;
  const hostPath = path.join(import.meta.dirname, '..', 'FoundationOS', 'host', 'serve.mjs');
  if (!existsSync(hostPath)) {
    console.error(`Client host not found at ${hostPath}`);
    return null;
  }
  const clientData = process.env.FOUNDATIONOS_CLIENT_DATA || path.join(process.env.LOCALAPPDATA || homedir(), 'FoundationOS', 'client');
  hostChild = spawn(process.execPath, [hostPath, '--server', urls.server, '--port', '0', '--no-open', '--data-dir', clientData], {
    cwd: path.dirname(hostPath), stdio: ['ignore', 'pipe', 'inherit'],
  });
  hostChild.stdout.setEncoding('utf8');
  let buffer = '';
  hostChild.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    const match = /FoundationOS 0\.3 client ready at (http:\/\/[^\s]+)/.exec(buffer);
    if (match) {
      urls.client = match[1].replace(/\/$/, '');
      const target = claim ? `${urls.client}/setup?claim=${encodeURIComponent(claim)}` : `${urls.client}/`;
      console.log(`Opening ${target}`);
      openBrowser(target);
    }
  });
  hostChild.on('exit', () => { hostChild = null; urls.client = null; });
  return hostChild;
}

function issueClaim() {
  const token = fresh();
  db.prepare('INSERT INTO setup_claims(id, token_digest, created_at, expires_at) VALUES (?,?,?,?)')
    .run(randomUUID(), digest(token), now(), new Date(nowMs() + 15 * 60 * 1000).toISOString());
  return token;
}

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}
function hiddenPrompt(question: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as any)._writeToOutput.bind(rl);
    (rl as any)._writeToOutput = (text: string) => {
      if (text.includes(question)) write(text);
      else if (text.trim() === '') write(text);
    };
    rl.question(question, answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

async function recoverOwner() {
  const username = normalizeUsername(await prompt('Owner username: '));
  const account = accountByUsername(username);
  if (!account || account.role !== 'owner' || account.closed_at) { console.log('No active owner with that username.'); return; }
  const password = await hiddenPrompt('New password (at least 6 characters): ');
  if (password.length < 6) { console.log('Password is too short.'); return; }
  const again = await hiddenPrompt('Repeat the new password: ');
  if (password !== again) { console.log('The passwords do not match.'); return; }
  const hash = await hashPassword(password);
  const code = recoveryCode();
  db.prepare('UPDATE accounts SET password_hash=?, recovery_digest=?, recovery_issued_at=? WHERE id=?')
    .run(hash, digest(compactCode(code)), now(), account.id);
  revokeAll(account.id);
  console.log(`Password reset for ${account.username}. New recovery code: ${code}`);
  console.log('Save it now. It will not be shown again.');
  event('owner-recovered-local', account.id, {});
}

async function menu() {
  if (process.env.FOUNDATIONOS_NO_MENU === '1' || !process.stdin.isTTY) return;
  for (;;) {
    // Re-read on every turn: the owner can be created while this menu is open.
    const owner = db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE role='owner' AND closed_at IS NULL").get() as { n: number };
    console.log('');
    console.log(owner.n === 0
      ? '[O] Create the owner and open FoundationOS    [Q] Quit'
      : '[O] Open FoundationOS    [R] Recover owner    [Q] Quit');
    const answer = (await prompt('> ')).toLowerCase();
    if (answer === 'o') {
      if (owner.n === 0) {
        const claim = issueClaim();
        startClient(claim);
      } else {
        startClient();
      }
    } else if (answer === 'r' && owner.n > 0) {
      await recoverOwner();
    } else if (answer === 'q') {
      if (hostChild) { try { hostChild.kill(); } catch { /* ignore */ } }
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 1000).unref();
      return;
    }
  }
}

server.listen(Number(process.env.FOUNDATIONOS_PORT || 0), '127.0.0.1', () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  urls.server = `http://127.0.0.1:${port}`;
  purgeExpired();
  setInterval(() => { try { purgeExpired(); } catch { /* ignore */ } }, day).unref();
  console.log(`FoundationOS ${version} ready at ${urls.server}/status`);
  console.log(`Store: ${root}`);
  void menu();
});
