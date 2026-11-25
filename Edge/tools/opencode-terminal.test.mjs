import assert from 'node:assert/strict';
import os from 'node:os';
import { test } from 'node:test';
import {
  buildConnectUrl,
  findCli,
  parseInvocation,
  pickBase,
  resolveSession,
  stripAnsi,
} from './opencode-terminal.mjs';

test('parseInvocation accepts the five commands', () => {
  for (const command of ['list', 'create', 'read', 'type', 'close']) {
    const parsed = parseInvocation([command, '{"ptyID":"pty_persistent_1"}']);
    assert.equal(parsed.command, command);
    assert.equal(parsed.args.ptyID, 'pty_persistent_1');
  }
});

test('parseInvocation rejects unknown commands and bad JSON', () => {
  assert.match(parseInvocation(['watch']).error, /Usage/);
  assert.match(parseInvocation([]).error, /Usage/);
  assert.match(parseInvocation(['read', 'not-json']).error, /must be JSON, or @path/);
});

test('parseInvocation loads @file arguments', async () => {
  const { mkdtemp, writeFile } = await import('node:fs/promises');
  const dir = await mkdtemp(os.tmpdir() + '/edge-term-');
  const file = dir + '/args.json';
  await writeFile(file, '{"ptyID":"pty_persistent_9"}');
  const parsed = parseInvocation(['read', '@' + file]);
  assert.equal(parsed.args.ptyID, 'pty_persistent_9');
});

test('resolveSession prefers the argument over the environment', () => {
  process.env.OPENCODE_SESSION_ID = 'ses_env';
  assert.equal(resolveSession({ session: 'ses_arg' }), 'ses_arg');
  assert.equal(resolveSession({}), 'ses_env');
  delete process.env.OPENCODE_SESSION_ID;
  assert.throws(() => resolveSession({}), /No session/);
});

test('findCli honours OPENCODE_CLI', () => {
  process.env.OPENCODE_CLI = process.execPath;
  assert.equal(findCli(), process.execPath);
  delete process.env.OPENCODE_CLI;
});

test('buildConnectUrl carries the single-use ticket and takes control', () => {
  const url = buildConnectUrl('http://127.0.0.1:28894', 'pty_persistent_1', 'ticket-abc');
  assert.match(url, /\/api\/experimental\/persistent-pty\/pty_persistent_1\/connect\?/);
  assert.match(url, /ticket=ticket-abc/);
  assert.match(url, /role=controller/);
  assert.match(url, /takeover=true/);
});

test('pickBase uses the server urls list, not the machine hostname', () => {
  assert.equal(
    pickBase({ version: '2.4.1', hostname: 'Chak-brinzs', urls: ['http://127.0.0.1:28894'] }),
    'http://127.0.0.1:28894',
  );
  assert.equal(pickBase({}), 'http://127.0.0.1:28894');
});
test('stripAnsi removes terminal escape sequences', () => {
  const raw = '[93mWrite-Host[m\r\nhello\r\n(base) PS C:\\X> ';
  assert.equal(stripAnsi(raw), 'Write-Host\nhello\n(base) PS C:\\X> ');
});
