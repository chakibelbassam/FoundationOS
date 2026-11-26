// WI-027 fixture smoke test: temp store -> v0.1 server -> seed.mjs -> GET /files asserts.
// Run: node --test "versions/0.2 FoundationOS/FoundationOS/tests/fixtures/seed.test.mjs"
// Secrets stay in os.tmpdir(); the server is stopped and the temp dirs removed after.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(here, 'seed.mjs');

function findRepoRoot(start) {
  let dir = start;
  for (;;) {
    try {
      if (fs.existsSync(path.join(dir, 'Edge')) && fs.existsSync(path.join(dir, 'versions'))) return dir;
    } catch { /* keep walking */ }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(here, '..', '..', '..', '..', '..');
}
const repoRoot = findRepoRoot(here);
const serverFile = path.join(repoRoot, 'versions', '0.1 FoundationOS', 'FoundationOS Server', 'server.ts');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stop(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  const done = once(proc, 'exit');
  try { proc.kill(); } catch { return; }
  await Promise.race([done, sleep(5000)]);
}

function launch(dir) {
  const serverArg = fileURLToPath(pathToFileURL(serverFile));
  const proc = spawn(process.execPath, [serverArg], {
    env: { ...process.env, FOUNDATIONOS_DATA: dir, FOUNDATIONOS_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  let err = '';
  proc.stdout.on('data', (c) => { out += c; });
  proc.stderr.on('data', (c) => { err += c; });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not print a ready line: ' + out + err)), 20000);
    const check = () => {
      const m = /FoundationOS 0\.1 ready at (http:\/\/127\.0\.0\.1:\d+)\/status/.exec(out);
      if (m) {
        const line = out.split('\n').find((l) => l.includes('"admin-created"'));
        if (line) {
          try {
            const admin = JSON.parse(line);
            if (admin && admin.key) { clearTimeout(timer); resolve({ base: m[1], admin }); }
          } catch { /* partial line; wait for more */ }
        }
      }
    };
    proc.stdout.on('data', check);
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
    proc.on('exit', (code) => {
      if (!/FoundationOS 0\.1 ready/.test(out)) { clearTimeout(timer); reject(new Error(`server exited ${code}: ${out}${err}`)); }
    });
  });
  return { proc, ready, output: () => out, errors: () => err };
}

async function get(base, route, token) {
  const res = await fetch(base + route, { headers: { authorization: 'Bearer ' + token, connection: 'close' } });
  const body = await res.json();
  assert.equal(res.status, 200, `${route} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
}

function names(entries) {
  return new Map(entries.map((e) => [e.name, e.type]));
}

test('WI-027 fixtures: seeder builds alice + blair homes on a disposable store', async (t) => {
  const storeDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'foundation02-wi027-store-'));
  const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'foundation02-wi027-out-'));
  const outFile = path.join(workDir, 'fixtures.json');
  const server = launch(storeDir);
  t.after(async () => {
    await stop(server.proc);
    await fs.promises.rm(storeDir, { recursive: true, force: true });
    await fs.promises.rm(workDir, { recursive: true, force: true });
  });

  const { base, admin } = await server.ready;
  assert.ok(admin.id && admin.key, 'expected admin-created line');

  // Run the seeder against the live server; pass the store dir for record-keeping.
  const seedArg = fileURLToPath(pathToFileURL(seedPath));
  const seeded = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [seedArg, '--server', base, '--admin-key', admin.key, '--data', storeDir, '--out', outFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { err += c; });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, out, err }));
  });
  assert.equal(seeded.code, 0, `seeder failed: ${seeded.out}${seeded.err}`);
  assert.match(seeded.out, /Admin key: \*\*\*\* \(redacted\)/);
  assert.ok(!seeded.out.includes(admin.key), 'seeder must not print the admin key');

  const fixtures = JSON.parse(await fs.promises.readFile(outFile, 'utf8'));
  assert.ok(fixtures.members.alice.sessionToken && fixtures.members.blair.sessionToken, 'expected both session tokens');
  const aliceToken = fixtures.members.alice.sessionToken;
  const blairToken = fixtures.members.blair.sessionToken;

  await t.test('alice root lists the full home', async () => {
    const root = names(await get(base, '/files', aliceToken));
    for (const [name, type] of [
      ['Weather', 'folder'], ['Projects', 'folder'], ['Empty', 'folder'],
      ['Broken', 'folder'], ['Long-name-folder-for-a-narrow-shelf', 'folder'],
      ['loose-note.txt', 'file'],
    ]) {
      assert.equal(root.get(name), type, `alice root missing ${name}=${type}: ${JSON.stringify([...root])}`);
    }
    const weather = names(await get(base, '/files/Weather', aliceToken));
    assert.equal(weather.get('app.json'), 'file');
    assert.equal(weather.get('README.md'), 'file');
    assert.equal(weather.get('data'), 'folder');
    const app = JSON.parse((await get(base, '/files/Weather/app.json', aliceToken)).text);
    assert.equal(app.name, 'Weather');
    assert.equal(app.brief, 'Forecasts, radar and the week ahead for your saved places.');
    const readme = (await get(base, '/files/Weather/README.md', aliceToken)).text;
    assert.ok(readme.trimEnd().endsWith('Weather 0.2'), 'alice README must end with Weather 0.2');
    const broken = JSON.parse((await get(base, '/files/Broken/app.json', aliceToken)).text);
    assert.deepEqual(broken, { name: '' });
    const notes = (await get(base, '/files/Projects/alpha/notes.txt', aliceToken)).text;
    assert.ok(notes.length > 0, 'expected alpha notes text');
  });

  await t.test('blair root contrasts: no Projects, own Weather desk', async () => {
    const root = names(await get(base, '/files', blairToken));
    for (const [name, type] of [['Weather', 'folder'], ['Journal', 'folder'], ['Photos', 'folder']]) {
      assert.equal(root.get(name), type, `blair root missing ${name}=${type}: ${JSON.stringify([...root])}`);
    }
    assert.ok(!root.has('Projects'), `blair must have no Projects folder: ${JSON.stringify([...root])}`);
    const app = JSON.parse((await get(base, '/files/Weather/app.json', blairToken)).text);
    assert.equal(app.name, 'Weather desk');
    assert.notEqual(app.brief, 'Forecasts, radar and the week ahead for your saved places.');
    const readme = (await get(base, '/files/Weather/README.md', blairToken)).text;
    assert.ok(readme.startsWith("Blair's weather desk"), 'blair README must start with Blair\'s weather desk');
    const photos = names(await get(base, '/files/Photos', blairToken));
    assert.equal(photos.get('captions.txt'), 'file');
    const entry = (await get(base, '/files/Journal/entry.md', blairToken)).text;
    assert.ok(entry.length > 0, 'expected journal entry text');
  });
});
