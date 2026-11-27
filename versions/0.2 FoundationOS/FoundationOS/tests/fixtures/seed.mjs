// WI-027 QA fixture seeder — disposable stores only, no dependencies beyond Node 24.
// Usage:
//   node seed.mjs [--server <url>] [--data <dir>] [--out <file>] [--large]
//                 [--admin-key <key>]  (only with --server; or env FOUNDATIONOS_ADMIN_KEY)
// When --server is omitted this script starts the released v0.1 server itself with
// FOUNDATIONOS_DATA set to --data (default under %TEMP%/foundationos-qa/store),
// captures the one-time admin key from its console, seeds alice + blair, writes the
// secret-bearing fixtures file (mode 0600) and stops the server on exit/SIGINT.
// Secrets are never printed: admin key as ****, session tokens as ****last4 only.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

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
  // Fallback: seed.mjs lives at <root>/versions/0.2 FoundationOS/FoundationOS/tests/fixtures
  return path.resolve(here, '..', '..', '..', '..', '..');
}

const repoRoot = findRepoRoot(here);
const serverFile = path.join(repoRoot, 'versions', '0.1 FoundationOS', 'FoundationOS Server', 'server.ts');
const defaultDataDir = path.join(os.tmpdir(), 'foundationos-qa', 'store');
const defaultOutFile = path.join(repoRoot, 'Edge', 'workspace', 'qa', 'fixtures.json');

function ownerStoreDir() {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.resolve(path.join(base, 'FoundationOS', 'store'));
}

function usage() {
  return `seed.mjs — seed disposable QA fixtures (alice + blair)\n\n` +
    `  node seed.mjs [--server <url>] [--data <dir>] [--out <file>] [--large] [--admin-key <key>]\n\n` +
    `  --server <url>   Existing server base URL (e.g. http://127.0.0.1:PORT). When omitted,\n` +
    `                   starts the released v0.1 server with FOUNDATIONOS_DATA=<data dir>.\n` +
    `  --data <dir>     Disposable store dir. Default: ${defaultDataDir}\n` +
    `                   Never points at the owner installation.\n` +
    `  --out <file>     Secret fixtures file. Default: <repo>/Edge/workspace/qa/fixtures.json\n` +
    `  --large          Add 200 extra root entries for alice (40 Bulk folders + 160 notes).\n` +
    `  --admin-key <k>  Admin key for an existing --server (or env FOUNDATIONOS_ADMIN_KEY).\n`;
}

