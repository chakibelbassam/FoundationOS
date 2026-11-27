#!/usr/bin/env node
// FoundationOS 0.2 client host.
//
// Serves the built web client (Vite `dist`) on a loopback port and proxies
// `/api/*` operations to the FoundationOS 0.1 server. Dependency-free:
// only Node 24 built-ins are used. Windows only.
//
// Usage:
//   node serve.mjs --server <loopback http URL> [--port <n>] [--no-open]
//                   [--data-dir <dir>] [--build <dir>]
//
// The React client (src/api/client.ts) addresses every backend call under
// `/api/...`, so the host answers its own endpoints (`client-config` and
// `preferences/*`) at both the brief paths (`/client-config`,
// `/preferences/load`, `/preferences/save`) and the `/api/...` aliases the
// client actually calls. Every other `/api/*` path is proxied to the server.

import http from 'node:http';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HOST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.resolve(HOST_DIR, '..');
const CLIENT_VERSION = '0.3';
const EXPECTED_SERVER_VERSION = '0.3';
const PROBE_TIMEOUT_MS = 3000;
const PROXY_TIMEOUT_MS = 10000;
const PREFS_FILE = 'preferences.json';
const PREFS_LOCK = 'preferences.lock';
const PREFS_LOCK_RETRIES = 40;
const PREFS_LOCK_DELAY_MS = 50;
const PREFS_LOCK_STALE_MS = 5000;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Allowed preference values. Keys are the setting names; values are the
// lowercase choices the React client sends (PREFERENCE_OPTIONS in
// src/app/PreferencesContext.tsx). Matching is case-insensitive so the
// capitalised owner-decision labels ("Dark", "Follow system") are accepted
// too; anything else is rejected with 400.
const PREFERENCE_SETS = {
  theme: ['system', 'light', 'dark'],
  surface: ['solid', 'glass'],
  density: ['comfortable', 'compact'],
  motion: ['on', 'off', 'system', 'follow system'],
  cursor: ['system', 'target'],
  background: ['standard', 'topography', 'magic-rings', 'lightfall', 'ghost-fibers'],
};

// Pinned projects and recent apps are member-relative folder paths stored per
// member: short, slash-separated, never escaping the member root.
const PREFS_PATH_LIST_KEYS = ['projects', 'recentApps'];
const MAX_PATH_LIST_ENTRIES = 8;
const MAX_PATH_LIST_LENGTH = 200;

function isMemberPath(value) {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_PATH_LIST_LENGTH) return false;
  if (value.startsWith('/') || value.endsWith('/') || value.includes('\\')) return false;
  if (/(^|\/)\.\.(\/|$)/.test(value)) return false;
  if (/[\0-\x1f\x7f]/.test(value)) return false;
  return value.split('/').every((part) => part.trim().length > 0);
}

// Client route namespaces whose deep links may contain dots (for example
// /file/Weather/README.md). A missing path under one of these is an SPA
// route and falls back to index.html; any other missing path with a file
// extension is a missing asset.
const SPA_PREFIXES = ['/app/', '/file/'];

const DEFAULT_DATA_DIR = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'FoundationOS', 'client')
  : path.join(process.env.USERPROFILE || process.cwd(), 'AppData', 'Local', 'FoundationOS', 'client');

function usage() {
  return [
    'Usage: node serve.mjs --server <loopback http URL> [--port <n>] [--no-open] [--data-dir <dir>] [--build <dir>]',
    '  --server <url>   Loopback http URL of the FoundationOS 0.1 server (or set FOUNDATIONOS_SERVER).',
    '  --port <n>       Port to listen on (default 0 = free port).',
    '  --no-open        Do not open the default browser.',
    '  --data-dir <dir> Client data directory (default %LOCALAPPDATA%\\FoundationOS\\client).',
    '  --build <dir>    Built client directory (default ../dist relative to this file).',
  ].join('\n');
}

