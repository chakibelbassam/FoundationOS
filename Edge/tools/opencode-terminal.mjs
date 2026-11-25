#!/usr/bin/env node
// Edge/tools/opencode-terminal.mjs
//
// Drive the OpenCode Desktop built-in terminal tab (persistent PTY) from a script,
// so the owner can watch the agent work. Uses the local OpenCode server API via
// the desktop CLI (which already carries credentials) plus a short-lived ticket
// for the terminal WebSocket. No passwords are read, printed, or stored here.
//
// Run from the repository root:
//   node Edge/tools/opencode-terminal.mjs list
//   node Edge/tools/opencode-terminal.mjs create '{"title":"edge-terminal"}'
//   node Edge/tools/opencode-terminal.mjs read '{"ptyID":"pty_persistent_..."}'
//   node Edge/tools/opencode-terminal.mjs type '{"ptyID":"pty_persistent_...","text":"Get-Date","slowMs":90}'
//   node Edge/tools/opencode-terminal.mjs close '{"ptyID":"pty_persistent_..."}'
//
// Every command takes an optional JSON object as the second argument.
// `session` defaults to the OPENCODE_SESSION_ID environment variable.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function findCli() {
  if (process.env.OPENCODE_CLI && fs.existsSync(process.env.OPENCODE_CLI)) {
    return process.env.OPENCODE_CLI;
  }
  const candidates = [];
  const cliDir = path.join(os.homedir(), 'AppData', 'Roaming', 'ai.opencode.desktop', 'cli');
  if (fs.existsSync(cliDir)) {
    for (const entry of fs.readdirSync(cliDir)) {
      const exe = path.join(cliDir, entry, 'opencode-cli.exe');
      if (fs.existsSync(exe)) candidates.push(exe);
    }
  }
  const bundled = path.join(
    os.homedir(), 'AppData', 'Local', 'Programs', 'ai.opencode.desktop', 'resources', 'opencode-cli.exe',
  );
  if (fs.existsSync(bundled)) candidates.push(bundled);
  candidates.sort().reverse();
  if (candidates.length === 0) {
    throw new Error(
      'opencode-cli.exe not found. Set OPENCODE_CLI to its full path. ' +
      'Look under %APPDATA%\\ai.opencode.desktop\\cli\\<version>-x64\\',
    );
  }
  return candidates[0];
}

export function resolveSession(args) {
  const session = args.session || process.env.OPENCODE_SESSION_ID;
  if (!session) {
    throw new Error('No session. Pass {"session":"ses_..."} or run where OPENCODE_SESSION_ID is set.');
  }
  return session;
}

export function api(cli, method, apiPath, body, extraArgs = []) {
  const argv = ['api', method, apiPath];
  if (body !== undefined) argv.push('-d', JSON.stringify(body));
  argv.push(...extraArgs);
  const result = spawnSync(cli, argv, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`opencode api failed: ${(result.stderr || '').trim().split('\n')[0] || 'exit ' + result.status}`);
  }
  const text = (result.stdout || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('opencode api returned non-JSON: ' + text.slice(0, 200));
  }
}

export function stripAnsi(text) {
  return text
    .replace(/\][^\x07]*\x07/g, '')
    .replace(/\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/[()][0-9]/g, '')
    .replace(/\r/g, '');
}

export function buildConnectUrl(base, ptyID, ticket, { role = 'controller', takeover = true } = {}) {
  const params = new URLSearchParams({ ticket, role });
  if (takeover) params.set('takeover', 'true');
  return `${base}/api/experimental/persistent-pty/${ptyID}/connect?${params.toString()}`;
}

export function pickBase(info) {
  const bare = info?.data && typeof info.data === 'object' ? info.data : info;
  const url = bare?.urls?.[0] || bare?.url || 'http://127.0.0.1:28894';
  return String(url).replace(/\/$/, '');
}

