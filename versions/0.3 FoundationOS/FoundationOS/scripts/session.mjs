// WI-027 operator session helper — reads one account key, prints one session, writes nothing.
// Usage:
//   node scripts/session.mjs --server <url> [--key-stdin]
// Prompts for the account key without echoing (readline, terminal: true, hidden
// input) and calls POST /sessions. Prints only the session id and token.
// --key-stdin reads one line from stdin instead (automation). Never logs the key.

import readline from 'node:readline';

function parseArgs(argv) {
  const out = { server: null, keyStdin: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--server') out.server = argv[++i] ?? null;
    else if (a === '--key-stdin') out.keyStdin = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

async function readKeyHidden() {
  process.stdout.write('Account key: ');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // Suppress echo: swallow everything the terminal would print after the prompt.
  rl._writeToOutput = () => {};
  const line = await new Promise((resolve) => rl.once('line', resolve));
  rl.close();
  process.stdout.write('\n');
  return String(line).trim();
}

async function readKeyStdin() {
  let data = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    data += chunk;
    if (data.includes('\n')) break;
  }
  return data.split(/\r?\n/)[0].trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.server) {
    console.log('session.mjs — exchange one account key for one session\n\n  node scripts/session.mjs --server <url> [--key-stdin]\n');
    if (!args.server && !args.help) throw new Error('Missing --server <url>.');
    return;
  }
  const base = args.server.replace(/\/+$/, '');
  const key = args.keyStdin ? await readKeyStdin() : await readKeyHidden();
  if (!key) throw new Error('No account key provided.');
  const res = await fetch(base + '/sessions', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + key, connection: 'close' },
  });
  let body = null;
  try { body = await res.json(); } catch { /* leave null */ }
  if (!res.ok || !body || !body.id || !body.token) {
    throw new Error(`POST /sessions -> ${res.status} ${JSON.stringify(body)}`);
  }
  // Only the session id and token go to stdout; the key is never logged or stored.
  console.log(body.id);
  console.log(body.token);
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
