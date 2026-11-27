import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const serverPath = path.join(import.meta.dirname, 'server.ts');
const digest = value => createHash('sha256').update(value).digest('hex');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function startServer(dataDir, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath], {
      env: { ...process.env, FOUNDATIONOS_DATA: dataDir, FOUNDATIONOS_PORT: '0', FOUNDATIONOS_NO_MENU: '1', FOUNDATIONOS_NO_OPEN: '1', ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; child.kill(); reject(new Error(`timeout:\n${output}`)); } }, 15000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    const read = chunk => {
      output += chunk;
      const match = /FoundationOS 0\.3 ready at (http:\/\/127\.0\.0\.1:\d+)\/status/.exec(output);
      if (match && !settled) { settled = true; clearTimeout(timer); resolve({ child, base: match[1] }); }
    };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
    child.on('exit', code => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error(`exit ${code}:\n${output}`)); } });
  });
}
function stopServer(server) {
  return new Promise(resolve => {
    if (!server || server.child.exitCode !== null) return resolve();
    server.child.once('exit', () => resolve());
    server.child.kill();
    setTimeout(() => { try { server.child.kill('SIGKILL'); } catch { /* ignore */ } resolve(); }, 3000);
  });
}
async function call(base, method, route, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body;
  if (options.json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(options.json); }
  if (options.raw !== undefined) body = options.raw;
  if (options.cookie) headers.cookie = options.cookie;
  const response = await fetch(`${base}${route}`, { method, headers, body, redirect: 'manual' });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* text */ }
  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  return { status: response.status, data, setCookies, headers: response.headers };
}
function cookieOf(setCookies) {
  const raw = setCookies.find(value => value.startsWith('fo_sess_'));
  assert.ok(raw, 'expected a session cookie');
  return raw.split(';')[0];
}
function insertClaim(dataDir, token) {
  const db = new DatabaseSync(path.join(dataDir, 'foundationos.sqlite'));
  try {
    db.exec('PRAGMA busy_timeout=5000;');
    db.prepare('INSERT INTO setup_claims(id, token_digest, created_at, expires_at) VALUES (?,?,?,?)')
      .run(randomUUID(), digest(token), new Date().toISOString(), new Date(Date.now() + 3600000).toISOString());
  } finally { db.close(); }
}
async function setupOwner(base, dataDir) {
  insertClaim(dataDir, 'OWNERCLAIM');
  const response = await call(base, 'POST', '/setup', {
    json: { claim: 'OWNERCLAIM', username: 'erik', password: 'secret12' },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return cookieOf(response.setCookies);
}

test('password change revokes sessions and swaps the credential', async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'fo03-password-'));
  let server;
  try {
    server = await startServer(dataDir);
    const cookie = await setupOwner(server.base, dataDir);
    const changed = await call(server.base, 'POST', '/profile/password', { cookie, json: { current: 'secret12', next: 'secret99' } });
    assert.equal(changed.status, 200, JSON.stringify(changed.data));
    assert.equal((await call(server.base, 'GET', '/profile', { cookie })).status, 401);
    assert.equal((await call(server.base, 'POST', '/sessions', { json: { username: 'erik', password: 'secret12' } })).status, 401);
    const next = await call(server.base, 'POST', '/sessions', { json: { username: 'erik', password: 'secret99' } });
    assert.equal(next.status, 200);
  } finally {
    await stopServer(server);
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('a picture is validated, served and removed', async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'fo03-avatar-'));
  let server;
  try {
    server = await startServer(dataDir);
    const cookie = await setupOwner(server.base, dataDir);
    const upload = await call(server.base, 'POST', '/profile/avatar', {
      cookie,
      raw: PNG,
      headers: { 'content-type': 'image/png' },
    });
    assert.equal(upload.status, 200, JSON.stringify(upload.data));
    const served = await fetch(`${server.base}/profile/avatar`, { headers: { cookie } });
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/png');
    const profile = await call(server.base, 'GET', '/profile', { cookie });
    assert.match(profile.data.avatarUrl, /avatar/);
    const reject = await call(server.base, 'POST', '/profile/avatar', {
      cookie,
      raw: Buffer.from('<svg></svg>'),
      headers: { 'content-type': 'image/svg+xml' },
    });
    assert.equal(reject.status, 400);
    const removed = await call(server.base, 'DELETE', '/profile/avatar', { cookie });
    assert.equal(removed.status, 200);
    assert.equal((await fetch(`${server.base}/profile/avatar`, { headers: { cookie } })).status, 404);
  } finally {
    await stopServer(server);
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('a retained Home and username are hard deleted at the 30-day boundary', async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'fo03-retention-'));
  let first;
  let second;
  let mayaId = '';
  try {
    first = await startServer(dataDir, { FOUNDATIONOS_NOW: '2026-01-01T00:00:00.000Z' });
    const owner = await setupOwner(first.base, dataDir);
    const invite = await call(first.base, 'POST', '/invitations', { cookie: owner });
    const join = await call(first.base, 'POST', '/accounts/join', {
      json: { code: invite.data.code, username: 'maya', password: 'secret12' },
    });
    assert.equal(join.status, 200, JSON.stringify(join.data));
    mayaId = join.data.profile.id;
    const maya = cookieOf(join.setCookies);
    const closed = await call(first.base, 'POST', '/profile/close', { cookie: maya, json: { password: 'secret12' } });
    assert.equal(closed.status, 200, JSON.stringify(closed.data));
    assert.equal(closed.data.retainedUntil, '2026-01-31T00:00:00.000Z');
    assert.ok(existsSync(path.join(dataDir, 'retained', mayaId)), 'retained Home exists');
    await stopServer(first);
    first = null;

    second = await startServer(dataDir, { FOUNDATIONOS_NOW: '2026-02-01T00:00:00.000Z' });
    const ownerAgain = await call(second.base, 'POST', '/sessions', { json: { username: 'erik', password: 'secret12' } });
    assert.equal(ownerAgain.status, 200);
    const ownerCookie = cookieOf(ownerAgain.setCookies);
    const accounts = await call(second.base, 'GET', '/accounts', { cookie: ownerCookie });
    assert.equal(accounts.data.some(account => account.id === mayaId), false, 'closed account row removed');
    assert.equal(existsSync(path.join(dataDir, 'retained', mayaId)), false, 'retained Home removed');
    const inviteAgain = await call(second.base, 'POST', '/invitations', { cookie: ownerCookie });
    const reuse = await call(second.base, 'POST', '/accounts/join', {
      json: { code: inviteAgain.data.code, username: 'maya', password: 'secret12' },
    });
    assert.equal(reuse.status, 200, JSON.stringify(reuse.data));
    assert.notEqual(reuse.data.profile.id, mayaId, 'the new account has a new identity');
  } finally {
    await stopServer(first);
    await stopServer(second);
    rmSync(dataDir, { recursive: true, force: true });
  }
});
