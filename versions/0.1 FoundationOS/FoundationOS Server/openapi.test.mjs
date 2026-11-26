// Contract suite for the FoundationOS 0.1 server.
//
// This file reads openapi.yaml beside it, starts the server on a fresh
// temporary store, calls every documented operation and every documented
// response status, and for every response asserts the status is documented,
// the body validates against that status's documented schema, and the
// Content-Type starts with application/json. It then asserts set equality:
// every documented operation and status was exercised and nothing
// undocumented was exercised. Finally it sends PATCH to every path and
// asserts the documented global 405 promise.
//
// Supported YAML subset (the whole file is parsed with the reader below;
// anything outside this subset fails loudly with a line number):
// - Block mappings (`key: value`, or `key:` with a nested block on deeper lines).
// - Block sequences of mappings (`- key: value` with further `key: value`
//   lines indented two spaces deeper) and one-key inline maps (`- bearerAuth: []`).
// - Inline values: plain scalars, single-quoted strings ('' escapes a quote),
//   booleans, integers, and flow sequences of scalars (`[a, b]`, `[]`).
// - Wrapped plain scalars: a line indented deeper than its key, immediately
//   after a non-empty scalar value and containing no ': ', is a continuation
//   joined to the value with a single space.
// - No tabs, no double-quoted strings, no anchors, no literal blocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, 'server.ts');
const openapiPath = path.join(here, 'openapi.yaml');