function parseArgs(argv) {
  let serverUrl = (process.env.FOUNDATIONOS_SERVER || '').trim();
  let port = 0;
  let openBrowser = true;
  let dataDir = DEFAULT_DATA_DIR;
  let buildDir = path.resolve(HOST_DIR, '../dist');
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const valueOf = (name) => {
      const inline = arg.slice(name.length + 1);
      if (arg.startsWith(`${name}=`)) return inline;
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        console.error(`Missing value for ${name}.`);
        console.error(usage());
        process.exit(2);
      }
      i += 1;
      return next;
    };
    if (arg === '--server') serverUrl = valueOf('--server').trim();
    else if (arg.startsWith('--server=')) serverUrl = valueOf('--server').trim();
    else if (arg === '--port') port = Number(valueOf('--port'));
    else if (arg.startsWith('--port=')) port = Number(valueOf('--port'));
    else if (arg === '--no-open') openBrowser = false;
    else if (arg === '--data-dir') dataDir = valueOf('--data-dir');
    else if (arg.startsWith('--data-dir=')) dataDir = valueOf('--data-dir');
    else if (arg === '--build') buildDir = path.resolve(valueOf('--build'));
    else if (arg.startsWith('--build=')) buildDir = path.resolve(valueOf('--build'));
    else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      console.error(usage());
      process.exit(2);
    }
  }
  return { serverUrl, port, openBrowser, dataDir, buildDir };
}

const CONFIG = parseArgs(process.argv.slice(2));
const SERVER_URL = CONFIG.serverUrl;
const SERVER_ROOT = SERVER_URL.replace(/\/+$/, '');
const PORT = CONFIG.port;
const DATA_DIR = CONFIG.dataDir;
const BUILD_DIR = CONFIG.buildDir;

if (!SERVER_URL) {
  console.error('Missing --server <loopback http URL> (or set FOUNDATIONOS_SERVER).');
  console.error(usage());
  process.exit(2);
}
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  console.error(`Invalid --port (got "${process.argv.join(' ')}"). Use 0 for a free port or 1-65535.`);
  process.exit(2);
}

function isLoopbackHttp(urlText) {
  let parsed;
  try {
    parsed = new URL(urlText);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '::1') return true;
  if (/^127\.(\d{1,3}\.){2}\d{1,3}$/.test(host)) return true;
  if (/^::ffff:127\.(\d{1,3}\.){2}\d{1,3}$/.test(host)) return true;
  return false;
}

if (!isLoopbackHttp(SERVER_URL)) {
  console.error(`Server URL must be a loopback http URL (got "${SERVER_URL}"). Use http://127.0.0.1:<port>.`);
  process.exit(2);
}

