import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, realpathSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { mkdir, open, readFile, readdir, rename, rm, rmdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const version = '0.2';
const supported = 2;
const data = path.resolve(process.env.FOUNDATIONOS_DATA || path.join(process.env.LOCALAPPDATA || homedir(), 'FoundationOS', 'store'));
mkdirSync(data, { recursive: true, mode: 0o700 });
const root = realpathSync.native(data);
const db = new DatabaseSync(path.join(root, 'foundationos.sqlite'));
db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
db.exec('CREATE TABLE IF NOT EXISTS schema_meta(version INTEGER NOT NULL)');
if (!db.prepare('SELECT version FROM schema_meta LIMIT 1').get()) db.prepare('INSERT INTO schema_meta(version) VALUES (0)').run();
const stored = (db.prepare('SELECT version FROM schema_meta LIMIT 1').get() as { version: number }).version;
if (stored > supported) {
  console.error(`FoundationOS ${version} refuses to start: store schema ${stored} is newer than supported schema ${supported}`);
  process.exit(1);
}
const migrations = [
  `CREATE TABLE accounts(id TEXT PRIMARY KEY, name TEXT UNIQUE, role TEXT NOT NULL CHECK(role IN ('admin','member')), key_digest TEXT UNIQUE, created_at TEXT NOT NULL);
   CREATE TABLE invitations(id TEXT PRIMARY KEY, token_digest TEXT UNIQUE, created_at TEXT NOT NULL, used_at TEXT)`,
  `CREATE TABLE sessions(id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), token_digest TEXT UNIQUE, created_at TEXT NOT NULL, revoked_at TEXT)`
];
for (let v = stored + 1; v <= supported; v++) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(migrations[v - 1]);
    db.prepare('UPDATE schema_meta SET version=?').run(v);
    db.exec('COMMIT');
  } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
}

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const fresh = () => randomBytes(32).toString('base64url');
const now = () => new Date().toISOString();
type Account = { id: string; name: string; role: string };
type Session = { sid: string; id: string; name: string; role: string };
function reply(res: ServerResponse, code: number, value: unknown) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}
function log(event: string, detail: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...detail }));
}
function refuse(status: number, error: string): never {
  throw { status, error };
}
function validName(name: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(name) && !name.endsWith('.') &&
    !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i.test(name);
}

const homesPath = path.join(root, 'homes');
if (!existsSync(homesPath)) mkdirSync(homesPath, { mode: 0o700 });
function mustDir(p: string) {
  const stat = lstatSync(p);
  if (!stat.isDirectory() || realpathSync.native(p) !== p) refuse(404, 'Unknown path');
}
// Entries must be real, single-link files or real directories; links and junctions are refused.
function regularFile(p: string, stat = lstatSync(p)) {
  return stat.isFile() && stat.nlink === 1 && realpathSync.native(p) === p;
}
function realDir(p: string, stat = lstatSync(p)) {
  return stat.isDirectory() && realpathSync.native(p) === p;
}
function filesOf(account: string) {
  mustDir(homesPath);
  mustDir(path.join(homesPath, account));
  const folder = path.join(homesPath, account, 'files');
  mustDir(folder);
  return folder;
}

function createHome(id: string, name: string, role: string) {
  mustDir(homesPath);
  const home = path.join(homesPath, id);
  try {
    mkdirSync(home, { mode: 0o700 });
    writeFileSync(path.join(home, 'profile.json'), JSON.stringify({ id, name, role }, null, 2), { flag: 'wx', mode: 0o600 });
    mkdirSync(path.join(home, 'files'), { mode: 0o700 });
  } catch (error) {
    try { rmSync(home, { recursive: true, force: true }); } catch { /* best effort */ }
    throw error;
  }
}
function provisionMessage(error: unknown) {
  if (error && typeof error === 'object' && 'error' in error) return String((error as { error: unknown }).error);
  const message = (error as { message?: unknown }).message;
  return message === undefined ? String(error) : String(message);
}
function failBoot(error: unknown): never {
  // Synchronous write: process.exit must not truncate the line on a pipe.
  try { writeSync(1, JSON.stringify({ event: 'admin-provision-failed', error: provisionMessage(error) }) + '\n'); } catch { /* fall through to exit */ }
  process.exit(1);
}