function parseArgs(argv) {
  const out = { server: null, data: null, out: null, large: false, adminKey: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--server') out.server = argv[++i] ?? null;
    else if (a === '--data') out.data = argv[++i] ?? null;
    else if (a === '--out') out.out = argv[++i] ?? null;
    else if (a === '--large') out.large = true;
    else if (a === '--admin-key') out.adminKey = argv[++i] ?? null;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown argument: ${a}\n${usage()}`);
  }
  if (!out.adminKey && process.env.FOUNDATIONOS_ADMIN_KEY) out.adminKey = process.env.FOUNDATIONOS_ADMIN_KEY;
  return out;
}

// The fixtures file holds session tokens: it must live outside the tracked tree
// or under the ignored Edge/workspace directory.
function assertSafeOut(resolvedOut) {
  const rel = path.relative(repoRoot, resolvedOut);
  const outside = rel === '' ? false : rel.startsWith('..') || path.isAbsolute(rel);
  if (outside) return;
  const parts = rel.split(path.sep);
  if (parts[0] === 'Edge' && parts[1] === 'workspace') return;
  throw new Error(
    `Refusing to write secrets to tracked path: ${resolvedOut}\n` +
    `Use a path outside the repository or under Edge/workspace/ (default: ${defaultOutFile})`,
  );
}

function assertDisposableData(resolvedData) {
  const owner = ownerStoreDir();
  const rel = path.relative(owner, resolvedData);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
    throw new Error(
      `Refusing disposable QA against the owner installation: ${resolvedData}\n` +
      `Use a temp dir (default: ${defaultDataDir}). %LOCALAPPDATA%\\FoundationOS\\store is off limits.`,
    );
  }
}

async function api(base, route, { method = 'GET', auth = null, json = undefined, text = undefined } = {}) {
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
  const res = await fetch(base + route, { method, headers, body });
  let parsed = null;
  try { parsed = await res.json(); } catch { /* leave null */ }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${method} ${route} -> ${res.status} ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

function waitForServer(proc, out, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('server did not print a ready line: ' + buf + out.stderr)), timeoutMs);
    const onData = (chunk) => {
      buf += chunk.toString();
      out.stdout = buf;
      const ready = /FoundationOS 0\.1 ready at (http:\/\/127\.0\.0\.1:\d+)\/status/.exec(buf);
      const adminLine = buf.split('\n').find((l) => l.includes('"admin-created"'));
      if (ready && adminLine) {
        let admin = null;
        try { admin = JSON.parse(adminLine); } catch { /* wait for full line */ }
        if (admin && admin.key) {
          clearTimeout(timer);
          proc.stdout.off('data', onData);
          resolve({ base: ready[1], admin });
        }
      } else if (ready && buf.includes('homes') === false) {
        // Server restarted on an existing store: no admin line will come.
        // Only resolve here if we can prove there is no admin line pending;
        // the caller treats a timeout as "existing store" only when sqlite exists.
      }
    };
    proc.stdout.on('data', onData);
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timer);
        reject(new Error(`server exited with ${code}: ${buf}${out.stderr}`));
      }
    });
  });
}

async function stopProc(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  proc.kill();
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 5000);
    proc.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

// ---- fixture content ----

const ALICE_APP = JSON.stringify({ name: 'Weather', brief: 'Forecasts, radar and the week ahead for your saved places.' });
const ALICE_README = [
  'Weather for saved places',
  '',
  'Morning brings bright intervals with a light breeze off the water.',
  'Afternoon sees scattered showers moving in from the west.',
  'Evening clears again with a cool night ahead.',
  'Weather 0.2',
].join('\n') + '\n';
const ALICE_TODAY = 'Today in town: sunny intervals, high 18C, low 9C.\nWind light westerly. Rain chance 20%.\n';
const ALICE_NOTES = 'Alpha notes\n\n- Scope the first slice.\n- Keep the surface small.\n- Demo the happy path first.\n';
const ALICE_LOOSE = 'Loose note pinned at the root for quick layout checks.\n';
const ALICE_LONG_README = 'A long folder name to check narrow-shelf layout.\nIt should wrap to more than one line on a slim rail.\n';
const BROKEN_APP = JSON.stringify({ name: '' });

const BLAIR_APP = JSON.stringify({ name: 'Weather desk', brief: "Blair's harbour view: tides, hills and the weekend ahead." });
const BLAIR_README = [
  "Blair's weather desk",
  '',
  'Harbours first, then hills: dawn fog, midday sun, evening breeze.',
  'Weekend outlook stays dry enough for the coast path.',
].join('\n') + '\n';
const BLAIR_JOURNAL = 'Morning pages: harbour light, gulls, one ferry late.\nPlan the afternoon around the tide.\n';
const BLAIR_CAPTIONS = 'Harbour at dawn, hill path at noon, kitchen window rain.\n';

async function putFile(base, token, p, text) {
  return api(base, '/files/' + p.split('/').map(encodeURIComponent).join('/'), { method: 'PUT', auth: token, text });
}

async function mkFolder(base, token, p) {
  return api(base, '/folder', { method: 'POST', auth: token, json: { path: p } });
}

async function seedAlice(base, token, large) {
  await mkFolder(base, token, 'Weather');
  await putFile(base, token, 'Weather/app.json', ALICE_APP);
  await putFile(base, token, 'Weather/README.md', ALICE_README);
  await mkFolder(base, token, 'Weather/data');
  await putFile(base, token, 'Weather/data/today.txt', ALICE_TODAY);
  await mkFolder(base, token, 'Projects');
  await mkFolder(base, token, 'Projects/alpha');
  await putFile(base, token, 'Projects/alpha/notes.txt', ALICE_NOTES);
  await mkFolder(base, token, 'Empty');
  await mkFolder(base, token, 'Broken');
  await putFile(base, token, 'Broken/app.json', BROKEN_APP);
  // NOTE: brief asks for "Long name folder for a narrow shelf" with spaces, but the
  // v0.1 server rejects spaces in path segments, so the folder uses dashes; the
  // 38-char name still exercises narrow-shelf wrapping.
  await mkFolder(base, token, 'Long-name-folder-for-a-narrow-shelf');
  await putFile(base, token, 'Long-name-folder-for-a-narrow-shelf/readme.txt', ALICE_LONG_README);
  await putFile(base, token, 'loose-note.txt', ALICE_LOOSE);

  if (large) {
    // Sequential: respects the server and stays far under any concurrency limit.
    // NOTE: the brief names these "Bulk NN" with a space, but the v0.1 server
    // rejects spaces in path segments (validName: alnum start, then alnum/._-).
    // Folders use the server-valid "Bulk-NN"; the app.json display name keeps "Bulk NN".
    for (let i = 1; i <= 40; i++) {
      const nn = String(i).padStart(2, '0');
      await mkFolder(base, token, `Bulk-${nn}`);
      await putFile(base, token, `Bulk-${nn}/app.json`, JSON.stringify({ name: `Bulk ${nn}` }));
    }
    for (let i = 1; i <= 160; i++) {
      const nnn = String(i).padStart(3, '0');
      await putFile(base, token, `note-${nnn}.txt`, `Bulk note ${nnn} for large-fixture layout checks.\n`);
    }
  }
}

async function seedBlair(base, token) {
  await mkFolder(base, token, 'Weather');
  await putFile(base, token, 'Weather/app.json', BLAIR_APP);
  await putFile(base, token, 'Weather/README.md', BLAIR_README);
  await mkFolder(base, token, 'Journal');
  await putFile(base, token, 'Journal/entry.md', BLAIR_JOURNAL);
  await mkFolder(base, token, 'Photos');
  await putFile(base, token, 'Photos/captions.txt', BLAIR_CAPTIONS);
}

async function createMember(base, adminSession, name) {
  const invitation = await api(base, '/invitations', { method: 'POST', auth: adminSession });
  const account = await api(base, '/accounts', { method: 'POST', auth: invitation.token, json: { name } });
  const session = await api(base, '/sessions', { method: 'POST', auth: account.key });
  return { account, session };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const resolvedOut = path.resolve(args.out ?? defaultOutFile);
  assertSafeOut(resolvedOut);

  let base = args.server ? args.server.replace(/\/+$/, '') : null;
  let dataDir = args.data ? path.resolve(args.data) : (base ? 'external' : path.resolve(defaultDataDir));
  if (dataDir !== 'external') assertDisposableData(dataDir);

  let child = null;
  let adminKey = args.adminKey;
  const childOut = { stdout: '', stderr: '' };
  try {
    if (!base) {
      if (!fs.existsSync(serverFile)) throw new Error(`v0.1 server not found: ${serverFile}`);
      // Fresh disposable store for a self-started server so the admin key is printed.
      if (fs.existsSync(dataDir)) await fs.promises.rm(dataDir, { recursive: true, force: true });
      await fs.promises.mkdir(dataDir, { recursive: true, mode: 0o700 });
      // Normalise Windows paths (spaces) via file-URL round-trip before spawning.
      const serverArg = fileURLToPath(pathToFileURL(serverFile));
      child = spawn(process.execPath, [serverArg], {
        env: { ...process.env, FOUNDATIONOS_DATA: dataDir, FOUNDATIONOS_PORT: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stderr.on('data', (c) => { childOut.stderr += c.toString(); });
      const onSigint = async () => { await stopProc(child); process.exit(130); };
      process.once('SIGINT', onSigint);
      try {
        const started = await waitForServer(child, childOut);
        base = started.base;
        adminKey = started.admin.key;
      } finally {
        process.removeListener('SIGINT', onSigint);
      }
    } else {
      if (!adminKey) {
        throw new Error(
          'Seeding an existing --server needs its one-time admin key.\n' +
          'Pass --admin-key <key> or set FOUNDATIONOS_ADMIN_KEY (the test harness captures it from the server console).',
        );
      }
    }

    const adminSession = (await api(base, '/sessions', { method: 'POST', auth: adminKey })).token;
    const alice = await createMember(base, adminSession, 'alice');
    const blair = await createMember(base, adminSession, 'blair');

    await seedAlice(base, alice.session.token, args.large);
    await seedBlair(base, blair.session.token);

    const payload = {
      server: base,
      dataDir,
      members: {
        alice: { id: alice.account.id, name: alice.account.name, sessionToken: alice.session.token },
        blair: { id: blair.account.id, name: blair.account.name, sessionToken: blair.session.token },
      },
      notes: {
        large: args.large,
        seededAt: new Date().toISOString(),
        serverVersion: '0.1',
      },
    };
    await fs.promises.mkdir(path.dirname(resolvedOut), { recursive: true, mode: 0o700 });
    await fs.promises.writeFile(resolvedOut, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 });
    try { await fs.promises.chmod(resolvedOut, 0o600); } catch { /* Windows: best effort */ }

    // Redacted summary only: ids are fine, tokens show ****last4, admin key stays ****.
    const tail = (t) => '****' + String(t).slice(-4);
    console.log(`Server: ${base}`);
    console.log(`Data: ${dataDir}`);
    console.log(`Out: ${resolvedOut}`);
    console.log('Admin key: **** (redacted)');
    console.log(`alice ${alice.account.id} token ${tail(alice.session.token)}`);
    console.log(`blair ${blair.account.id} token ${tail(blair.session.token)}`);
    console.log(args.large ? 'Seeded alice + blair (large: +40 Bulk folders, +160 notes).' : 'Seeded alice + blair.');
  } finally {
    if (child) await stopProc(child);
  }
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
