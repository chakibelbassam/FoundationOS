import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { markdownRefusal } from './markdown.ts';

import { artifactTools } from './scrum-workspace-artifacts.mjs';
import { manualAction, manualTool } from './scrum-workspace-manual.mjs';
import { receiptAction, receiptTool, recoverReceipt, writeReceipt } from './scrum-workspace-receipts.mjs';
import { checkFields, isStored, requireRevision, root, schema, withWriteLock, writeJson } from './scrum-workspace-storage.mjs';
import { validate, validateTool } from './scrum-workspace-validate.mjs';
const groups = { PI: 'increments', S: 'sprints', WI: 'work-items' };
const kinds = { PI: 'pi', S: 'sprint', WI: 'item' };
const recordId = /^(PI-\d{2}|S-\d{2}-\d+|WI-\d{3,})$/;
const properties = {
  id: { type: 'string', description: 'PI-01, S-01-1 or WI-001' },
  kind: { type: 'string', enum: ['pi', 'sprint', 'item'] },
  parent: { type: 'string', description: 'PI ID for a sprint, or sprint ID for a work item' },
  title: { type: 'string' },
  acceptance: { type: 'string' },
  effort: { type: 'integer', minimum: 2, maximum: 5, description: 'Ef-2 through Ef-5. Split Ef-1.' },
  priority: { type: 'integer', minimum: 1, maximum: 5, description: 'P-1 is highest, P-5 is lowest' },
  severity: { type: 'string', description: 'Bug severity from Sev-1 (highest impact) to Sev-5. Proposed changes need written evidence.' },
  type: { type: 'string', enum: ['feature', 'enhancement', 'bug', 'enabler', 'task'] },
  status: { type: 'string', enum: ['proposed', 'ready', 'active', 'review', 'done'] },
  evidence: { type: 'string' },
  revision: { type: 'integer', minimum: 0 }
};

const planningTransitions = { proposed: ['ready'], ready: ['proposed'] };
const itemTransitions = {
  ...planningTransitions,
  ready: ['proposed', 'active'],
  active: ['ready', 'review'],
  review: ['active']
};
const editable = Object.fromEntries(
  Object.entries(properties).filter(([key]) => !['id', 'revision', 'kind'].includes(key))
);
const clearable = ['evidence', 'severity'];
const filters = {
  kind: properties.kind, status: properties.status, parent: properties.parent,
  id: properties.id, pi: properties.id, sprint: { type: 'integer', minimum: 1 },
  type: properties.type, priority: properties.priority, text: { type: 'string' },
  limit: { type: 'integer', minimum: 1, maximum: 200 }, offset: { type: 'integer', minimum: 0 }
};

const requiredRecord = ['id', 'kind', 'title', 'acceptance', 'status', 'revision'];
const updateFields = {
  id: properties.id,
  revision: properties.revision,
  changes: schema(editable),
  clear: {
    type: 'array', items: { type: 'string', enum: clearable },
    minItems: 1, maxItems: clearable.length, uniqueItems: true,
    description: 'Optional fields to remove. Omit their setters in changes.'
  }
};
const requiredUpdate = ['id', 'revision'];
const requestIdField = {
  type: 'string',
  description: 'Optional UUID. Repeat the same call with the same fields to recover a lost response.'
};
const createInput = { ...properties, requestId: requestIdField };
const updateInput = { ...updateFields, requestId: requestIdField };
const artifacts = artifactTools(read, checkArtifactScope);
const tools = [
  manualTool,
  {
    name: 'query',
    description: 'Read one exact ID, list by kind/status/type/priority/text/parent, or query a PI and its descendants. Use pi and numeric sprint to get the sprint and its work items ordered by priority and ID. PI-00 is development setup, PI-01 is the first product increment. Paginate with offset and limit.',
    inputSchema: schema(filters)
  },
  {
    name: 'create',
    description: 'Create a proposed PI, sprint or work item at revision zero. A sprint needs a PI parent. An item needs a sprint parent, type, priority and effort. Supply an optional requestId UUID to recover a lost response by repeating the same call.',
    inputSchema: schema(createInput, requiredRecord)
  },
  {
    name: 'update',
    description: 'Query the record first, then send its exact revision and only the fields to change or clear. Other values stay in place. Owner approval controls PI and sprint activation and all final acceptance. Supply an optional requestId UUID to recover a lost response by repeating the same call.',
    inputSchema: schema(updateInput, requiredUpdate)
  },
  {
    name: 'save',
    description: 'Compatibility operation to save a complete record with its expected revision. Prefer create or update for new calls.',
    inputSchema: schema(properties, requiredRecord)
  },
  ...artifacts.tools,
  validateTool,
  receiptTool
];

