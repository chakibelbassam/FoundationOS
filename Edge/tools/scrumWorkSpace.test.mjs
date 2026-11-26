import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foundationos-scrum-'));
process.env.FOUNDATIONOS_SCRUM_ROOT = testRoot;

const { action } = await import('./scrumWorkSpace.mjs');

beforeEach(() => {
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(testRoot, { recursive: true });
});

after(() => {
  fs.rmSync(testRoot, { recursive: true, force: true });
});

function createBase() {
  action('create', {
    id: 'PI-00', kind: 'pi', targetVersion: 'none', title: 'Setup', acceptance: 'Setup acceptance',
    status: 'proposed', revision: 0
  });
  action('create', {
    id: 'S-00-1', kind: 'sprint', parent: 'PI-00', title: 'Setup sprint',
    acceptance: 'Sprint acceptance', status: 'proposed', revision: 0
  });
  action('create', {
    id: 'WI-001', kind: 'item', parent: 'S-00-1', title: 'First item',
    acceptance: 'Item acceptance', status: 'proposed', revision: 0,
    type: 'task', priority: 1, effort: 3
  });
}

test('creates and queries records', () => {
  createBase();
  assert.equal(action('query', { id: 'WI-001' }).revision, 1);
  const page = action('query', { pi: 'PI-00', sprint: 1 });
  assert.equal(page.sprint.id, 'S-00-1');
  assert.equal(page.total, 1);
  assert.equal(page.items[0].id, 'WI-001');
  assert.equal(action('query', { kind: 'item', status: 'proposed' }).length, 1);
  assert.equal(action('query', { text: 'first' }).length, 1);
  assert.equal(action('query', { priority: 1 }).length, 1);
});

test('refuses a stale revision', () => {
  createBase();
  action('update', { id: 'WI-001', revision: 1, changes: { title: 'Renamed' } });
  assert.throws(
    () => action('update', { id: 'WI-001', revision: 1, changes: { title: 'Again' } }),
    /revision changed/
  );
});

test('enforces the item lifecycle and evidence', () => {
  createBase();
  assert.throws(
    () => action('update', { id: 'WI-001', revision: 1, changes: { status: 'active' } }),
    /Invalid agent transition/
  );
  action('update', { id: 'WI-001', revision: 1, changes: { status: 'ready' } });
  action('update', { id: 'WI-001', revision: 2, changes: { status: 'active' } });
  assert.throws(
    () => action('update', { id: 'WI-001', revision: 3, changes: { status: 'review' } }),
    /Review and done records require evidence/
  );
  action('update', {
    id: 'WI-001', revision: 3, changes: { status: 'review', evidence: 'Verified.' }
  });
  action('update', { id: 'WI-001', revision: 4, changes: { status: 'done' } });
  assert.equal(action('query', { id: 'WI-001' }).status, 'done');
  action('update', { id: 'WI-001', revision: 5, changes: { status: 'review' } });
  assert.equal(action('query', { id: 'WI-001' }).status, 'review');
});

test('enforces parentage', () => {
  assert.throws(
    () => action('create', {
      id: 'S-01-1', kind: 'sprint', parent: 'PI-01', title: 'Missing parent',
      acceptance: 'Acceptance', status: 'proposed', revision: 0
    }),
    /Unknown record/
  );
  createBase();
  assert.throws(
    () => action('create', {
      id: 'S-01-1', kind: 'sprint', parent: 'PI-00', title: 'Wrong PI',
      acceptance: 'Acceptance', status: 'proposed', revision: 0
    }),
    /Sprint ID belongs to another PI/
  );
  assert.throws(
    () => action('create', {
      id: 'WI-002', kind: 'item', parent: 'PI-00', title: 'Wrong parent',
      acceptance: 'Acceptance', status: 'proposed', revision: 0,
      type: 'task', priority: 1, effort: 3
    }),
    /Invalid parent kind/
  );
});

test('creates, reads and revises documents', () => {
  createBase();
  const created = action('documents', {
    action: 'create', relativePath: 'drafts/outline.md', revision: 0,
    body: '# Outline\n\n- First decision\n'
  });
  assert.equal(created.revision, 1);
  assert.equal(
    action('documents', { action: 'read', relativePath: 'drafts/outline.md' }).body,
    '# Outline\n\n- First decision\n'
  );
  assert.equal(action('documents', { action: 'list', scope: 'drafts' }).total, 1);
  const updated = action('documents', {
    action: 'update', relativePath: 'drafts/outline.md', revision: 1,
    body: '# Outline\n\n- Second decision\n'
  });
  assert.equal(updated.revision, 2);
  assert.throws(
    () => action('documents', {
      action: 'create', relativePath: 'drafts/outline.md', revision: 0, body: '# Again\n'
    }),
    /already exists/
  );
  assert.throws(
    () => action('documents', {
      action: 'create', relativePath: '../escape.md', revision: 0, body: '# Bad\n'
    }),
    /canonical Markdown path/
  );
});

