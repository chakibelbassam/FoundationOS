import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const here = import.meta.dirname;
const serverPath = path.join(here, 'server.ts');
const digest = value => createHash('sha256').update(value).digest('hex');

function startServer(dataDir, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        FOUNDATIONOS_DATA: dataDir,
        FOUNDATIONOS_PORT: '0',
        FOUNDATIONOS_NO_MENU: '1',
        FOUNDATIONOS_NO_OPEN: '1',
        ...extraEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; child.kill(); reject(new Error(`server did not start:\n${output}`)); }
    }, 15000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = /FoundationOS 0\.3 ready at (http:\/\/127\.0\.0\.1:\d+)\/status/.exec(output);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ child, base: match[1], output: () => output });
      }
    });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('exit', code => {
      if (!settled) { settled = true; clearTimeout(timer); reject(new Error(`server exited ${code}:\n${output}`)); }
    });
  });
}

function stopServer(server) {
  if (!server) return Promise.resolve();
  return new Promise(resolve => {
    if (server.child.exitCode !== null) return resolve();
    server.child.once('exit', () => resolve());
    server.child.kill();
    setTimeout(() => { try { server.child.kill('SIGKILL'); } catch { /* ignore */ } resolve(); }, 3000);
  });
}

async function call(base, method, route, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body;
  if (options.json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(options.json);
  }
  if (options.raw !== undefined) body = options.raw;
  if (options.cookie) headers.cookie = options.cookie;
  if (options.authorization) headers.authorization = options.authorization;
  const response = await fetch(`${base}${route}`, { method, headers, body, redirect: 'manual' });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* text */ }
  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  return { status: response.status, data, setCookies, headers: response.headers };
}

function sessionCookie(setCookies) {
  const raw = setCookies.find(value => value.startsWith('fo_sess_'));
  assert.ok(raw, `expected a session cookie, saw ${JSON.stringify(setCookies)}`);
  return raw.split(';')[0];
}

function insertClaim(dataDir, token) {
  const db = new DatabaseSync(path.join(dataDir, 'foundationos.sqlite'));
  try {
    db.exec('PRAGMA busy_timeout=5000;');
    db.prepare('INSERT INTO setup_claims(id, token_digest, created_at, expires_at) VALUES (?,?,?,?)')
      .run(randomUUID(), digest(token), new Date().toISOString(), new Date(Date.now() + 15 * 60 * 1000).toISOString());
  } finally {
    db.close();
  }
}