function idPrefix(id) {
  if (typeof id !== 'string' || !recordId.test(id)) throw Error('Invalid record ID');
  return id.split('-')[0];
}

function locate(id) {
  const prefix = idPrefix(id);
  const directory = path.join(root, groups[prefix]);
  const grouped = path.join(directory, id + '.json');
  const legacy = path.join(root, id + '.json');
  const groupedExists = isStored(directory, 'directory') && isStored(grouped, 'file');
  const legacyExists = isStored(legacy, 'file');
  if (groupedExists && legacyExists) throw Error('Duplicate Scrum storage for ' + id);
  return { file: legacyExists ? legacy : grouped, exists: legacyExists || groupedExists };
}

function readFile(id, file) {
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (record?.id !== id || record.kind !== kinds[idPrefix(id)] ||
      !Number.isSafeInteger(record.revision) || record.revision < 1) {
    throw Error('Invalid stored record ' + id);
  }
  return record;
}

function read(id) {
  const { file, exists } = locate(id);
  if (!exists) throw Error('Unknown record ' + id);
  return readFile(id, file);
}

function checkArtifactScope(record) {
  if (record.status === 'done') throw Error('Accepted records and their workspace are owner-controlled');
  if (record.kind !== 'pi') checkParent(record, record);
}

function checkParent(record, previous) {
  if (record.kind === 'pi') {
    if (record.parent !== undefined) throw Error('A PI cannot have a parent');
    return;
  }
  if (record.parent === undefined) throw Error('Missing parent for ' + record.id);
  const parent = read(record.parent);
  const expectedKind = record.kind === 'sprint' ? 'pi' : 'sprint';
  if (parent.kind !== expectedKind) throw Error('Invalid parent kind, expected ' + expectedKind);
  if (record.kind === 'sprint' && record.id.split('-')[1] !== parent.id.slice(3)) {
    throw Error('Sprint ID belongs to another PI');
  }
  const pi = parent.kind === 'sprint' ? read(parent.parent) : parent;
  if (pi.kind !== 'pi') throw Error('Sprint parent is not a PI');
  if (parent.status === 'done' || pi.status === 'done') {
    throw Error('An accepted parent closes its scope to agent edits');
  }
  if (previous && previous.parent !== record.parent &&
      (previous.status !== 'proposed' || record.status !== 'proposed')) {
    throw Error('Only proposed work can move between sprints');
  }
  if ((!previous || previous.parent !== record.parent) && parent.status === 'review') {
    throw Error('The parent is already in review');
  }
}

function checkLifecycle(record, previous) {
  if (previous?.status === 'done' || record.status === 'done') {
    throw Error('Final acceptance and accepted records are owner-controlled');
  }
  if (!previous && record.status !== 'proposed') throw Error('Create new work as proposed');
  if (previous && record.status !== previous.status) {
    const allowed = record.kind === 'item' ? itemTransitions : planningTransitions;
    if (!allowed[previous.status]?.includes(record.status)) {
      throw Error('Invalid agent transition from ' + previous.status + ' to ' + record.status);
    }
  }
  if (record.status === 'review' && !record.evidence) throw Error('Review requires evidence');
}