test('appends idempotent notes', () => {
  createBase();
  const requestId = randomUUID();
  const first = action('notes', {
    action: 'append', id: 'WI-001', revision: 1, requestId,
    kind: 'progress', body: 'Started.'
  });
  assert.equal(first.id, requestId.toLowerCase());
  const replay = action('notes', {
    action: 'append', id: 'WI-001', revision: 1, requestId,
    kind: 'progress', body: 'Started.'
  });
  assert.deepEqual(replay, first);
  assert.throws(
    () => action('notes', {
      action: 'append', id: 'WI-001', revision: 1, requestId,
      kind: 'progress', body: 'Different.'
    }),
    /already used/
  );
  const read = action('notes', { action: 'read', id: 'WI-001' });
  assert.equal(read.total, 1);
  assert.equal(read.items[0].body, 'Started.');
});

test('links documents to work items', () => {
  createBase();
  const document = action('documents', {
    action: 'create', relativePath: 'drafts/decision.md', revision: 0,
    body: '# Decision\n'
  });
  const linked = action('knowledge', {
    action: 'link', id: 'WI-001', revision: 1, referencesRevision: 0,
    relativePath: 'drafts/decision.md', purpose: 'decision',
    documentRevision: document.revision
  });
  assert.equal(linked.revision, 1);
  assert.equal(linked.references.length, 1);
  const read = action('knowledge', { action: 'read', id: 'WI-001' });
  assert.equal(read.references.length, 1);
  const backlinks = action('documents', {
    action: 'backlinks', relativePath: 'drafts/decision.md'
  });
  assert.equal(backlinks.total, 1);
  assert.equal(backlinks.items[0].id, 'WI-001');
  const unlinked = action('knowledge', {
    action: 'unlink', id: 'WI-001', revision: 1, referencesRevision: 1,
    relativePath: 'drafts/decision.md', purpose: 'decision'
  });
  assert.equal(unlinked.references.length, 0);
});

test('recovers create and update by requestId', () => {
  const createId = randomUUID();
  const created = action('create', {
    id: 'PI-00', kind: 'pi', targetVersion: 'none', title: 'Setup', acceptance: 'Setup acceptance',
    status: 'proposed', revision: 0, requestId: createId
  });
  assert.equal(created.revision, 1);
  const replay = action('create', {
    id: 'PI-00', kind: 'pi', targetVersion: 'none', title: 'Setup', acceptance: 'Setup acceptance',
    status: 'proposed', revision: 0, requestId: createId
  });
  assert.deepEqual(replay, created);
  assert.throws(
    () => action('create', {
      id: 'PI-00', kind: 'pi', targetVersion: 'none', title: 'Different', acceptance: 'Setup acceptance',
      status: 'proposed', revision: 0, requestId: createId
    }),
    /already used/
  );

  const updateId = randomUUID();
  const updated = action('update', {
    id: 'PI-00', revision: 1, changes: { title: 'Renamed' }, requestId: updateId
  });
  assert.equal(updated.revision, 2);
  const updateReplay = action('update', {
    id: 'PI-00', revision: 1, changes: { title: 'Renamed' }, requestId: updateId
  });
  assert.deepEqual(updateReplay, updated);
  const receipt = action('receipt', { requestId: updateId });
  assert.equal(receipt.found, true);
  assert.equal(receipt.result.revision, 2);
  const missingId = randomUUID();
  assert.deepEqual(action('receipt', { requestId: missingId }), {
    found: false, requestId: missingId.toLowerCase()
  });
});

test('validates a consistent store and reports broken records', () => {
  createBase();
  let report = action('validate', {});
  assert.equal(report.ok, true);
  assert.equal(report.counts.records, 3);

  fs.mkdirSync(path.join(testRoot, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(testRoot, 'notes', 'WI-999.json'), JSON.stringify([], null, 2));
  report = action('validate', {});
  assert.equal(report.ok, true);
  assert.ok(report.warnings.some(row => row.message.includes('no matching record')));

  fs.writeFileSync(path.join(testRoot, 'work-items', 'WI-999.json'), JSON.stringify({
    id: 'WI-999', kind: 'item', parent: 'S-00-1', title: 'Broken',
    acceptance: 'Broken', status: 'proposed', revision: 1,
    type: 'task', priority: 9, effort: 3
  }, null, 2));
  report = action('validate', {});
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(row => row.message.includes('priority')));
});