test('v0.3 refuses an older store', async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'fo03-old-'));
  const db = new DatabaseSync(path.join(dataDir, 'foundationos.sqlite'));
  db.exec('CREATE TABLE schema_meta(version INTEGER NOT NULL);');
  db.prepare('INSERT INTO schema_meta(version) VALUES (2)').run();
  db.close();
  try {
    const result = await new Promise(resolve => {
      const child = spawn(process.execPath, [serverPath], {
        env: { ...process.env, FOUNDATIONOS_DATA: dataDir, FOUNDATIONOS_PORT: '0', FOUNDATIONOS_NO_MENU: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      child.on('exit', code => resolve({ code, output }));
    });
    assert.equal(result.code, 1);
    assert.match(result.output, /refuses to start/i);
    assert.match(result.output, /schema 2/);
    assert.match(result.output, /not changed/i);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('v0.3 account, session, invitation, preference and retention journeys', async t => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'fo03-'));
  let server;
  let ownerCookie = '';
  let memberCookie = '';
  let ownerRecovery = '';
  try {
    server = await startServer(dataDir);
    const base = server.base;

    await t.test('status reports a fresh store', async () => {
      const response = await call(base, 'GET', '/status');
      assert.equal(response.status, 200);
      assert.equal(response.data.version, '0.3');
      assert.equal(response.data.schema, 3);
      assert.equal(response.data.setup, 'required');
    });

    await t.test('owner setup consumes the claim and issues a recovery code', async () => {
      insertClaim(dataDir, 'TESTCLAIM');
      const response = await call(base, 'POST', '/setup', {
        json: { claim: 'TESTCLAIM', username: 'sigma', password: 'secret12', email: 'sigma@example.test' },
      });
      assert.equal(response.status, 200, JSON.stringify(response.data));
      assert.equal(response.data.profile.username, 'sigma');
      assert.equal(response.data.profile.role, 'owner');
      assert.match(response.data.recoveryCode, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
      ownerRecovery = response.data.recoveryCode;
      ownerCookie = sessionCookie(response.setCookies);
      assert.match(response.setCookies[0], /HttpOnly/i);
      assert.match(response.setCookies[0], /SameSite=Lax/i);
    });

    await t.test('a used setup claim cannot create a second owner', async () => {
      const response = await call(base, 'POST', '/setup', {
        json: { claim: 'TESTCLAIM', username: 'other', password: 'secret12' },
      });
      assert.equal(response.status, 409);
    });

    await t.test('profile is available from the cookie', async () => {
      const response = await call(base, 'GET', '/profile', { cookie: ownerCookie });
      assert.equal(response.status, 200);
      assert.equal(response.data.username, 'sigma');
      assert.equal(response.data.role, 'owner');
    });

    await t.test('five failures block the sixth attempt for that username', async () => {
      for (let i = 0; i < 5; i += 1) {
        const response = await call(base, 'POST', '/sessions', { json: { username: 'nobody', password: 'wrong' } });
        assert.equal(response.status, 401);
      }
      const blocked = await call(base, 'POST', '/sessions', { json: { username: 'nobody', password: 'wrong' } });
      assert.equal(blocked.status, 429);
      assert.ok(blocked.headers.get('retry-after'));
    });

    await t.test('a correct sign-in issues another session', async () => {
      const response = await call(base, 'POST', '/sessions', {
        json: { username: 'sigma', password: 'secret12', remember: true },
      });
      assert.equal(response.status, 200, JSON.stringify(response.data));
      assert.equal(response.data.profile.username, 'sigma');
    });

    await t.test('preferences round-trip through the server', async () => {
      const preferences = {
        theme: 'dark', surface: 'glass', density: 'comfortable', motion: 'on',
        cursor: 'target', background: 'topography', projects: ['Notes'], recentApps: [],
      };
      const saved = await call(base, 'PUT', '/preferences', { cookie: ownerCookie, json: { preferences } });
      assert.equal(saved.status, 200, JSON.stringify(saved.data));
      const loaded = await call(base, 'GET', '/preferences', { cookie: ownerCookie });
      assert.equal(loaded.status, 200);
      assert.deepEqual(loaded.data.preferences, preferences);
      assert.equal(loaded.data.accountId, loaded.data.accountId);
    });

    await t.test('owner invites a member with a six-digit code', async () => {
      const invite = await call(base, 'POST', '/invitations', { cookie: ownerCookie });
      assert.equal(invite.status, 200, JSON.stringify(invite.data));
      assert.match(invite.data.code, /^\d{6}$/);
      const join = await call(base, 'POST', '/accounts/join', {
        json: { code: invite.data.code, username: 'maya', password: 'secret12' },
      });
      assert.equal(join.status, 200, JSON.stringify(join.data));
      assert.equal(join.data.profile.username, 'maya');
      assert.equal(join.data.profile.role, 'member');
      memberCookie = sessionCookie(join.setCookies);
      const accounts = await call(base, 'GET', '/accounts', { cookie: memberCookie });
      assert.equal(accounts.status, 403);
    });

    await t.test('private homes stay isolated', async () => {
      const folder = await call(base, 'POST', '/folder', { cookie: ownerCookie, json: { path: 'Notes' } });
      assert.equal(folder.status, 200);
      const write = await call(base, 'PUT', '/files/Notes/README.md', {
        cookie: ownerCookie, raw: 'owner only', headers: { 'content-type': 'text/plain' },
      });
      assert.equal(write.status, 200);
      const denied = await call(base, 'GET', '/files/Notes/README.md', { cookie: memberCookie });
      assert.equal(denied.status, 404);
    });

    await t.test('current-session sign-out leaves another session alive', async () => {
      const first = await call(base, 'POST', '/sessions', { json: { username: 'maya', password: 'secret12' } });
      const second = await call(base, 'POST', '/sessions', { json: { username: 'maya', password: 'secret12' } });
      const firstCookie = sessionCookie(first.setCookies);
      const secondCookie = sessionCookie(second.setCookies);
      const out = await call(base, 'DELETE', '/sessions/current', { cookie: firstCookie });
      assert.equal(out.status, 200);
      assert.equal((await call(base, 'GET', '/profile', { cookie: firstCookie })).status, 401);
      assert.equal((await call(base, 'GET', '/profile', { cookie: secondCookie })).status, 200);
    });

    await t.test('sign out of all sessions ends every session for one account only', async () => {
      const first = await call(base, 'POST', '/sessions', { json: { username: 'maya', password: 'secret12' } });
      const second = await call(base, 'POST', '/sessions', { json: { username: 'maya', password: 'secret12' } });
      const firstCookie = sessionCookie(first.setCookies);
      const secondCookie = sessionCookie(second.setCookies);
      const all = await call(base, 'POST', '/sessions/sign-out-all', { cookie: firstCookie, json: { confirm: true } });
      assert.equal(all.status, 200);
      assert.equal((await call(base, 'GET', '/profile', { cookie: firstCookie })).status, 401);
      assert.equal((await call(base, 'GET', '/profile', { cookie: secondCookie })).status, 401);
      assert.equal((await call(base, 'GET', '/profile', { cookie: ownerCookie })).status, 200);
    });

    await t.test('rename keeps the account and frees the old username', async () => {
      const renamed = await call(base, 'PATCH', '/profile', { cookie: ownerCookie, json: { username: 'erik', bio: 'Hello' } });
      assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
      assert.equal(renamed.data.username, 'erik');
      const oldLogin = await call(base, 'POST', '/sessions', { json: { username: 'sigma', password: 'secret12' } });
      assert.equal(oldLogin.status, 401);
      const newLogin = await call(base, 'POST', '/sessions', { json: { username: 'erik', password: 'secret12' } });
      assert.equal(newLogin.status, 200);
      const prefs = await call(base, 'GET', '/preferences', { cookie: ownerCookie });
      assert.deepEqual(prefs.data.preferences.projects, ['Notes']);
    });

    await t.test('a username collision is refused', async () => {
      const invite = await call(base, 'POST', '/invitations', { cookie: ownerCookie });
      const join = await call(base, 'POST', '/accounts/join', {
        json: { code: invite.data.code, username: 'maya', password: 'secret12' },
      });
      assert.equal(join.status, 409);
    });

    await t.test('the owner cannot delete the last owner account', async () => {
      const response = await call(base, 'POST', '/profile/close', { cookie: ownerCookie, json: { password: 'secret12' } });
      assert.equal(response.status, 400);
    });

    await t.test('a member closes their account and the username stays reserved', async () => {
      const login = await call(base, 'POST', '/sessions', { json: { username: 'maya', password: 'secret12' } });
      const cookie = sessionCookie(login.setCookies);
      const closed = await call(base, 'POST', '/profile/close', { cookie, json: { password: 'secret12' } });
      assert.equal(closed.status, 200, JSON.stringify(closed.data));
      assert.ok(closed.data.retainedUntil);
      assert.equal((await call(base, 'GET', '/profile', { cookie })).status, 401);
      assert.equal((await call(base, 'POST', '/sessions', { json: { username: 'maya', password: 'secret12' } })).status, 401);
      const invite = await call(base, 'POST', '/invitations', { cookie: ownerCookie });
      const reuse = await call(base, 'POST', '/accounts/join', {
        json: { code: invite.data.code, username: 'maya', password: 'secret12' },
      });
      assert.equal(reuse.status, 409);
    });

    await t.test('owner recovery consumes the code, rotates it and revokes sessions', async () => {
      const wrong = await call(base, 'POST', '/recovery/owner', {
        json: { username: 'erik', code: 'WRONG-CODE-WRONG-CODE', password: 'secret34' },
      });
      assert.equal(wrong.status, 401);
      const recovery = await call(base, 'POST', '/recovery/owner', {
        json: { username: 'erik', code: ownerRecovery, password: 'secret99' },
      });
      assert.equal(recovery.status, 200, JSON.stringify(recovery.data));
      assert.match(recovery.data.recoveryCode, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
      assert.equal((await call(base, 'GET', '/profile', { cookie: ownerCookie })).status, 401);
      const oldPassword = await call(base, 'POST', '/sessions', { json: { username: 'erik', password: 'secret12' } });
      assert.equal(oldPassword.status, 401);
      const newPassword = await call(base, 'POST', '/sessions', { json: { username: 'erik', password: 'secret99' } });
      assert.equal(newPassword.status, 200);
      const replay = await call(base, 'POST', '/recovery/owner', {
        json: { username: 'erik', code: ownerRecovery, password: 'secret77' },
      });
      assert.equal(replay.status, 401);
    });
  } finally {
    await stopServer(server);
    rmSync(dataDir, { recursive: true, force: true });
  }
});
