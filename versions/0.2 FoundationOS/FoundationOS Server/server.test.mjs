import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'server.ts');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stop(proc) {
  if (proc.exitCode !== null || proc.signalCode !== null) return;
  const done = once(proc, 'exit');
  try {
    proc.kill();
  } catch { return; }
  await Promise.race([done, sleep(5000)]);
}

function launch(dir) {
  const proc = spawn(process.execPath, [serverPath], {
    env: { ...process.env, FOUNDATIONOS_DATA: dir, FOUNDATIONOS_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  let err = '';
  proc.stdout.on('data', (chunk) => { out += chunk; });
  proc.stderr.on('data', (chunk) => { err += chunk; });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not print a ready line: ' + out + err)), 15000);
    const check = () => {
      const match = /FoundationOS 0\.2 ready at (http:\/\/127\.0\.0\.1:\d+)\/status/.exec(out);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    };
    proc.stdout.on('data', check);
    proc.on('error', (error) => { clearTimeout(timer); reject(error); });
    proc.on('exit', (code) => {
      if (!/FoundationOS 0\.2 ready/.test(out)) {
        clearTimeout(timer);
        reject(new Error(`server exited with ${code}: ${out}${err}`));
      }
    });
  });
  return { proc, ready, output: () => out, errors: () => err };
}

function adminLine(output) {
  const line = output.split('\n').find((entry) => entry.includes('"admin-created"'));
  return line ? JSON.parse(line) : null;
}

async function call(base, route, options = {}) {
  const { method = 'GET', auth = null, json = undefined, text = undefined } = options;
  const headers = { connection: 'close' };
  if (auth) headers.authorization = 'Bearer ' + auth;
  let body;
  if (json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(json);
  }
  if (text !== undefined) {
    headers['content-type'] = 'text/plain';
    body = text;
  }
  const response = await fetch(base + route, { method, headers, body });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch { /* non-JSON; leave null */ }
  return { status: response.status, body: parsed, headers: response.headers };
}

function errorShape(result) {
  assert.ok(result.body && typeof result.body.error === 'string', 'expected {error} shape, got ' + JSON.stringify(result.body));
}

test('0.2 server: status, sessions, invitations, roles, files, revocation, restart, schema guard', async (t) => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'foundation02-'));
  const live = [];
  t.after(async () => {
    for (const entry of live) await stop(entry.proc);
    await fs.promises.rm(dir, { recursive: true, force: true });
  });

  await t.test('boots with a first-run admin and reports status', async () => {
    const server = launch(dir);
    live.push(server);
    const base = await server.ready;
    server.base = base;
    const created = adminLine(server.output());
    assert.ok(created && created.id && created.key, 'expected one admin-created line');
    server.admin = created;
    const status = await call(base, '/status');
    assert.equal(status.status, 200);
    assert.deepEqual(status.body, { version: '0.2', status: 'ready', schema: 2 });
    assert.equal(status.headers.get('cache-control'), 'no-store');
    assert.equal(status.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(status.headers.get('content-type'), 'application/json');
  });

  const server = live[0];
  let adminSession;
  let member;
  let memberSession;

  await t.test('signs the admin in; keys are not sessions', async () => {
    const signed = await call(server.base, '/sessions', { method: 'POST', auth: server.admin.key });
    assert.equal(signed.status, 200);
    assert.ok(signed.body.id && signed.body.token);
    adminSession = signed.body;
    const profile = await call(server.base, '/profile', { auth: adminSession.token });
    assert.equal(profile.status, 200);
    assert.deepEqual(profile.body, { id: server.admin.id, name: 'admin', role: 'admin' });
    const keyAsSession = await call(server.base, '/profile', { auth: server.admin.key });
    assert.equal(keyAsSession.status, 401);
    errorShape(keyAsSession);
    const anonymous = await call(server.base, '/profile');
    assert.equal(anonymous.status, 401);
    errorShape(anonymous);
  });

  await t.test('invites and creates a member; invitations are one-time', async () => {
    const denied = await call(server.base, '/invitations', { method: 'POST' });
    assert.equal(denied.status, 401);
    const invitation = await call(server.base, '/invitations', { method: 'POST', auth: adminSession.token });
    assert.equal(invitation.status, 200);
    assert.ok(invitation.body.id && invitation.body.token);
    const created = await call(server.base, '/accounts', { method: 'POST', auth: invitation.body.token, json: { name: 'blair' } });
    assert.equal(created.status, 200);
    assert.equal(created.body.name, 'blair');
    assert.ok(created.body.id && created.body.key);
    member = created.body;
    const reuse = await call(server.base, '/accounts', { method: 'POST', auth: invitation.body.token, json: { name: 'blair2' } });
    assert.equal(reuse.status, 403);
    errorShape(reuse);
    const unknown = await call(server.base, '/accounts', { method: 'POST', auth: 'x'.repeat(43), json: { name: 'blair2' } });
    assert.equal(unknown.status, 401);
    errorShape(unknown);
    const second = await call(server.base, '/invitations', { method: 'POST', auth: adminSession.token });
    assert.equal(second.status, 200);
    const badName = await call(server.base, '/accounts', { method: 'POST', auth: second.body.token, json: { name: 'Bad Name!' } });
    assert.equal(badName.status, 400);
    errorShape(badName);
    const duplicate = await call(server.base, '/invitations', { method: 'POST', auth: adminSession.token });
    const taken = await call(server.base, '/accounts', { method: 'POST', auth: duplicate.body.token, json: { name: 'blair' } });
    assert.equal(taken.status, 409);
    errorShape(taken);
  });

  await t.test('members sign in but cannot use admin routes', async () => {
    const signed = await call(server.base, '/sessions', { method: 'POST', auth: member.key });
    assert.equal(signed.status, 200);
    memberSession = signed.body;
    const profile = await call(server.base, '/profile', { auth: memberSession.token });
    assert.deepEqual(profile.body, { id: member.id, name: 'blair', role: 'member' });
    const invite = await call(server.base, '/invitations', { method: 'POST', auth: memberSession.token });
    assert.equal(invite.status, 403);
    errorShape(invite);
    const accounts = await call(server.base, '/accounts', { auth: memberSession.token });
    assert.equal(accounts.status, 403);
    errorShape(accounts);
    const listed = await call(server.base, '/accounts', { auth: adminSession.token });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.length, 2);
    for (const entry of listed.body) {
      assert.ok(entry.id && entry.name && entry.role && entry.created_at);
      assert.ok(!('key_digest' in entry) && !('token_digest' in entry) && !('key' in entry) && !('token' in entry));
    }
  });

  await t.test('serves folders and files by relative path', async () => {
    const folder = await call(server.base, '/folder', { method: 'POST', auth: memberSession.token, json: { path: 'docs' } });
    assert.equal(folder.status, 200);
    assert.deepEqual(folder.body, { path: 'docs' });
    const again = await call(server.base, '/folder', { method: 'POST', auth: memberSession.token, json: { path: 'docs' } });
    assert.equal(again.status, 409);
    errorShape(again);
    const nested = await call(server.base, '/folder', { method: 'POST', auth: memberSession.token, json: { path: 'docs/sub' } });
    assert.equal(nested.status, 200);
    const written = await call(server.base, '/files/docs/notes.txt', { method: 'PUT', auth: memberSession.token, text: 'hello' });
    assert.equal(written.status, 200);
    const deep = await call(server.base, '/files/docs/sub/deep.txt', { method: 'PUT', auth: memberSession.token, text: 'deep' });
    assert.equal(deep.status, 200);
    const read = await call(server.base, '/files/docs/notes.txt', { auth: memberSession.token });
    assert.equal(read.status, 200);
    assert.deepEqual(read.body, { text: 'hello' });
    const root = await call(server.base, '/files', { auth: memberSession.token });
    assert.equal(root.status, 200);
    assert.deepEqual(root.body, [{ name: 'docs', type: 'folder' }]);
    const docs = await call(server.base, '/files/docs', { auth: memberSession.token });
    assert.equal(docs.status, 200);
    assert.deepEqual(docs.body, [{ name: 'notes.txt', type: 'file' }, { name: 'sub', type: 'folder' }]);
    const missingParent = await call(server.base, '/files/nope/x.txt', { method: 'PUT', auth: memberSession.token, text: 'x' });
    assert.equal(missingParent.status, 404);
    const tooBig = await call(server.base, '/files/docs/big.txt', { method: 'PUT', auth: memberSession.token, text: 'x'.repeat(65537) });
    assert.equal(tooBig.status, 413);
    errorShape(tooBig);
    const removed = await call(server.base, '/files/docs/notes.txt', { method: 'DELETE', auth: memberSession.token });
    assert.equal(removed.status, 200);
    const gone = await call(server.base, '/files/docs/notes.txt', { auth: memberSession.token });
    assert.equal(gone.status, 404);
    const notEmpty = await call(server.base, '/files/docs', { method: 'DELETE', auth: memberSession.token });
    assert.equal(notEmpty.status, 409);
    errorShape(notEmpty);
  });

  await t.test('refuses traversal, encoded traversal, links and junctions', async () => {
    const plain = await call(server.base, '/files/../profile.json', { auth: memberSession.token });
    assert.equal(plain.status, 404);
    errorShape(plain);
    const encoded = await call(server.base, '/files/..%2Fprofile.json', { auth: memberSession.token });
    assert.equal(encoded.status, 404);
    errorShape(encoded);
    const nested = await call(server.base, '/files/docs%2f..%2f..%2fprofile.json', { auth: memberSession.token });
    assert.equal(nested.status, 404);
    errorShape(nested);
    const writeTraversal = await call(server.base, '/files/..%2Fevil.txt', { method: 'PUT', auth: memberSession.token, text: 'x' });
    assert.equal(writeTraversal.status, 404);
    errorShape(writeTraversal);
    const home = path.join(dir, 'homes', member.id, 'files');
    const target = path.join(dir, 'outside');
    await fs.promises.mkdir(target, { recursive: true });
    const link = path.join(home, 'evil');
    fs.symlinkSync(target, link, 'junction');
    try {
      const throughJunction = await call(server.base, '/files/evil', { auth: memberSession.token });
      assert.equal(throughJunction.status, 404);
      errorShape(throughJunction);
      const writeJunction = await call(server.base, '/files/evil/x.txt', { method: 'PUT', auth: memberSession.token, text: 'x' });
      assert.equal(writeJunction.status, 404);
      errorShape(writeJunction);
    } finally {
      await fs.promises.rm(link, { force: true });
    }
    const hard = path.join(home, 'linked.txt');
    fs.linkSync(path.join(home, 'docs', 'sub', 'deep.txt'), hard);
    try {
      const throughLink = await call(server.base, '/files/linked.txt', { auth: memberSession.token });
      assert.equal(throughLink.status, 404);
      errorShape(throughLink);
    } finally {
      await fs.promises.rm(hard, { force: true });
    }
  });

  await t.test('lets owners sign out and admins revoke anyone', async () => {
    const second = await call(server.base, '/sessions', { method: 'POST', auth: server.admin.key });
    assert.equal(second.status, 200);
    const bye = await call(server.base, '/sessions/' + second.body.id, { method: 'DELETE', auth: second.body.token });
    assert.equal(bye.status, 200);
    const spent = await call(server.base, '/profile', { auth: second.body.token });
    assert.equal(spent.status, 401);
    const revoked = await call(server.base, '/sessions/' + memberSession.id, { method: 'DELETE', auth: adminSession.token });
    assert.equal(revoked.status, 200);
    const dead = await call(server.base, '/profile', { auth: memberSession.token });
    assert.equal(dead.status, 401);
    errorShape(dead);
    const deadWrite = await call(server.base, '/files/docs/sub/deep.txt', { auth: memberSession.token });
    assert.equal(deadWrite.status, 401);
    const stranger = await call(server.base, '/sessions/' + adminSession.id, { method: 'DELETE', auth: member.key });
    assert.equal(stranger.status, 401);
  });

  await t.test('keeps data across restarts without a second admin line', async () => {
    await stop(server.proc);
    const again = launch(dir);
    live.push(again);
    const base = await again.ready;
    assert.ok(!again.output().includes('"admin-created"'), 'restart must not print a second admin key');
    const status = await call(base, '/status');
    assert.deepEqual(status.body, { version: '0.2', status: 'ready', schema: 2 });
    const signed = await call(base, '/sessions', { method: 'POST', auth: member.key });
    assert.equal(signed.status, 200);
    const kept = await call(base, '/files/docs/sub/deep.txt', { auth: signed.body.token });
    assert.deepEqual(kept.body, { text: 'deep' });
    const stillDead = await call(base, '/profile', { auth: memberSession.token });
    assert.equal(stillDead.status, 401);
    await stop(again.proc);
  });

  await t.test('refuses a store newer than this copy supports', async () => {
    const bump = new DatabaseSync(path.join(dir, 'foundationos.sqlite'));
    bump.exec('UPDATE schema_meta SET version=99');
    bump.close();
    const proc = spawn(process.execPath, [serverPath], {
      env: { ...process.env, FOUNDATIONOS_DATA: dir, FOUNDATIONOS_PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    live.push({ proc });
    let out = '';
    let err = '';
    proc.stdout.on('data', (chunk) => { out += chunk; });
    proc.stderr.on('data', (chunk) => { err += chunk; });
    let timer;
    const [code] = await Promise.race([once(proc, 'exit'), new Promise((resolve) => { timer = setTimeout(() => resolve([-1]), 10000); })]);
    clearTimeout(timer);
    assert.notEqual(code, 0, 'newer schema must exit nonzero');
    assert.match(out + err, /newer than supported/);
    await stop(proc);
  });
});