test('refuses writes while the lock is held', () => {
  createBase();
  fs.mkdirSync(path.join(testRoot, '.write.lockdir'));
  assert.throws(
    () => action('update', { id: 'WI-001', revision: 1, changes: { title: 'Blocked' } }),
    /busy/
  );
  fs.rmdirSync(path.join(testRoot, '.write.lockdir'));
});

test('rejects raw HTML in durable text', () => {
  assert.throws(
    () => action('create', {
      id: 'PI-00', kind: 'pi', targetVersion: 'none', title: '<script>alert(1)</script>',
      acceptance: 'Setup', status: 'proposed', revision: 0
    }),
    /HTML tags are not Markdown/
  );
  createBase();
  assert.throws(
    () => action('documents', {
      action: 'create', relativePath: 'drafts/bad.md', revision: 0,
      body: '# Bad\n\n<div>no</div>\n'
    }),
    /HTML tags are not Markdown/
  );
});

test('serves the manual index and topics', () => {
  const index = action('manual', { action: 'index' });
  assert.equal(index.name, 'scrumWorkSpace');
  assert.ok(index.topics.some(topic => topic.name === 'documents'));
  const topic = action('manual', { action: 'topic', topic: 'documents' });
  assert.equal(topic.topic, 'documents');
  assert.ok(topic.fields.action.includes('create'));
});

test('show this sprint: keep the item lifecycle and all five effort grades', () => {
  createBase();
  for (const effort of [1, 2, 3, 4, 5]) {
    const item = action('query', { id: 'WI-001' });
    action('update', { id: item.id, revision: item.revision, changes: { effort } });
    const bucket = action('query', { pi: 'PI-00', sprint: 1 });
    assert.equal(bucket.items[0].effort, effort);
    assert.equal(bucket.items.filter(row => row.status === 'done').length, 0);
    assert.equal(action('validate', {}).ok, true);
  }
  for (const effort of [0, 6]) {
    const item = action('query', { id: 'WI-001' });
    assert.throws(() => action('update', { id: item.id, revision: item.revision, changes: { effort } }));
  }
});

test('why this design: retrieve the cited requirement through the item link', () => {
  createBase();
  const relativePath = 'PI-00/design.md';
  const body = '# Design decision\n\nKeep one store so restarts preserve member homes.';
  action('documents', { action: 'create', relativePath, revision: 0, body });
  action('knowledge', { action: 'link', id: 'WI-001', revision: 1, referencesRevision: 0,
    relativePath, purpose: 'requirement', documentRevision: 1 });
  const [link] = action('knowledge', { action: 'read', id: 'WI-001' }).references;
  assert.equal(link.purpose, 'requirement');
  const doc = action('documents', { action: 'read', relativePath: link.relativePath });
  assert.ok(doc.body.includes('so restarts preserve member homes.'));
});

test('resume this item: replace stale handoff values with the current parent chain', () => {
  createBase();
  const handoff = { id: 'WI-001', revision: 1 };
  action('update', { ...handoff, changes: { status: 'ready' } });
  const item = action('query', { id: handoff.id });
  const sprint = action('query', { id: item.parent });
  const pi = action('query', { id: sprint.parent });
  assert.ok(item.revision > handoff.revision);
  assert.equal(item.status, 'ready');
  assert.equal(pi.targetVersion, 'none');
});

test('verify this PI: resolve from its record and refuse conflicting expectations', () => {
  const pi = { id: 'PI-09', kind: 'pi', title: 'Test release', acceptance: 'Launch', status: 'proposed', revision: 0 };
  assert.throws(() => action('create', pi), /targetVersion/);
  action('create', { ...pi, targetVersion: '0.1' });
  assert.throws(() => action('update', { id: pi.id, revision: 1, changes: { targetVersion: '0.2' } }), /owner decision/);
  const runner = fileURLToPath(new URL('./Run-EdgeTool.ps1', import.meta.url));
  const qa = fileURLToPath(new URL('./qa.py', import.meta.url));
  const resolve = expected => process.platform === 'win32'
    ? spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', runner, 'qa', pi.id, '-ResolveOnly', '-ExpectedVersion', expected], { encoding: 'utf8' })
    : spawnSync('python3', [qa, pi.id, '--resolve-only', '--expect-version', expected], { encoding: 'utf8' });
  const ok = resolve('0.1');
  assert.equal(ok.status, 0, ok.error?.message || ok.stderr);
  const context = JSON.parse(ok.stdout);
  assert.equal(context.piRevision, 1);
  assert.equal(context.targetVersion, '0.1');
  assert.equal(path.basename(context.launcher), 'Start.cmd');
  assert.match(context.sourceCommit, /^[0-9a-f]{40,64}$/);
  const conflict = resolve('0.2');
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /conflicts with the recorded v0.1/);
});
