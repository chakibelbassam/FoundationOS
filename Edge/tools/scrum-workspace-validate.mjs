import fs from 'node:fs';
import path from 'node:path';
import { markdownRefusal } from './markdown.ts';
import { root } from './scrum-workspace-storage.mjs';

const groups = { PI: 'increments', S: 'sprints', WI: 'work-items' };
const kinds = { PI: 'pi', S: 'sprint', WI: 'item' };
const recordId = /^(PI-\d{2}|S-\d{2}-\d+|WI-\d{3,})$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const relativeDocument = /^(drafts|PI-\d{2})\/([a-z0-9]+(?:-[a-z0-9]+)*\.md)$/;
const statuses = ['proposed', 'ready', 'active', 'review', 'done'];
const types = ['feature', 'enhancement', 'bug', 'enabler', 'task'];
const purposes = ['requirement', 'investigation', 'decision', 'handoff'];
const noteKinds = ['progress', 'blocker', 'decision', 'investigation', 'handoff'];
const maxReported = 200;

function isDirectory(pathname) {
  const info = fs.lstatSync(pathname, { throwIfNoEntry: false });
  return Boolean(info?.isDirectory());
}

function isFile(pathname) {
  const info = fs.lstatSync(pathname, { throwIfNoEntry: false });
  return Boolean(info?.isFile());
}