export function serverBase(cli) {
  return pickBase(api(cli, 'get', '/api/info'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeIntoTerminal({ cli, base, ptyID, text, slowMs = 0, enter = true, settleMs = 2000 }) {
  const token = api(cli, 'post', `/api/experimental/persistent-pty/${ptyID}/connect-token`, undefined, [
    '-H',
    'x-opencode-ticket: 1',
  ]);
  const ticket = token?.data?.ticket;
  if (!ticket) throw new Error('No connect ticket issued: ' + JSON.stringify(token).slice(0, 200));
  const url = buildConnectUrl(base, ptyID, ticket);
  const ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';
  let output = '';
  let opened = false;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Terminal WebSocket did not open')), 15000);
    ws.onopen = () => {
      opened = true;
      clearTimeout(timeout);
      resolve();
    };
    ws.onerror = (event) => {
      if (!opened) {
        clearTimeout(timeout);
        reject(new Error('Terminal WebSocket error: ' + (event?.message || 'open failed')));
      }
    };
    ws.onmessage = (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        try {
          const message = JSON.parse(data);
          if (message && message.type === 'replay_complete') output = '';
          return;
        } catch {
          // Not control JSON: keep it.
        }
      }
      output += typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
    };
  });
  await sleep(800);
  let sent = 0;
  for (const char of text) {
    ws.send(char);
    sent += 1;
    if (slowMs > 0) await sleep(slowMs);
  }
  if (enter) {
    await sleep(Math.max(slowMs * 4, 300));
    ws.send('\r');
    sent += 1;
  }
  await sleep(settleMs);
  ws.close();
  await sleep(300);
  return { sent, outputTail: stripAnsi(output).slice(-2000) };
}

const commands = {
  list(args, cli) {
    const session = resolveSession(args);
    const result = api(cli, 'get', `/api/experimental/session/${session}/terminal`);
    return result.data;
  },
  create(args, cli) {
    const session = resolveSession(args);
    const body = {
      title: args.title || 'edge-terminal',
      args: args.args || [],
      env: args.env || {},
      cwd: args.cwd || process.cwd().replace(/\\/g, '/'),
      ...(args.command ? { command: args.command } : {}),
      ...(args.cols && args.rows ? { size: { cols: args.cols, rows: args.rows } } : {}),
    };
    const result = api(cli, 'post', `/api/experimental/session/${session}/terminal`, body);
    return result.data;
  },
  read(args, cli) {
    if (!args.ptyID) throw new Error('read needs {"ptyID":"pty_persistent_..."}');
    const result = api(cli, 'get', `/api/experimental/persistent-pty/${args.ptyID}/snapshot`);
    return { info: result.data.info, cursor: result.data.cursor, text: result.data.text };
  },
  async type(args, cli) {
    if (!args.ptyID) throw new Error('type needs {"ptyID":"pty_persistent_...","text":"..."}');
    if (typeof args.text !== 'string') throw new Error('type needs a "text" string');
    const base = serverBase(cli);
    const result = await typeIntoTerminal({
      cli,
      base,
      ptyID: args.ptyID,
      text: args.text,
      slowMs: args.slowMs || 0,
      enter: args.enter !== false,
      settleMs: args.settleMs || 2000,
    });
    return { ptyID: args.ptyID, charsSent: result.sent, outputTail: result.outputTail };
  },
  close(args, cli) {
    if (!args.ptyID) throw new Error('close needs {"ptyID":"pty_persistent_..."}');
    api(cli, 'delete', `/api/experimental/persistent-pty/${args.ptyID}`);
    return { closed: args.ptyID };
  },
};

export function parseInvocation(argv) {
  const [command, jsonArg] = argv;
  if (!command || !(command in commands)) {
    return { error: `Usage: opencode-terminal.mjs <${Object.keys(commands).join('|')}> '[json]'` };
  }
  let args = {};
  if (jsonArg !== undefined) {
    try {
      // Windows PowerShell strips embedded double quotes from native arguments,
      // so '{"a":"b"}' may arrive as {a:b}. @path loads the JSON from a file instead.
      const raw = jsonArg.startsWith('@') ? fs.readFileSync(jsonArg.slice(1), 'utf8') : jsonArg;
      args = JSON.parse(raw);
    } catch {
      return { error: 'Second argument must be JSON, or @path to a JSON file.' };
    }
  }
  return { command, args };
}

async function main() {
  const parsed = parseInvocation(process.argv.slice(2));
  if (parsed.error) {
    console.error(parsed.error);
    process.exit(2);
  }
  try {
    const cli = findCli();
    const result = await commands[parsed.command](parsed.args, cli);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    console.error('opencode-terminal ' + parsed.command + ' failed: ' + error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