// --- Minimal server helpers (duplicated from server.test.mjs) ---

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
      const match = /FoundationOS 0\.1 ready at (http:\/\/127\.0\.0\.1:\d+)\/status/.exec(out);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    };
    proc.stdout.on('data', check);
    proc.on('error', (error) => { clearTimeout(timer); reject(error); });
    proc.on('exit', (code) => {
      if (!/FoundationOS 0\.1 ready/.test(out)) {
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
  const { method = 'GET', auth = null, json = undefined, text = undefined, bytes = undefined } = options;
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
  if (bytes !== undefined) {
    headers['content-type'] = 'text/plain';
    body = Buffer.from(bytes);
  }
  const response = await fetch(base + route, { method, headers, body });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch { /* non-JSON; leave null */ }
  return { status: response.status, body: parsed, headers: response.headers };
}

// --- Strict YAML subset reader ---

function readYamlLines(text) {
  const lines = [];
  text.split('\n').forEach((entry, index) => {
    const no = index + 1;
    if (entry.includes('\t')) throw new Error(`openapi.yaml line ${no}: tabs are not allowed`);
    const stripped = entry.replace(/\s+$/, '');
    if (stripped === '') return;
    const indent = stripped.length - stripped.trimStart().length;
    const content = stripped.slice(indent);
    if (content.startsWith('#')) return;
    lines.push({ no, indent, content });
  });
  return lines;
}

function parseSingle(text, no) {
  if (text.length < 2 || !text.startsWith("'") || !text.endsWith("'")) {
    throw new Error(`openapi.yaml line ${no}: bad single-quoted string ${JSON.stringify(text)}`);
  }
  return text.slice(1, -1).replace(/''/g, "'");
}

function parseScalar(text, no) {
  const value = text.trim();
  if (value.startsWith('[')) {
    if (!value.endsWith(']')) throw new Error(`openapi.yaml line ${no}: unterminated flow sequence ${JSON.stringify(value)}`);
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((part) => parseScalar(part, no));
  }
  if (value.startsWith("'")) return parseSingle(value, no);
  if (/^["{&*|>]/.test(value)) throw new Error(`openapi.yaml line ${no}: unsupported scalar ${JSON.stringify(value)}`);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === '') throw new Error(`openapi.yaml line ${no}: empty scalar`);
  return value;
}

function splitKey(content, no) {
  const at = content.indexOf(': ');
  if (at !== -1) return [unquoteKey(content.slice(0, at), no), content.slice(at + 2)];
  if (content.endsWith(':')) return [unquoteKey(content.slice(0, -1), no), ''];
  throw new Error(`openapi.yaml line ${no}: expected 'key: value', got ${JSON.stringify(content)}`);
}

function unquoteKey(key, no) {
  if (key.startsWith("'")) return parseSingle(key, no);
  if (key === '' || /\s/.test(key)) throw new Error(`openapi.yaml line ${no}: bad key ${JSON.stringify(key)}`);
  return key;
}

function isContinuation(content) {
  return !content.startsWith('- ') && !content.includes(': ') && !content.endsWith(':');
}

function parseValue(state, keyIndent, valueText, no) {
  if (valueText !== '') {
    let scalar = parseScalar(valueText, no);
    const parts = [];
    while (state.i < state.lines.length && state.lines[state.i].indent > keyIndent) {
      const next = state.lines[state.i];
      if (!isContinuation(next.content)) {
        throw new Error(`openapi.yaml line ${next.no}: cannot consume ${JSON.stringify(next.content)}`);
      }
      if (typeof scalar !== 'string') {
        throw new Error(`openapi.yaml line ${next.no}: continuation on a non-string scalar`);
      }
      parts.push(next.content);
      state.i++;
    }
    if (parts.length) scalar = [scalar, ...parts].join(' ');
    return scalar;
  }
  if (state.i >= state.lines.length) throw new Error(`openapi.yaml line ${no}: expected a nested block`);
  const next = state.lines[state.i];
  if (next.indent <= keyIndent) throw new Error(`openapi.yaml line ${next.no}: expected a nested block`);
  if (next.content.startsWith('- ')) return parseSequence(state, next.indent);
  return parseMapping(state, next.indent);
}

function parseMapping(state, keyIndent) {
  const map = {};
  while (state.i < state.lines.length) {
    const line = state.lines[state.i];
    if (line.indent !== keyIndent) break;
    if (line.content.startsWith('- ')) {
      throw new Error(`openapi.yaml line ${line.no}: unexpected sequence item`);
    }
    const [key, valueText] = splitKey(line.content, line.no);
    if (Object.hasOwn(map, key)) throw new Error(`openapi.yaml line ${line.no}: duplicate key ${JSON.stringify(key)}`);
    state.i++;
    map[key] = parseValue(state, keyIndent, valueText, line.no);
  }
  return map;
}

function parseSequence(state, dashIndent) {
  const items = [];
  const keyIndent = dashIndent + 2;
  while (state.i < state.lines.length) {
    const line = state.lines[state.i];
    if (line.indent !== dashIndent || !line.content.startsWith('- ')) break;
    const rest = line.content.slice(2);
    state.i++;
    if (rest === '') {
      if (state.i >= state.lines.length) throw new Error(`openapi.yaml line ${line.no}: expected a nested block`);
      const next = state.lines[state.i];
      if (next.indent <= dashIndent) throw new Error(`openapi.yaml line ${next.no}: expected a nested block`);
      items.push(next.content.startsWith('- ') ? parseSequence(state, next.indent) : parseMapping(state, next.indent));
      continue;
    }
    if (rest.indexOf(': ') === -1 && !rest.endsWith(':')) {
      items.push(parseScalar(rest, line.no));
      continue;
    }
    const [key, valueText] = splitKey(rest, line.no);
    const map = {};
    map[key] = parseValue(state, keyIndent, valueText, line.no);
    while (state.i < state.lines.length) {
      const follow = state.lines[state.i];
      if (follow.indent !== keyIndent) break;
      if (follow.content.startsWith('- ')) break;
      const [k, v] = splitKey(follow.content, follow.no);
      if (Object.hasOwn(map, k)) throw new Error(`openapi.yaml line ${follow.no}: duplicate key ${JSON.stringify(k)}`);
      state.i++;
      map[k] = parseValue(state, keyIndent, v, follow.no);
    }
    items.push(map);
  }
  return items;
}

function parseYaml(text) {
  const state = { lines: readYamlLines(text), i: 0 };
  if (!state.lines.length || state.lines[0].indent !== 0) {
    throw new Error('openapi.yaml line 1: expected a top-level mapping');
  }
  const doc = parseMapping(state, 0);
  if (state.i !== state.lines.length) {
    const stuck = state.lines[state.i];
    throw new Error(`openapi.yaml line ${stuck.no}: cannot consume ${JSON.stringify(stuck.content)}`);
  }
  return doc;
}

// --- Small response validator over the documented schemas ---

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((entry, i) => deepEqual(entry, b[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
  }
  return false;
}

function resolveSchema(doc, schema, where) {
  if (schema && typeof schema === 'object' && typeof schema.$ref === 'string') {
    const match = /^#\/components\/schemas\/([^/]+)$/.exec(schema.$ref);
    if (!match) throw new Error(`${where}: unsupported $ref ${JSON.stringify(schema.$ref)}`);
    const target = doc.components && doc.components.schemas && doc.components.schemas[match[1]];
    if (!target) throw new Error(`${where}: unknown $ref ${JSON.stringify(schema.$ref)}`);
    return target;
  }
  return schema;
}

function checkFormat(format, value, where) {
  if (format === 'uuid') {
    if (typeof value !== 'string' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
      return `${where}: expected uuid, got ${JSON.stringify(value)}`;
    }
  } else if (format === 'date-time') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) {
      return `${where}: expected date-time, got ${JSON.stringify(value)}`;
    }
  }
  return null;
}

function validate(doc, schema, value, where) {
  schema = resolveSchema(doc, schema, where);
  if (schema === undefined || schema === true) return [];
  if (typeof schema !== 'object' || schema === null) return [`${where}: bad schema`];
  if (schema.oneOf !== undefined) {
    if (!Array.isArray(schema.oneOf)) return [`${where}: bad oneOf`];
    const matches = schema.oneOf.filter((branch) => validate(doc, branch, value, where).length === 0);
    if (matches.length !== 1) return [`${where}: oneOf matched ${matches.length} branches, expected exactly 1`];
    return [];
  }
  const errors = [];
  if (schema.type !== undefined) {
    const ok = schema.type === 'object' ? (typeof value === 'object' && value !== null && !Array.isArray(value))
      : schema.type === 'array' ? Array.isArray(value)
      : schema.type === 'string' ? typeof value === 'string'
      : schema.type === 'integer' ? (typeof value === 'number' && Number.isInteger(value))
      : schema.type === 'boolean' ? typeof value === 'boolean'
      : false;
    if (!ok) return [`${where}: expected ${schema.type}, got ${JSON.stringify(value)}`];
  }
  if (schema.const !== undefined && !deepEqual(schema.const, value)) {
    errors.push(`${where}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }
  if (schema.enum !== undefined && !schema.enum.some((entry) => deepEqual(entry, value))) {
    errors.push(`${where}: expected one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(value)}`);
  }
  if (typeof value === 'string') {
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${where}: longer than maxLength ${schema.maxLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${where}: does not match pattern ${schema.pattern}`);
    }
    if (schema.format !== undefined) {
      const problem = checkFormat(schema.format, value, where);
      if (problem) errors.push(problem);
    }
  }
  if (typeof value === 'object' && value !== null) {
    if (schema.required !== undefined) {
      for (const key of schema.required) {
        if (value[key] === undefined) errors.push(`${where}: missing required ${JSON.stringify(key)}`);
      }
    }
    if (schema.properties !== undefined && !Array.isArray(value)) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (value[key] !== undefined) errors.push(...validate(doc, sub, value[key], `${where}.${key}`));
      }
    }
    if (schema.items !== undefined && Array.isArray(value)) {
      value.forEach((entry, i) => errors.push(...validate(doc, schema.items, entry, `${where}[${i}]`)));
    }
  }
  return errors;
}