export function validate() {
  const errors = [];
  const warnings = [];
  const counts = { records: 0, notes: 0, links: 0, documents: 0, receipts: 0 };
  const records = new Map();
  const seen = new Map();

  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const error = (file, message) => errors.push({ path: relative(file), message });
  const warning = (file, message) => warnings.push({ path: relative(file), message });

  function checkMarkdown(value, label, file) {
    if (typeof value !== 'string' || !value.trim()) {
      error(file, label + ' must be non-empty text');
      return;
    }
    const refusal = markdownRefusal(value);
    if (refusal) error(file, label + ': ' + refusal);
  }

  function readJson(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (failure) {
      error(file, 'Invalid JSON: ' + failure.message);
      return null;
    }
  }

  function jsonFiles(directory) {
    if (!isDirectory(directory)) return [];
    return fs.readdirSync(directory).filter(name => name.endsWith('.json')).sort()
      .map(name => path.join(directory, name));
  }

  function checkDocumentPath(relativePath, file, label) {
    const match = relativeDocument.exec(relativePath);
    if (!match || match[2].length > 83 || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])\.md$/i.test(match[2])) {
      error(file, label + ' is not a canonical drafts/ or PI-##/ Markdown path: ' + relativePath);
      return null;
    }
    return match;
  }

  function documentExists(relativePath) {
    const match = relativeDocument.exec(relativePath);
    if (!match) return false;
    return isFile(path.join(root, 'documents', match[1], match[2]));
  }

  function checkRecord(record, file, group) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      error(file, 'Record must be a JSON object');
      return null;
    }
    if (typeof record.id !== 'string' || !recordId.test(record.id)) {
      error(file, 'Invalid record ID');
      return null;
    }
    const prefix = record.id.split('-')[0];
    if (prefix !== group) error(file, 'Record ID does not belong in ' + groups[group]);
    if (record.kind !== kinds[prefix]) error(file, 'ID and kind disagree');
    if (record.kind !== kinds[group]) error(file, 'Record kind does not match its folder');
    if (!Number.isSafeInteger(record.revision) || record.revision < 1) {
      error(file, 'revision must be an integer of at least one');
    }
    checkMarkdown(record.title, 'title', file);
    checkMarkdown(record.acceptance, 'acceptance', file);
    if (!statuses.includes(record.status)) error(file, 'Invalid status ' + record.status);
    if (record.evidence !== undefined) checkMarkdown(record.evidence, 'evidence', file);
    if ((record.status === 'review' || record.status === 'done') && !record.evidence) {
      error(file, 'review and done records require evidence');
    }
    const allowed = new Set(['id', 'kind', 'title', 'acceptance', 'status', 'revision', 'evidence']);
    if (record.kind === 'sprint') allowed.add('parent');
    if (record.kind === 'item') {
      for (const key of ['parent', 'type', 'priority', 'effort', 'severity']) allowed.add(key);
      if (!types.includes(record.type)) error(file, 'Invalid work-item type ' + record.type);
      if (!Number.isSafeInteger(record.priority) || record.priority < 1 || record.priority > 5) {
        error(file, 'priority must be 1 through 5');
      }
      if (!Number.isSafeInteger(record.effort) || record.effort < 2 || record.effort > 5) {
        error(file, 'effort must be 2 through 5');
      }
      if (record.severity !== undefined) {
        if (record.type !== 'bug') error(file, 'Only bugs carry severity');
        if (!/^Sev-[1-5]$/.test(record.severity)) error(file, 'severity must be Sev-1 through Sev-5');
      }
    }
    for (const key of Object.keys(record)) {
      if (!allowed.has(key)) error(file, 'Unknown field ' + key);
    }
    if (record.kind === 'pi' && record.parent !== undefined) error(file, 'A PI cannot have a parent');
    if (record.kind !== 'pi' && typeof record.parent !== 'string') error(file, 'Missing parent');
    counts.records++;
    const previous = seen.get(record.id) ?? [];
    previous.push(file);
    seen.set(record.id, previous);
    if (!records.has(record.id)) records.set(record.id, { record, file });
    return record;
  }

  if (!isDirectory(root)) {
    return {
      root,
      ok: false,
      errors: [{ path: '.', message: 'Scrum workspace is unavailable' }],
      warnings,
      counts
    };
  }

  for (const [group, directory] of Object.entries(groups)) {
    for (const file of jsonFiles(path.join(root, directory))) {
      const record = readJson(file);
      if (record) checkRecord(record, file, group);
    }
  }
  for (const file of jsonFiles(root)) {
    const record = readJson(file);
    if (!record) continue;
    const prefix = typeof record.id === 'string' ? record.id.split('-')[0] : '';
    if (!groups[prefix]) {
      error(file, 'Legacy record has an unrecognised ID');
      continue;
    }
    checkRecord(record, file, prefix);
  }

  for (const [id, files] of seen) {
    if (files.length > 1) {
      for (const file of files) error(file, 'Duplicate stored record ' + id);
    }
  }

  for (const [id, { record, file }] of records) {
    if (record.kind === 'pi') continue;
    const parent = records.get(record.parent)?.record;
    if (!parent) {
      error(file, 'Unknown parent ' + record.parent);
      continue;
    }
    if (record.kind === 'sprint') {
      if (parent.kind !== 'pi') error(file, 'Sprint parent must be a PI');
      if (record.id.split('-')[1] !== parent.id.slice(3)) error(file, 'Sprint ID belongs to another PI');
    } else if (parent.kind !== 'sprint') {
      error(file, 'Work-item parent must be a sprint');
    }
    if (parent.status === 'done' && record.status !== 'done') {
      warning(file, 'Accepted parent ' + parent.id + ' closes this scope');
    }
  }

  const notesDirectory = path.join(root, 'notes');
  for (const file of jsonFiles(notesDirectory)) {
    const id = path.basename(file, '.json');
    if (!records.has(id)) warning(file, 'Note journal has no matching record');
    const journal = readJson(file);
    if (!Array.isArray(journal)) {
      error(file, 'Note journal must be an array');
      continue;
    }
    const noteIds = new Set();
    for (const [index, entry] of journal.entries()) {
      if (!entry || typeof entry !== 'object' || !entry.submitted || !entry.note) {
        error(file, 'Note entry ' + index + ' is malformed');
        continue;
      }
      const { submitted, note } = entry;
      if (typeof note.id !== 'string' || !uuid.test(note.id)) {
        error(file, 'Note entry ' + index + ' has an invalid ID');
        continue;
      }
      if (noteIds.has(note.id)) error(file, 'Duplicate note ID ' + note.id);
      if (submitted.requestId !== note.id) error(file, 'Note request ID and note ID disagree');
      if (submitted.id !== id || note.recordId !== id) error(file, 'Note belongs to another record');
      if (!noteKinds.includes(note.kind) || submitted.kind !== note.kind) {
        error(file, 'Note entry ' + index + ' has an invalid kind');
      }
      checkMarkdown(note.body, 'note body', file);
      if (submitted.body !== note.body) error(file, 'Note body and submission disagree');
      if (note.supersedes !== undefined && !noteIds.has(note.supersedes)) {
        error(file, 'Note supersedes an unknown earlier note');
      }
      if (note.documentRefs !== undefined) {
        if (!Array.isArray(note.documentRefs) || note.documentRefs.length > 8) {
          error(file, 'Note document references must be an array of at most eight paths');
        } else {
          for (const reference of note.documentRefs) {
            if (typeof reference !== 'string' || !checkDocumentPath(reference, file, 'note reference')) continue;
            if (!documentExists(reference)) warning(file, 'Note references missing document ' + reference);
          }
        }
      }
      noteIds.add(note.id);
      counts.notes++;
    }
  }

  const linksDirectory = path.join(root, 'links');
  for (const file of jsonFiles(linksDirectory)) {
    const id = path.basename(file, '.json');
    const item = records.get(id)?.record;
    if (!item) {
      warning(file, 'Knowledge links have no matching record');
      continue;
    }
    if (item.kind !== 'item') error(file, 'Knowledge links require a work item');
    const links = readJson(file);
    if (!links || typeof links !== 'object' || Array.isArray(links)) {
      error(file, 'Knowledge links must be an object');
      continue;
    }
    if (!Number.isSafeInteger(links.revision) || links.revision < 0) {
      error(file, 'Knowledge link revision must be a non-negative integer');
    }
    if (!Array.isArray(links.references)) {
      error(file, 'Knowledge references must be an array');
      continue;
    }
    if (links.references.length > 32) error(file, 'A work item can link up to 32 documents');
    const identities = new Set();
    for (const reference of links.references) {
      if (!reference || typeof reference !== 'object') {
        error(file, 'Malformed knowledge reference');
        continue;
      }
      if (typeof reference.relativePath !== 'string' || !checkDocumentPath(reference.relativePath, file, 'knowledge reference')) continue;
      if (!purposes.includes(reference.purpose)) error(file, 'Invalid knowledge purpose ' + reference.purpose);
      const identity = reference.relativePath + '|' + reference.purpose;
      if (identities.has(identity)) warning(file, 'Duplicate knowledge reference ' + identity);
      identities.add(identity);
      if (!documentExists(reference.relativePath)) warning(file, 'Knowledge reference is missing ' + reference.relativePath);
      counts.links++;
    }
  }

  const documentsDirectory = path.join(root, 'documents');
  if (fs.lstatSync(documentsDirectory, { throwIfNoEntry: false }) && !isDirectory(documentsDirectory)) {
    error(documentsDirectory, 'documents must be a directory');
  } else if (isDirectory(documentsDirectory)) {
    for (const scope of fs.readdirSync(documentsDirectory).sort()) {
      const scopeDirectory = path.join(documentsDirectory, scope);
      if (!isDirectory(scopeDirectory)) {
        error(scopeDirectory, 'Document scope must be a directory');
        continue;
      }
      if (scope !== 'drafts' && !/^PI-\d{2}$/.test(scope)) {
        error(scopeDirectory, 'Document scope must be drafts or a PI ID');
        continue;
      }
      if (scope !== 'drafts' && !records.has(scope)) error(scopeDirectory, 'Document scope has no matching PI');
      for (const name of fs.readdirSync(scopeDirectory).sort()) {
        const file = path.join(scopeDirectory, name);
        if (!name.endsWith('.md')) {
          warning(file, 'Unexpected file in document scope');
          continue;
        }
        const relativePath = scope + '/' + name;
        if (!checkDocumentPath(relativePath, file, 'document')) continue;
        if (!isFile(file)) {
          error(file, 'Document must be a file');
          continue;
        }
        const contents = fs.readFileSync(file, 'utf8');
        const header = /^---\r?\nrevision: ([1-9]\d*)\r?\n---\r?\n/.exec(contents);
        if (!header) {
          error(file, 'Document is missing a positive revision header');
          continue;
        }
        const body = contents.slice(header[0].length);
        checkMarkdown(body, 'document body', file);
        counts.documents++;
      }
    }
  }

  const receiptsDirectory = path.join(root, 'receipts');
  for (const file of jsonFiles(receiptsDirectory)) {
    const name = path.basename(file, '.json');
    if (!uuid.test(name)) {
      error(file, 'Receipt filename must be a UUID');
      continue;
    }
    const receipt = readJson(file);
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
      error(file, 'Receipt must be an object');
      continue;
    }
    if (receipt.requestId !== name) error(file, 'Receipt request ID and filename disagree');
    if (!['create', 'update'].includes(receipt.operation)) error(file, 'Receipt operation must be create or update');
    if (typeof receipt.id !== 'string' || !recordId.test(receipt.id)) error(file, 'Receipt has an invalid record ID');
    if (!receipt.submitted || typeof receipt.submitted !== 'object') error(file, 'Receipt is missing submitted arguments');
    if (!receipt.result || typeof receipt.result !== 'object') error(file, 'Receipt is missing its result');
    if (typeof receipt.at !== 'string') error(file, 'Receipt is missing its timestamp');
    if (receipt.id && !records.has(receipt.id)) warning(file, 'Receipt record no longer exists');
    counts.receipts++;
  }

  if (fs.lstatSync(path.join(root, '.write.lockdir'), { throwIfNoEntry: false })) {
    warning(path.join(root, '.write.lockdir'), 'A write lock is present; confirm its writer has exited before removing it');
  }

  const limit = rows => rows.length > maxReported
    ? [...rows.slice(0, maxReported), { path: '.', message: 'Report truncated at ' + maxReported + ' entries' }]
    : rows;
  return {
    root,
    ok: errors.length === 0,
    errors: limit(errors),
    warnings: limit(warnings),
    counts
  };
}

export const validateTool = {
  name: 'validate',
  description: 'Read-only validation of the current scrumWorkspace store. Returns errors, warnings and counts; it never changes records and never implies acceptance.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }
};
