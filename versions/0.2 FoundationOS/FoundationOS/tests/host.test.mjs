// Host tests for the FoundationOS 0.2 client host (host/serve.mjs).
//
// Spins up a stub v0.1 server (Node http) and the host on port 0, then
// asserts the brief contract: SPA fallback, /api proxying, asset 404,
// incompatible/unreachable reporting, and preferences save/load including
// validation and failed-write safety. All processes are stopped in `finally`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVE = path.join(HERE, '..', 'host', 'serve.mjs');
const MEMBER = '123e4567-e89b-12d3-a456-426614174000';
const OTHER_MEMBER = '223e4567-e89b-12d3-a456-426614174001';
const GOOD_PREFS = { theme: 'dark', surface: 'glass', density: 'compact', motion: 'off', cursor: 'target' };
const INDEX_MARKER = 'host-test-index-0.2';

function startStub({ version = '0.1', status = 'ready', schema = 2, files = [{ name: 'a.txt', type: 'file' }] } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/status' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ version, status, schema }));
      return;
    }
    if (url.pathname === '/files' && req.method === 'GET') {
      if (!req.headers.authorization) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sign in' }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(files));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown path' }));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function stubPort(server) {
  const address = server.address();
  assert(address && typeof address !== 'string', 'stub server has an address');
  return address.port;
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

// Starts the host and resolves once it prints the ready line.
function startHost({ serverUrl, dataDir, buildDir }) {
  const proc = spawn(process.execPath, [
    SERVE,
    '--server', serverUrl,
    '--port', '0',
    '--no-open',
    '--data-dir', dataDir,
    '--build', buildDir,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`host did not start (output: ${output})`)), 15000);
    proc.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = /FoundationOS 0\.2 client ready at (http:\/\/127\.0\.0\.1:\d+\/)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    proc.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) reject(new Error(`host exited with ${code} (output: ${output})`));
    });
  });
  return { proc, ready, output: () => output };
}

async function getText(url, headers = {}) {
  const response = await fetch(url, { headers });
  return { status: response.status, headers: response.headers, body: await response.text() };
}

async function postJson(url, value, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(value),
  });
  return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
}