// --- The contract run ---

test('0.1 contract: every documented operation and response status validates', async (t) => {
  const doc = parseYaml(fs.readFileSync(openapiPath, 'utf8'));
  const documented = {};
  for (const [template, item] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(item)) {
      if (!['get', 'post', 'put', 'delete'].includes(method)) {
        throw new Error(`unsupported documented method ${method} on ${template}`);
      }
      const key = `${method.toUpperCase()} ${template}`;
      documented[key] = {};
      for (const [code, response] of Object.entries(op.responses || {})) {
        const schema = response.content && response.content['application/json'] && response.content['application/json'].schema;
        if (!schema) throw new Error(`no JSON schema documented for ${key} ${code}`);
        documented[key][code] = schema;
      }
    }
  }

  // Guard against a parser that silently drops a path: the published file has
  // nine paths and twelve operations. Update these counts only with the contract.
  assert.equal(Object.keys(doc.paths).length, 9, 'expected 9 documented paths');
  assert.equal(Object.keys(documented).length, 12, 'expected 12 documented operations');

  const exercised = {};
  async function expectDocumented(base, method, template, concrete, options = {}) {
    const key = `${method} ${template}`;
    if (!documented[key]) throw new Error(`exercised undocumented operation ${key}`);
    const result = await call(base, concrete, { method, ...options });
    const code = String(result.status);
    if (!(code in documented[key])) {
      throw new Error(`${key}: status ${code} is not documented, body ${JSON.stringify(result.body)}`);
    }
    const problems = validate(doc, documented[key][code], result.body, `${key} ${code}`);
    assert.deepEqual(problems, [], `${key} ${code} body failed schema validation`);
    const contentType = result.headers.get('content-type') || '';
    assert.ok(contentType.startsWith('application/json'), `${key} ${code}: expected a JSON content type, got ${contentType}`);
    (exercised[key] ??= new Set()).add(code);
    return result;
  }

  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'foundation02-contract-'));
  const live = [];
  t.after(async () => {
    for (const entry of live) await stop(entry.proc);
    await fs.promises.rm(dir, { recursive: true, force: true });
  });
  const server = launch(dir);
  live.push(server);
  const base = await server.ready;
  const admin = adminLine(server.output());
  assert.ok(admin && admin.id && admin.key, 'expected one admin-created line');

  await expectDocumented(base, 'GET', '/status', '/status');
  const badKey = 'q'.repeat(43);
  await expectDocumented(base, 'POST', '/sessions', '/sessions', { auth: badKey });
  const adminSession = (await expectDocumented(base, 'POST', '/sessions', '/sessions', { auth: admin.key })).body;
  assert.ok(adminSession.id && adminSession.token);

  const invitationA = (await expectDocumented(base, 'POST', '/invitations', '/invitations', { auth: adminSession.token })).body;
  await expectDocumented(base, 'POST', '/invitations', '/invitations');
  const memberA = (await expectDocumented(base, 'POST', '/accounts', '/accounts', { auth: invitationA.token, json: { name: 'contracta' } })).body;
  const memberSession = (await call(base, '/sessions', { method: 'POST', auth: memberA.key })).body;
  assert.ok(memberSession.token, 'member must sign in with the new key');
  await expectDocumented(base, 'POST', '/invitations', '/invitations', { auth: memberSession.token });
  await expectDocumented(base, 'GET', '/accounts', '/accounts', { auth: adminSession.token });
  await expectDocumented(base, 'GET', '/accounts', '/accounts');
  await expectDocumented(base, 'GET', '/accounts', '/accounts', { auth: memberSession.token });

  const invitationB = (await call(base, '/invitations', { method: 'POST', auth: adminSession.token })).body;
  await expectDocumented(base, 'POST', '/accounts', '/accounts', { auth: invitationB.token, json: { name: 'Bad Name!' } });
  await expectDocumented(base, 'POST', '/accounts', '/accounts', { auth: 'z'.repeat(43), json: { name: 'contractb' } });
  await expectDocumented(base, 'POST', '/accounts', '/accounts', { auth: invitationA.token, json: { name: 'contractb' } });
  const invitationC = (await call(base, '/invitations', { method: 'POST', auth: adminSession.token })).body;
  await expectDocumented(base, 'POST', '/accounts', '/accounts', { auth: invitationC.token, json: { name: 'contracta' } });

  await expectDocumented(base, 'GET', '/profile', '/profile', { auth: memberSession.token });
  await expectDocumented(base, 'GET', '/profile', '/profile');
  await expectDocumented(base, 'GET', '/files', '/files', { auth: memberSession.token });
  await expectDocumented(base, 'GET', '/files', '/files');

  await expectDocumented(base, 'POST', '/folder', '/folder', { auth: memberSession.token, json: { path: 'docs' } });
  await expectDocumented(base, 'POST', '/folder', '/folder', { auth: memberSession.token, json: { path: 'Bad!!' } });
  await expectDocumented(base, 'POST', '/folder', '/folder', { json: { path: 'docs' } });
  await expectDocumented(base, 'POST', '/folder', '/folder', { auth: memberSession.token, json: { path: 'nope/sub' } });
  await expectDocumented(base, 'POST', '/folder', '/folder', { auth: memberSession.token, json: { path: 'docs' } });

  await expectDocumented(base, 'PUT', '/files/{path}', '/files/docs/notes.txt', { auth: memberSession.token, text: 'hello' });
  await expectDocumented(base, 'GET', '/files/{path}', '/files/docs/notes.txt', { auth: memberSession.token });
  await expectDocumented(base, 'GET', '/files/{path}', '/files/docs', { auth: memberSession.token });
  await expectDocumented(base, 'GET', '/files/{path}', '/files/docs/notes.txt');
  await expectDocumented(base, 'GET', '/files/{path}', '/files/missing.txt', { auth: memberSession.token });

  await expectDocumented(base, 'PUT', '/files/{path}', '/files/docs/bad.txt', { auth: memberSession.token, bytes: [0xff, 0xfe] });
  await expectDocumented(base, 'PUT', '/files/{path}', '/files/docs/notes.txt', { text: 'hello' });
  await expectDocumented(base, 'PUT', '/files/{path}', '/files/nope/x.txt', { auth: memberSession.token, text: 'x' });
  await expectDocumented(base, 'PUT', '/files/{path}', '/files/docs', { auth: memberSession.token, text: 'x' });
  await expectDocumented(base, 'PUT', '/files/{path}', '/files/docs/big.txt', { auth: memberSession.token, text: 'x'.repeat(65537) });

  await expectDocumented(base, 'POST', '/folder', '/folder', { auth: memberSession.token, json: { path: 'gone' } });
  await expectDocumented(base, 'DELETE', '/files/{path}', '/files/docs/notes.txt', { auth: memberSession.token });
  await expectDocumented(base, 'DELETE', '/files/{path}', '/files/gone', { auth: memberSession.token });
  await expectDocumented(base, 'DELETE', '/files/{path}', '/files/docs/notes.txt');
  await expectDocumented(base, 'DELETE', '/files/{path}', '/files/missing.txt', { auth: memberSession.token });
  await expectDocumented(base, 'PUT', '/files/{path}', '/files/docs/notes.txt', { auth: memberSession.token, text: 'hello again' });
  await expectDocumented(base, 'DELETE', '/files/{path}', '/files/docs', { auth: memberSession.token });

  const sessionB = (await call(base, '/sessions', { method: 'POST', auth: admin.key })).body;
  await expectDocumented(base, 'DELETE', '/sessions/{id}', `/sessions/${sessionB.id}`, { auth: sessionB.token });
  await expectDocumented(base, 'DELETE', '/sessions/{id}', `/sessions/${adminSession.id}`);
  await expectDocumented(base, 'DELETE', '/sessions/{id}', `/sessions/${adminSession.id}`, { auth: memberSession.token });
  await expectDocumented(base, 'DELETE', '/sessions/{id}', '/sessions/00000000-0000-0000-0000-000000000000', { auth: adminSession.token });

  const patchTargets = [
    ['/status', '/status'],
    ['/sessions', '/sessions'],
    ['/sessions/{id}', `/sessions/${adminSession.id}`],
    ['/invitations', '/invitations'],
    ['/accounts', '/accounts'],
    ['/profile', '/profile'],
    ['/files', '/files'],
    ['/files/{path}', '/files/docs/notes.txt'],
    ['/folder', '/folder'],
  ];
  const errorSchema = doc.components.schemas.Error;
  for (const [template, concrete] of patchTargets) {
    const result = await call(base, concrete, { method: 'PATCH', auth: memberSession.token });
    assert.equal(result.status, 405, `PATCH ${template} must answer 405, got ${result.status}`);
    const problems = validate(doc, errorSchema, result.body, `PATCH ${template} 405`);
    assert.deepEqual(problems, [], `PATCH ${template} 405 body failed the Error schema`);
    const contentType = result.headers.get('content-type') || '';
    assert.ok(contentType.startsWith('application/json'), `PATCH ${template} 405: expected a JSON content type, got ${contentType}`);
  }

  assert.deepEqual(Object.keys(exercised).sort(), Object.keys(documented).sort(), 'every documented operation must be exercised');
  let total = 0;
  for (const [key, statuses] of Object.entries(documented)) {
    const ran = exercised[key] ? [...exercised[key]].sort() : [];
    assert.deepEqual(ran, Object.keys(statuses).sort(), `${key}: every documented response status must be exercised`);
    total += ran.length;
  }
  assert.equal(total, 40, 'expected 40 documented responses');
  console.log(`contract: ${Object.keys(documented).length} operations, ${total} documented responses exercised`);
});