async function probeServer() {
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${SERVER_ROOT}/status`, { signal: controller.signal });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const version = data?.version;
    const schema = data?.schema;
    if (
      response.ok
      && version === EXPECTED_SERVER_VERSION
      && data?.status === 'ready'
      && Number.isInteger(schema)
      && schema >= 3
    ) {
      return {
        ok: true,
        status: 'ready',
        version,
        schema,
        setup: data?.setup === 'required' ? 'required' : 'ready',
        checkedAt,
      };
    }
    const found = data === null || data === undefined
      ? `http status ${response.status}`
      : `version ${JSON.stringify(version)} status ${JSON.stringify(data?.status)} schema ${JSON.stringify(schema)}`;
    return {
      ok: false,
      status: 'incompatible',
      ...(version === undefined ? {} : { version }),
      ...(schema === undefined ? {} : { schema }),
      error: `expected version ${EXPECTED_SERVER_VERSION}, found ${found}`,
      checkedAt,
    };
  } catch (error) {
    const reason = error && error.name === 'AbortError'
      ? `timed out after ${PROBE_TIMEOUT_MS}ms`
      : (error?.message || 'connection failed');
    return { ok: false, status: 'unreachable', error: `Server unreachable: ${reason}`, checkedAt };
  } finally {
    clearTimeout(timer);
  }
}

function readinessLine(check) {
  if (check.status === 'ready') {
    return `Server ready: version ${check.version} schema ${check.schema} at ${SERVER_URL}`;
  }
  if (check.status === 'unreachable') {
    return `Server unreachable at ${SERVER_URL}: ${check.error}`;
  }
  return `Server incompatible at ${SERVER_URL}: ${check.error}`;
}

function sendJson(res, code, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': body.length, 'cache-control': 'no-store' });
  res.end(body);
}

function sendText(res, code, text) {
  const body = Buffer.from(text);
  res.writeHead(code, { 'content-type': 'text/plain', 'content-length': body.length });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let failed = false;
    req.on('data', (chunk) => {
      if (failed) return;
      bytes += chunk.length;
      if (bytes > limit) {
        failed = true;
        reject(new Error('Request is too large'));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!failed) resolve(Buffer.concat(chunks));
    });
    req.on('error', (error) => {
      if (!failed) {
        failed = true;
        reject(error);
      }
    });
  });
}

const MEDIA_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

async function serveFile(res, file, method) {
  const data = await readFile(file);
  const headers = {
    'content-type': MEDIA_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'content-length': data.length,
  };
  res.writeHead(200, headers);
  res.end(method === 'HEAD' ? undefined : data);
}

async function handleStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 404, 'Asset not found');
    return;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    sendText(res, 404, 'Asset not found');
    return;
  }
  const indexFile = path.join(BUILD_DIR, 'index.html');
  if (decoded === '/') {
    await serveFile(res, indexFile, req.method);
    return;
  }
  const target = path.normalize(path.join(BUILD_DIR, decoded));
  if (target !== BUILD_DIR && !target.startsWith(BUILD_DIR + path.sep)) {
    sendText(res, 404, 'Asset not found');
    return;
  }
  try {
    const info = await stat(target);
    if (info.isFile()) {
      await serveFile(res, target, req.method);
      return;
    }
  } catch {
    // Missing: fall through to SPA fallback or 404 below.
  }
  const ext = path.extname(decoded);
  if (ext === '' || SPA_PREFIXES.some((prefix) => decoded.startsWith(prefix))) {
    await serveFile(res, indexFile, req.method);
    return;
  }
  sendText(res, 404, 'Asset not found');
}

function forward(target, method, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    const upstream = http.request(
      {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 80,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve({
          status: response.statusCode || 502,
          contentType: response.headers['content-type'],
          setCookie: response.headers['set-cookie'],
          retryAfter: response.headers['retry-after'],
          cacheControl: response.headers['cache-control'],
          body: Buffer.concat(chunks),
        }));
        response.on('error', reject);
      },
    );
    upstream.on('error', reject);
    upstream.setTimeout(PROXY_TIMEOUT_MS, () => upstream.destroy(new Error('proxy timeout')));
    upstream.end(body.length > 0 ? body : undefined);
  });
}

async function handleProxy(req, res, pathname, search) {
  const suffix = pathname.slice(4) || '/';
  const target = `${SERVER_ROOT}${suffix}${search}`;
  let body;
  try {
    body = await readBody(req, 10 * 1024 * 1024);
  } catch {
    sendJson(res, 413, { error: 'Request is too large' });
    return;
  }
  // Forward only the headers JSON/text calls need. Authorization tokens and
  // bodies are never logged.
  const headers = {};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
  if (req.headers.accept) headers.accept = req.headers.accept;
  // The browser session is an HttpOnly cookie set by the server. The host
  // forwards it unchanged and returns the server's Set-Cookie to the browser.
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  if (req.headers.origin) headers.origin = req.headers.origin;
  if (req.headers.referer) headers.referer = req.headers.referer;
  if (req.headers['sec-fetch-site']) headers['sec-fetch-site'] = req.headers['sec-fetch-site'];
  if (body.length > 0) headers['content-length'] = String(body.length);
  let upstream;
  try {
    upstream = await forward(target, req.method || 'GET', headers, body);
  } catch {
    sendJson(res, 502, { error: 'Server unreachable' });
    return;
  }
  const outHeaders = {};
  if (upstream.contentType) outHeaders['content-type'] = upstream.contentType;
  if (upstream.setCookie) outHeaders['set-cookie'] = upstream.setCookie;
  if (upstream.retryAfter) outHeaders['retry-after'] = upstream.retryAfter;
  if (upstream.cacheControl) outHeaders['cache-control'] = upstream.cacheControl;
  res.writeHead(upstream.status, outHeaders);
  res.end(req.method === 'HEAD' ? undefined : upstream.body);
}

function prefsPath() {
  return path.join(DATA_DIR, PREFS_FILE);
}

function prefsLockDir() {
  return path.join(DATA_DIR, PREFS_LOCK);
}

function bearerToken(req) {
  const raw = typeof req.headers?.authorization === 'string' ? req.headers.authorization : '';
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  const token = match ? match[1].trim() : '';
  return token || null;
}

// Identity comes from the v0.1 server, never from the request body. Returns
// { memberId } for a verified session, { unauthorized: true } for a missing,
// invalid or expired token, or { failed: true } when the server cannot answer.
async function resolveMemberId(token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${SERVER_ROOT}/profile`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return { unauthorized: true };
    let data = null;
    try {
      data = await response.json();
    } catch {
      return { unauthorized: true };
    }
    if (typeof data?.id !== 'string' || !UUID_RE.test(data.id)) return { unauthorized: true };
    return { memberId: data.id };
  } catch {
    return { failed: true };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cross-process mutual exclusion for the read-merge-write in
// handlePrefsSave. mkdir is atomic, so only one host holds the lock; stale
// locks (crashed holder) time out while short waits cover a live holder.
async function acquirePrefsLock() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // The write below reports the failure; the lock simply cannot be taken.
  }
  const lockDir = prefsLockDir();
  for (let attempt = 0; attempt < PREFS_LOCK_RETRIES; attempt += 1) {
    try {
      await mkdir(lockDir);
      return true;
    } catch (error) {
      if (error?.code !== 'EEXIST') return false;
      try {
        const info = await stat(lockDir);
        if (Date.now() - info.mtimeMs > PREFS_LOCK_STALE_MS) {
          await rm(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        // Lock vanished between calls; retry immediately.
        continue;
      }
      await sleep(PREFS_LOCK_DELAY_MS);
    }
  }
  return false;
}

async function releasePrefsLock() {
  try {
    await rm(prefsLockDir(), { recursive: true, force: true });
  } catch {
    // Best effort: a stale timeout cleans up a crashed holder.
  }
}

async function readPrefsMap() {
  let text;
  try {
    text = await readFile(prefsPath(), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
  const map = JSON.parse(text);
  if (typeof map !== 'object' || map === null || Array.isArray(map)) {
    throw new Error('Preferences store is not an object');
  }
  return map;
}

async function writePrefsMap(map) {
  await mkdir(DATA_DIR, { recursive: true });
  const file = prefsPath();
  const tmp = path.join(DATA_DIR, `.${PREFS_FILE}.${process.pid}.${Date.now()}.${Math.floor(Math.random() * 1000000)}.tmp`);
  try {
    await writeFile(tmp, JSON.stringify(map, null, 2), { flag: 'wx', mode: 0o600 });
    await rename(tmp, file);
  } finally {
    await rm(tmp, { force: true });
  }
}

function checkPreferences(preferences) {
  if (typeof preferences !== 'object' || preferences === null || Array.isArray(preferences)) {
    return 'preferences must be an object';
  }
  for (const [key, value] of Object.entries(preferences)) {
    if (PREFS_PATH_LIST_KEYS.includes(key)) {
      if (!Array.isArray(value)) return `Invalid value for "${key}"`;
      if (value.length > MAX_PATH_LIST_ENTRIES) return `Invalid value for "${key}"`;
      if (!value.every(isMemberPath)) return `Invalid value for "${key}"`;
      continue;
    }
    const allowed = PREFERENCE_SETS[key];
    if (!allowed) return `Unknown preference "${key}"`;
    if (typeof value !== 'string' || !allowed.includes(value.toLowerCase())) {
      return `Invalid value for "${key}"`;
    }
  }
  return null;
}

async function handlePrefsLoad(req, res) {
  const token = bearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Sign in' });
    return;
  }
  const resolved = await resolveMemberId(token);
  if (resolved.failed) {
    sendJson(res, 502, { error: 'Server unreachable' });
    return;
  }
  if (resolved.unauthorized || !resolved.memberId) {
    sendJson(res, 401, { error: 'Invalid or expired session' });
    return;
  }
  // The body memberId is ignored: identity always comes from the session
  // token via GET /profile. A body may still be present; it just needs to be
  // valid JSON when non-empty.
  try {
    const text = (await readBody(req, 65536)).toString('utf8');
    if (text.trim()) JSON.parse(text);
  } catch {
    sendJson(res, 400, { error: 'Request must be JSON' });
    return;
  }
  let map;
  try {
    map = await readPrefsMap();
  } catch {
    sendJson(res, 500, { error: 'The settings could not be loaded.' });
    return;
  }
  const stored = Object.prototype.hasOwnProperty.call(map, resolved.memberId) ? map[resolved.memberId] : null;
  sendJson(res, 200, { preferences: stored === undefined ? null : stored });
}

async function handlePrefsSave(req, res) {
  const token = bearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Sign in' });
    return;
  }
  const resolved = await resolveMemberId(token);
  if (resolved.failed) {
    sendJson(res, 502, { error: 'Server unreachable' });
    return;
  }
  if (resolved.unauthorized || !resolved.memberId) {
    sendJson(res, 401, { error: 'Invalid or expired session' });
    return;
  }
  const memberId = resolved.memberId;
  let input;
  try {
    const text = (await readBody(req, 65536)).toString('utf8');
    input = text.trim() ? JSON.parse(text) : {};
  } catch {
    sendJson(res, 400, { error: 'Request must be JSON' });
    return;
  }
  const problem = checkPreferences(input?.preferences);
  if (problem) {
    sendJson(res, 400, { error: problem });
    return;
  }
  // Validation passed without touching the file; now lock, load, update and
  // store atomically so two hosts saving different members both persist, and
  // a failed write keeps the last good file.
  const locked = await acquirePrefsLock();
  if (!locked) {
    sendJson(res, 500, { error: 'The settings could not be saved.' });
    return;
  }
  try {
    let map;
    try {
      map = await readPrefsMap();
    } catch {
      sendJson(res, 500, { error: 'The settings could not be saved.' });
      return;
    }
    map[memberId] = input.preferences;
    try {
      await writePrefsMap(map);
    } catch {
      sendJson(res, 500, { error: 'The settings could not be saved.' });
      return;
    }
    sendJson(res, 200, { preferences: input.preferences });
  } finally {
    await releasePrefsLock();
  }
}

async function handle(req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = url.pathname;
  try {
    if (pathname === '/client-config' || pathname === '/api/client-config') {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Use GET' });
        return;
      }
      const check = await probeServer();
      sendJson(res, 200, {
        clientVersion: CLIENT_VERSION,
        expectedServerVersion: EXPECTED_SERVER_VERSION,
        serverUrl: SERVER_URL,
        setup: check.ok ? check.setup ?? 'ready' : 'ready',
        check,
      });
      return;
    }
    if (pathname === '/preferences/load' || pathname === '/api/preferences/load') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Use POST' });
        return;
      }
      await handlePrefsLoad(req, res);
      return;
    }
    if (pathname === '/preferences/save' || pathname === '/api/preferences/save') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Use POST' });
        return;
      }
      await handlePrefsSave(req, res);
      return;
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      await handleProxy(req, res, pathname, url.search);
      return;
    }
    await handleStatic(req, res, pathname);
  } catch {
    // Never log request details here: proxied calls carry authorization
    // headers and bodies.
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
    else {
      try {
        res.end();
      } catch {
        // Connection already closed.
      }
    }
  }
}

async function main() {
  try {
    const indexInfo = await stat(path.join(BUILD_DIR, 'index.html'));
    if (!indexInfo.isFile()) throw new Error('missing index');
  } catch {
    console.error(`Build missing. Run "npm run build" in ${PACKAGE_DIR}.`);
    process.exit(1);
  }
  console.log(readinessLine(await probeServer()));
  const server = http.createServer((req, res) => {
    handle(req, res);
  });
  server.on('clientError', (error, socket) => {
    try {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } catch {
      // Socket already closed.
    }
  });
  server.listen(PORT, '127.0.0.1', () => {
    const address = server.address();
    const actual = typeof address === 'object' && address ? address.port : PORT;
    const url = `http://127.0.0.1:${actual}/`;
    console.log(`FoundationOS ${CLIENT_VERSION} client ready at ${url}`);
    // Pair the address so the server console can remember which client belongs to it.
    fetch(`${SERVER_ROOT}/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => { /* pairing is best effort; the console can still spawn a client */ });
    if (CONFIG.openBrowser) {
      try {
        const child = spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
        child.on('error', () => {});
        child.unref();
      } catch {
        // Opening the browser is best-effort.
      }
    }
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