function checkSeverity(record, previous) {
  if (record.severity && record.type !== 'bug') throw Error('Only bugs carry severity');
  if (record.severity === previous?.severity) return;
  if (!record.severity) {
    if (record.status !== 'proposed') throw Error('Setting or clearing triaged severity is owner-controlled');
    return;
  }
  const value = /^Sev[- ]([1-5])$/.exec(record.severity)?.[1];
  const old = /^Sev[- ]([1-5])$/.exec(previous?.severity ?? '')?.[1];
  if (!value) throw Error('Use Sev-1 through Sev-5 for bug severity');
  if ((old && Number(value) < Number(old)) || (!old && record.status !== 'proposed')) {
    throw Error('Raising or setting triaged severity is owner-controlled');
  }
  if (!record.evidence) throw Error('Explain a proposed severity change in evidence');
}
function checkRecord(record, previous) {
  checkFields(record, properties, requiredRecord);
  if (record.kind !== kinds[idPrefix(record.id)]) throw Error('ID and kind disagree');
  for (const key of ['title', 'acceptance', 'evidence', 'severity']) {
    const refusal = record[key] && markdownRefusal(record[key]);
    if (refusal) throw Error('Invalid Markdown in ' + key + ': ' + refusal);
  }
  const itemFields = ['type', 'effort', 'priority'];
  if (record.kind === 'item') {
    if (itemFields.some(key => !Object.hasOwn(record, key))) {
      throw Error('A work item needs type, priority and effort');
    }
  } else if ([...itemFields, 'severity'].some(key => Object.hasOwn(record, key))) {
    throw Error('Type, effort, priority and severity are work item fields');
  }
  checkSeverity(record, previous);
  checkLifecycle(record, previous);
  if (previous && previous.parent !== record.parent) checkParent(previous, previous);
  checkParent(record, previous);
}

function validateMutation(operation, args) {
  if (operation !== 'update') {
    checkFields(args, properties, requiredRecord);
    if (operation === 'create' && args.revision !== 0) throw Error('Create requires revision zero');
    return;
  }
  checkFields(args, updateFields, requiredUpdate);
  const { changes = {}, clear = [] } = args;
  checkFields(changes, editable);
  if (args.clear !== undefined && (
    !clear.length || clear.length > clearable.length || new Set(clear).size !== clear.length ||
    clear.some(key => !clearable.includes(key) || Object.hasOwn(changes, key))
  )) {
    throw Error('Clear unique optional fields and omit their setters: ' + clearable.join(', '));
  }
  if (!Object.keys(changes).length && !clear.length) throw Error('Supply fields to change or clear');
}

function updateRecord(previous, args) {
  const record = { ...previous, ...args.changes };
  for (const key of args.clear ?? []) delete record[key];
  return record;
}

function mutate(operation, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Expected an object');
  const { requestId, ...args } = input;
  if (requestId !== undefined && !['create', 'update'].includes(operation)) {
    throw Error('requestId is only supported for create and update');
  }
  validateMutation(operation, args);
  idPrefix(args.id);
  return withWriteLock(() => {
    if (requestId !== undefined) {
      const saved = recoverReceipt({ requestId, operation, id: args.id, submitted: args });
      if (saved) return saved;
    }
    const { file, exists } = locate(args.id);
    const previous = exists ? readFile(args.id, file) : null;
    if (operation === 'create' && previous) throw Error('Already exists. Query ' + args.id);
    if (operation === 'update' && !previous) throw Error('Unknown record ' + args.id);
    requireRevision(previous?.revision ?? 0, args.revision, args.id);

    const record = operation === 'update' ? updateRecord(previous, args) : args;
    checkRecord(record, previous);
    let result = previous;
    if (!(previous && Object.keys(record).length === Object.keys(previous).length &&
        Object.entries(record).every(([key, value]) => previous[key] === value))) {
      result = { ...record, revision: args.revision + 1 };
      writeJson(file, result);
    }
    if (requestId !== undefined) {
      writeReceipt({ requestId, operation, id: args.id, submitted: args, result });
    }
    return result;
  });
}

function idsIn(directory, group) {
  if (!isStored(directory, 'directory')) return [];
  return fs.readdirSync(directory)
    .filter(name => name.endsWith('.json'))
    .map(name => name.slice(0, -5))
    .filter(id => recordId.test(id) && (!group || idPrefix(id) === group));
}