if ((db.prepare('SELECT COUNT(*) AS n FROM accounts').get() as { n: number }).n === 0) {
  const id = randomUUID();
  const key = fresh();
  try {
    createHome(id, 'admin', 'admin');
  } catch (error) {
    failBoot(error);
  }
  try {
    db.prepare('INSERT INTO accounts VALUES (?,?,?,?,?)').run(id, 'admin', 'admin', digest(key), now());
  } catch (error) {
    try { rmSync(path.join(homesPath, id), { recursive: true, force: true }); } catch { /* best effort */ }
    failBoot(error);
  }
  console.log(JSON.stringify({ event: 'admin-created', id, key }));
}

function bearer(req: IncomingMessage) {
  // Tokens are 32 random bytes in base64url: exactly 43 URL-safe characters.
  return /^Bearer ([\w-]{43})$/.exec(req.headers.authorization || '')?.[1] ?? null;
}
function caller(req: IncomingMessage): Session {
  const token = bearer(req);
  const found = token && db.prepare('SELECT s.id AS sid, a.id AS id, a.name AS name, a.role AS role FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_digest=? AND s.revoked_at IS NULL').get(digest(token)) as Session | undefined;
  if (!found) refuse(401, 'Sign in with a session token');
  return found;
}
async function rawBody(req: IncomingMessage, limit: number, message: string) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += (chunk as Buffer).length;
    if (bytes > limit) refuse(413, message);
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
async function jsonBody(req: IncomingMessage): Promise<any> {
  let text: string;
  try {
    text = (await rawBody(req, 8192, 'Request is too large')).toString('utf8');
  } catch (error) {
    if ((error as { status?: number }).status === 413) throw error;
    refuse(400, 'Request must be UTF-8 JSON');
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch { refuse(400, 'Request must be JSON'); }
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
      const stat = lstatSync(next);
      if (stat.isFile()) { if (!regularFile(next, stat)) refuse(404, 'Unknown path'); }
      else if (stat.isDirectory()) { if (!realDir(next, stat)) refuse(404, 'Unknown path'); }
      else refuse(404, 'Unknown path');
      if (i < parts.length - 1 && !stat.isDirectory()) refuse(404, 'Unknown path');
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
      const stat = lstatSync(full);
      if (regularFile(full, stat)) out.push({ name: entry.name, type: 'file' });
      else if (realDir(full, stat)) out.push({ name: entry.name, type: 'folder' });
    } catch { /* vanished mid-list; skip */ }
  }
  out.sort((a, b) => (a.name < b.name ? -1 : 1));
  return out;
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const route = (req.url || '/').split('?')[0];
  const method = req.method || 'GET';
  try {
    if (route === '/status') {
      if (method !== 'GET') refuse(405, 'Use GET');
      const row = db.prepare('SELECT version FROM schema_meta LIMIT 1').get() as { version: number };
      return reply(res, 200, { version, status: 'ready', schema: row.version });
    }
    if (route === '/sessions' || route.startsWith('/sessions/')) {
      if (route === '/sessions') {
        if (method !== 'POST') refuse(405, 'Use POST to sign in or DELETE a session to sign out');
        const token = bearer(req);
        const account = token && db.prepare('SELECT id, name, role FROM accounts WHERE key_digest=?').get(digest(token)) as Account | undefined;
        if (!account) refuse(401, 'Sign in with an account key');
        const id = randomUUID();
        const session = fresh();
        db.prepare('INSERT INTO sessions VALUES (?,?,?,?,NULL)').run(id, account.id, digest(session), now());
        log('sign-in', { account: account.name, session: id });
        return reply(res, 200, { id, token: session });
      }
      if (method !== 'DELETE') refuse(405, 'Use DELETE to revoke a session');
      const me = caller(req);
      const id = route.slice(10);
      if (!/^[0-9a-fA-F-]{1,80}$/.test(id)) refuse(404, 'Unknown session');
      const target = db.prepare('SELECT id, account_id, revoked_at FROM sessions WHERE id=?').get(id) as { id: string; account_id: string; revoked_at: string | null } | undefined;
      if (!target || target.revoked_at) refuse(404, 'Unknown session');
      if (target.account_id !== me.id && me.role !== 'admin') refuse(403, 'Only the owner or an admin can revoke a session');
      db.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').run(now(), id);
      const self = target.account_id === me.id;
      log(self ? 'sign-out' : 'revoked', { account: me.name, session: id });
      return reply(res, 200, { id });
    }
    if (route === '/invitations') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const me = caller(req);
      if (me.role !== 'admin') refuse(403, 'Only admins can invite');
      const id = randomUUID();
      const token = fresh();
      db.prepare('INSERT INTO invitations VALUES (?,?,?,NULL)').run(id, digest(token), now());
      log('invitation', { account: me.name, invitation: id });
      return reply(res, 200, { id, token });
    }
    if (route === '/accounts') {
      if (method === 'GET') {
        const me = caller(req);
        if (me.role !== 'admin') refuse(403, 'Only admins can list accounts');
        return reply(res, 200, db.prepare('SELECT id, name, role, created_at FROM accounts ORDER BY name').all());
      }
      if (method !== 'POST') refuse(405, 'Use GET or POST');
      const token = bearer(req);
      const invite = token && db.prepare('SELECT id, used_at FROM invitations WHERE token_digest=?').get(digest(token)) as { id: string; used_at: string | null } | undefined;
      if (!invite) refuse(401, 'Sign in with an invitation');
      if (invite.used_at) refuse(403, 'Invitation already used');
      const input = await jsonBody(req) as { name?: unknown };
      if (typeof input.name !== 'string' || !/^[a-z][a-z0-9_-]{1,38}$/.test(input.name)) refuse(400, 'Use a lowercase member name of 2 to 39 characters.');
      const id = randomUUID();
      const key = fresh();
      try {
        createHome(id, input.name, 'member');
      } catch {
        refuse(404, 'Workspace unavailable');
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('INSERT INTO accounts VALUES (?,?,?,?,?)').run(id, input.name, 'member', digest(key), now());
        const claimed = db.prepare('UPDATE invitations SET used_at=? WHERE id=? AND used_at IS NULL').run(now(), invite.id);
        if (claimed.changes !== 1) refuse(403, 'Invitation already used');
        db.exec('COMMIT');
      } catch (error) {
        if (db.isTransaction) db.exec('ROLLBACK');
        try { rmSync(path.join(homesPath, id), { recursive: true, force: true }); } catch { /* best effort */ }
        if (/UNIQUE constraint failed/i.test((error as { message?: string }).message || '')) refuse(409, 'Name already taken');
        throw error;
      }
      log('account-created', { name: input.name, account: id });
      return reply(res, 200, { id, name: input.name, key });
    }
    if (route === '/profile') {
      if (method !== 'GET') refuse(405, 'Use GET');
      const me = caller(req);
      return reply(res, 200, { id: me.id, name: me.name, role: me.role });
    }
    if (route === '/folder') {
      if (method !== 'POST') refuse(405, 'Use POST');
      const me = caller(req);
      const input = await jsonBody(req) as { path?: unknown };
      if (typeof input.path !== 'string') refuse(400, 'Give a folder path');
      const parts = segments(input.path);
      if (!parts || !parts.length) refuse(400, 'Give a valid folder path');
      const folder = filesOf(me.id);
      const target = locate(folder, parts);
      if (existsSync(target)) refuse(409, 'Already exists');
      try { await mkdir(target, { mode: 0o700 }); }
      catch { refuse(404, 'Unknown path'); }
      log('folder', { account: me.name, path: parts.join('/') });
      return reply(res, 200, { path: parts.join('/') });
    }
    if (route === '/files' || route.startsWith('/files/')) {
      if (route === '/files' && method !== 'GET') refuse(405, 'Use GET to list or address a file path');
      const parts = route === '/files' ? [] as string[] : segments(route.slice(7));
      if (parts === null) refuse(404, 'Unknown path');
      const me = caller(req);
      const folder = filesOf(me.id);
      const target = locate(folder, parts);
      const rel = parts.join('/');
      if (method === 'GET') {
        if (!existsSync(target)) refuse(404, 'Unknown path');
        const stat = lstatSync(target);
        if (stat.isFile()) {
          if (!regularFile(target, stat)) refuse(404, 'Unknown path');
          return reply(res, 200, { text: await readFile(target, 'utf8') });
        }
        return reply(res, 200, await listing(target));
      }
      if (method === 'PUT') {
        if (!parts.length) refuse(405, 'Use a file path');
        if (existsSync(target)) {
          const stat = lstatSync(target);
          if (stat.isDirectory()) refuse(409, 'A folder exists at that path');
          if (!regularFile(target, stat)) refuse(404, 'Unknown path');
        }
        const raw = await rawBody(req, 65536, 'Text file exceeds 64 KiB');
        let text: string;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(raw); }
        catch { refuse(400, 'Text must be UTF-8'); }
        const temp = path.join(path.dirname(target), '.' + randomUUID() + '.tmp');
        const fd = await open(temp, 'wx', 0o600);
        try {
          try { await fd.writeFile(text); } finally { await fd.close(); }
          await rename(temp, target);
        } finally { await rm(temp, { force: true }); }
        log('write', { account: me.name, path: rel });
        return reply(res, 200, { path: rel });
      }
      if (method === 'DELETE') {
        if (!parts.length) refuse(405, 'Use a file path');
        if (!existsSync(target)) refuse(404, 'Unknown path');
        const stat = lstatSync(target);
        if (stat.isFile()) {
          if (!regularFile(target, stat)) refuse(404, 'Unknown path');
          await rm(target);
        } else if (stat.isDirectory()) {
          if (!realDir(target, stat)) refuse(404, 'Unknown path');
          try { await rmdir(target); }
          catch (error) {
            const code = (error as NodeJS.ErrnoException)?.code;
            if (code === 'ENOTEMPTY' || code === 'EEXIST') refuse(409, 'Folder is not empty');
            refuse(404, 'Unknown path');
          }
        } else refuse(404, 'Unknown path');
        log('delete', { account: me.name, path: rel });
        return reply(res, 200, { path: rel });
      }
      refuse(405, 'Use GET, PUT or DELETE');
    }
    refuse(404, 'Unknown route');
  } catch (error) {
    if (error && typeof (error as { status?: unknown }).status === 'number') {
      const { status, error: message } = error as { status: number; error: string };
      log('refusal', { route, status, error: message });
      return reply(res, status, { error: message });
    }
    console.error(error);
    log('refusal', { route, status: 404, error: 'Workspace unavailable' });
    return reply(res, 404, { error: 'Workspace unavailable' });
  }
}

const server = createServer((req, res) => {
  handle(req, res).catch(() => {
    try { reply(res, 404, { error: 'Workspace unavailable' }); } catch { /* connection already closed */ }
  });
});
server.listen(Number(process.env.FOUNDATIONOS_PORT || 0), '127.0.0.1', () => {
  const addr = server.address();
  if (addr && typeof addr !== 'string') console.log(`FoundationOS ${version} ready at http://127.0.0.1:${addr.port}/status`);
});