test('v0.2 host serves the build, proxies the server and stores preferences', async (t) => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'founds-host-test-'));
  const buildDir = path.join(tmp, 'build');
  const dataDir = path.join(tmp, 'data');
  const badDataFile = path.join(tmp, 'bad-data-file');
  await mkdir(buildDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(buildDir, 'index.html'), `<html><body>${INDEX_MARKER}</body></html>`);
  await writeFile(badDataFile, 'not a directory');

  const readyStub = await startStub();
  const incompatibleStub = await startStub({ version: '0.2', status: 'ready', schema: 1 });
  const closedProbe = await startStub();
  const closedPort = stubPort(closedProbe);
  await closeServer(closedProbe);

  const procs = [];
  const servers = [readyStub, incompatibleStub];
  const track = (host) => {
    procs.push(host.proc);
    return host;
  };
  try {
    const main = track(startHost({ serverUrl: `http://127.0.0.1:${stubPort(readyStub)}`, dataDir, buildDir }));
    const incompatible = track(startHost({
      serverUrl: `http://127.0.0.1:${stubPort(incompatibleStub)}`,
      dataDir: path.join(tmp, 'data-incompatible'),
      buildDir,
    }));
    const unreachable = track(startHost({
      serverUrl: `http://127.0.0.1:${closedPort}`,
      dataDir: path.join(tmp, 'data-unreachable'),
      buildDir,
    }));
    const badDir = track(startHost({
      serverUrl: `http://127.0.0.1:${stubPort(readyStub)}`,
      dataDir: badDataFile,
      buildDir,
    }));

    const mainUrl = await main.ready;
    const badDirUrl = await badDir.ready;
    const incompatibleUrl = await incompatible.ready;
    const unreachableUrl = await unreachable.ready;

    await t.test('startup reports a ready server', () => {
      assert.match(main.output(), /ready/);
      assert.match(main.output(), /FoundationOS 0\.2 client ready at http:\/\/127\.0\.0\.1:\d+\//);
    });

    await t.test('direct SPA routes return index.html', async () => {
      for (const route of ['/', '/app/Weather', '/file/Weather/README.md']) {
        const found = await getText(`${mainUrl.slice(0, -1)}${route}`);
        assert.equal(found.status, 200, `GET ${route}`);
        assert.ok(found.body.includes(INDEX_MARKER), `GET ${route} serves index.html`);
      }
    });

    await t.test('/api/files is proxied with status and body preserved', async () => {
      const proxied = await fetch(`${mainUrl}api/files`, {
        headers: { authorization: 'Bearer session-token', accept: 'application/json' },
      });
      assert.equal(proxied.status, 200);
      assert.deepEqual(await proxied.json(), [{ name: 'a.txt', type: 'file' }]);
      const missing = await getText(`${mainUrl}api/files/nope`, { authorization: 'Bearer session-token' });
      assert.equal(missing.status, 404);
      assert.deepEqual(JSON.parse(missing.body), { error: 'Unknown path' });
    });

    await t.test('missing asset returns 404 Asset not found', async () => {
      const found = await getText(`${mainUrl}assets/nope.js`);
      assert.equal(found.status, 404);
      assert.equal(found.body, 'Asset not found');
      assert.equal(found.headers.get('content-type'), 'text/plain');
    });

    await t.test('incompatible server reports ok:false with expected and found', async () => {
      assert.match(incompatible.output(), /incompatible/);
      assert.match(incompatible.output(), /0\.1/);
      const config = await (await fetch(`${incompatibleUrl}client-config`)).json();
      assert.equal(config.clientVersion, '0.2');
      assert.equal(config.expectedServerVersion, '0.1');
      assert.equal(config.check.ok, false);
      assert.equal(config.check.status, 'incompatible');
      assert.ok(String(config.check.error).includes('0.1'), 'error shows the expected version');
      assert.ok(String(config.check.error).includes('0.2'), 'error shows the found version');
    });

    await t.test('unreachable server gives 502 JSON', async () => {
      assert.match(unreachable.output(), /unreachable/);
      const proxied = await postJson(`${unreachableUrl}api/files`, {});
      assert.equal(proxied.status, 502);
      assert.deepEqual(proxied.body, { error: 'Server unreachable' });
      const config = await (await fetch(`${unreachableUrl}client-config`)).json();
      assert.equal(config.check.ok, false);
      assert.equal(config.check.status, 'unreachable');
    });

    await t.test('preferences save/load roundtrip', async () => {
      const saved = await postJson(`${mainUrl}preferences/save`, { memberId: MEMBER, preferences: GOOD_PREFS });
      assert.equal(saved.status, 200);
      assert.deepEqual(saved.body, { preferences: GOOD_PREFS });
      const loaded = await postJson(`${mainUrl}preferences/load`, { memberId: MEMBER });
      assert.equal(loaded.status, 200);
      assert.deepEqual(loaded.body, { preferences: GOOD_PREFS });
      const unknown = await postJson(`${mainUrl}preferences/load`, { memberId: OTHER_MEMBER });
      assert.equal(unknown.status, 200);
      assert.deepEqual(unknown.body, { preferences: null });
    });

    await t.test('invalid preference is rejected 400 without touching the file', async () => {
      const before = await readFile(path.join(dataDir, 'preferences.json'), 'utf8');
      for (const preferences of [{ theme: 'Neon' }, { bogus: 'x' }, { motion: 'sometimes' }]) {
        const rejected = await postJson(`${mainUrl}preferences/save`, { memberId: MEMBER, preferences });
        assert.equal(rejected.status, 400, JSON.stringify(preferences));
        assert.ok(typeof rejected.body?.error === 'string' && rejected.body.error.length > 0);
      }
      const rejectedId = await postJson(`${mainUrl}preferences/save`, { memberId: 'not-a-uuid', preferences: GOOD_PREFS });
      assert.equal(rejectedId.status, 400);
      assert.equal(await readFile(path.join(dataDir, 'preferences.json'), 'utf8'), before);
      const loaded = await postJson(`${mainUrl}preferences/load`, { memberId: MEMBER });
      assert.deepEqual(loaded.body, { preferences: GOOD_PREFS });
    });

    await t.test('a failed write keeps the previous file', async () => {
      const before = await readFile(path.join(dataDir, 'preferences.json'), 'utf8');
      const failed = await postJson(`${badDirUrl}preferences/save`, {
        memberId: MEMBER,
        preferences: { ...GOOD_PREFS, theme: 'light' },
      });
      assert.equal(failed.status, 500);
      assert.ok(typeof failed.body?.error === 'string' && failed.body.error.length > 0);
      assert.equal(await readFile(path.join(dataDir, 'preferences.json'), 'utf8'), before);
      const loaded = await postJson(`${mainUrl}preferences/load`, { memberId: MEMBER });
      assert.deepEqual(loaded.body, { preferences: GOOD_PREFS });
    });
  } finally {
    for (const proc of procs) {
      try {
        proc.kill();
      } catch {
        // Already exited.
      }
    }
    await Promise.allSettled(servers.map((server) => closeServer(server)));
    await rm(tmp, { recursive: true, force: true });
  }
});