function all() {
  const ids = new Set([
    ...idsIn(root),
    ...Object.entries(groups).flatMap(([group, directory]) => idsIn(path.join(root, directory), group))
  ]);
  return [...ids].map(read);
}

function query(input) {
  checkFields(input, filters);
  if (!isStored(root, 'directory')) throw Error('Scrum storage is unavailable');
  if (input.id) {
    if (Object.keys(input).length !== 1) throw Error('Use id alone for a record lookup');
    return read(input.id);
  }
  if (input.parent) idPrefix(input.parent);
  if (input.sprint && !input.pi) throw Error('Specify the PI for a sprint number');
  const pi = input.pi ? read(input.pi) : null;
  if (pi && pi.kind !== 'pi') throw Error('Expected a PI record');
  const sprint = input.sprint ? read('S-' + pi.id.slice(3) + '-' + input.sprint) : null;
  if (sprint && sprint.parent !== pi.id) throw Error('Sprint does not belong to ' + pi.id);

  const rows = all();
  const sprintIds = new Set(
    rows.filter(row => pi && row.parent === pi.id && row.kind === 'sprint').map(row => row.id)
  );
  const text = input.text?.trim().toLowerCase();
  const found = rows.filter(row =>
    (!sprint || row.parent === sprint.id) &&
    (!pi || row.id === pi.id || row.parent === pi.id || sprintIds.has(row.parent)) &&
    ['parent', 'kind', 'status', 'priority', 'type'].every(key =>
      input[key] === undefined || row[key] === input[key]
    ) &&
    (!text || [row.id, row.title, row.acceptance].join(' ').toLowerCase().includes(text))
  );
  if (sprint) {
    found.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, 'en', { numeric: true }));
    const offset = input.offset ?? 0;
    const items = found.slice(offset, offset + (input.limit ?? 200));
    const nextOffset = offset + items.length < found.length ? offset + items.length : null;
    return { sprint, total: found.length, items, offset, nextOffset };
  }
  // The original ID, parent and unfiltered queries return a record or array.
  found.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  if (input.offset === undefined && input.limit === undefined && Object.keys(input).every(key => key === 'parent')) {
    return found;
  }
  const start = input.offset ?? 0;
  return found.slice(start, start + (input.limit ?? 200));
}

export function action(name, args) {
  if (name === 'manual') return manualAction(args);
  if (name === 'validate') {
    checkFields(args, {});
    return validate();
  }
  if (name === 'receipt') return receiptAction(args);
  if (name === 'query') return query(args);
  if (['create', 'update', 'save'].includes(name)) return mutate(name, args);
  if (Object.hasOwn(artifacts.actions, name)) {
    if (!isStored(root, 'directory')) throw Error('Scrum workspace is unavailable');
    return artifacts.actions[name](args);
  }
  throw Error('Unknown tool ' + name);
}

export async function runCli() {
  if (process.argv[2]) {
    try {
      const json = process.argv[3] === '-' ? fs.readFileSync(0, 'utf8') : process.argv[3] ?? '{}';
      console.log(JSON.stringify(action(process.argv[2], JSON.parse(json)), null, 2));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  } else {
    for await (const line of createInterface({ input: process.stdin })) {
      let message;
      try {
        message = JSON.parse(line);
        if (message.id === undefined) continue;
        let result;
        if (message.method === 'initialize') {
          result = {
            protocolVersion: message.params.protocolVersion,
            capabilities: { tools: {} },
            serverInfo: { name: 'scrumWorkSpace', version: '0.3' }
          };
        } else if (message.method === 'ping') {
          result = {};
        } else if (message.method === 'tools/list') {
          result = { tools };
        } else if (message.method === 'tools/call') {
          try {
            const value = action(message.params.name, message.params.arguments ?? {});
            result = { content: [{ type: 'text', text: JSON.stringify(value) }] };
          } catch (error) {
            result = { isError: true, content: [{ type: 'text', text: error.message }] };
          }
        } else {
          console.log(JSON.stringify({
            jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Unknown method' }
          }));
          continue;
        }
        console.log(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }));
      } catch (error) {
        console.log(JSON.stringify({
          jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: error.message }
        }));
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
