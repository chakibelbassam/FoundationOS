import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { markdownRefusal } from './markdown.ts';
import {
  checkFields, isStored, requireRevision, root, schema, withWriteLock, writeAtomic, writeJson
} from './scrum-workspace-storage.mjs';

const string = { type: 'string' };
const integer = { type: 'integer', minimum: 0 };
const paging = { offset: integer, limit: { type: 'integer', minimum: 1, maximum: 50 } };
const documentPath = { type: 'string', description: 'Canonical path, for example drafts/outline.md or PI-01/server-plan.md' };
const purpose = { type: 'string', enum: ['requirement', 'investigation', 'decision', 'handoff'] };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const relativeDocument = /^(drafts|PI-\d{2})\/([a-z0-9]+(?:-[a-z0-9]+)*\.md)$/;
const noteKind = {
  type: 'string', enum: ['progress', 'blocker', 'decision', 'investigation', 'handoff']
};

function operations(definitions) {
  const fields = { action: { type: 'string', enum: Object.keys(definitions) } };
  for (const definition of Object.values(definitions)) Object.assign(fields, definition.fields);
  return {
    inputSchema: schema(fields, ['action']),
    run(input) {
      checkFields(input, { action: fields.action, ...fields }, ['action']);
      const definition = definitions[input.action];
      const { action, ...parameters } = input;
      checkFields(parameters, definition.fields, definition.required);
      return definition.run(parameters);
    }
  };
}

function page(rows, { offset = 0, limit = 20 }, projection = row => row) {
  const items = [];
  let bytes = 0;
  for (const row of rows.slice(offset, offset + limit)) {
    const item = projection(row);
    bytes += Buffer.byteLength(JSON.stringify(item));
    if (bytes > 65536) {
      if (!items.length) throw Error('One complete result exceeds the page budget');
      break;
    }
    items.push(item);
  }
  const nextOffset = offset + items.length;
  return { items, total: rows.length, offset, nextOffset: nextOffset < rows.length ? nextOffset : null };
}

function checkMarkdown(body) {
  const refusal = markdownRefusal(body);
  if (refusal) throw Error(refusal);
}

function sidecar(directory, id) {
  const folder = path.join(root, directory);
  isStored(folder, 'directory');
  return path.join(folder, id + '.json');
}

function sidecarData(file, initial) {
  return isStored(file, 'file') ? JSON.parse(fs.readFileSync(file, 'utf8')) : initial;
}

function documentLocation(relativePath) {
  const match = relativeDocument.exec(relativePath);
  if (!match || match[2].length > 83 || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])\.md$/i.test(match[2])) {
    throw Error('Use a canonical Markdown path under drafts/ or PI-##/.');
  }
  const [, scope, basename] = match;
  const docs = path.join(root, 'documents');
  const directory = path.join(docs, scope);
  isStored(docs, 'directory');
  isStored(directory, 'directory');
  return { scope, basename, directory, file: path.join(directory, basename) };
}

function readDocument(relativePath) {
  const { file, scope, basename } = documentLocation(relativePath);
  if (!isStored(file, 'file')) throw Error('Unknown document ' + relativePath);
  const contents = fs.readFileSync(file, 'utf8');
  const header = /^---\r?\nrevision: ([1-9]\d*)\r?\n---\r?\n/.exec(contents);
  if (!header || !Number.isSafeInteger(Number(header[1]))) throw Error('Invalid stored document ' + relativePath);
  const body = contents.slice(header[0].length);
  const title = /^# +(.+)$/m.exec(body)?.[1] ?? basename;
  return { relativePath, scope, title, revision: Number(header[1]), body };
}

function documentPaths(scope) {
  const { directory } = documentLocation(scope + '/placeholder.md');
  if (!isStored(directory, 'directory')) return [];
  return fs.readdirSync(directory).sort().map(name => scope + '/' + name)
    .filter(relativePath => relativeDocument.test(relativePath));
}

export function artifactTools(readRecord, checkRecordScope) {
  function writeDocument({ relativePath, revision, body }, create) {
    checkMarkdown(body);
    return withWriteLock(() => {
      const { scope, file } = documentLocation(relativePath);
      if (scope !== 'drafts') checkRecordScope(readRecord(scope));
      const exists = isStored(file, 'file');
      if (create && revision !== 0) throw Error('Create requires revision zero');
      if (create && exists) throw Error('Document already exists. Read ' + relativePath);
      if (!create && !exists) throw Error('Unknown document ' + relativePath);
      const current = exists ? readDocument(relativePath) : null;
      requireRevision(current?.revision ?? 0, revision, 'Document');
      if (current?.body === body) return current;
      writeAtomic(file, '---\nrevision: ' + (revision + 1) + '\n---\n' + body);
      return readDocument(relativePath);
    });
  }

  function listDocuments({ scope, text, ...pagination }) {
    if (scope !== 'drafts' && !/^PI-\d{2}$/.test(scope)) throw Error('Use scope drafts or a PI ID');
    if (scope !== 'drafts') readRecord(scope);
    const search = text?.trim().toLowerCase();
    const rows = documentPaths(scope).map(relativePath => {
      const { body, ...metadata } = readDocument(relativePath);
      return metadata;
    });
    return page(rows.filter(row => !search ||
      row.title.toLowerCase().includes(search) || row.relativePath.toLowerCase().includes(search)
    ), pagination);
  }

  function notesFor(id) {
    return sidecarData(sidecar('notes', id), []);
  }

  function appendNote(input) {
    const { id, revision, requestId, kind, body, supersedes, documentRefs = [] } = input;
    if (!uuid.test(requestId)) throw Error('Use a UUID for requestId');
    if (documentRefs.length > 8 || new Set(documentRefs).size !== documentRefs.length ||
        documentRefs.some(reference => typeof reference !== 'string')) {
      throw Error('Use up to eight distinct document paths');
    }
    checkMarkdown(body);
    const submitted = { id, revision, requestId: requestId.toLowerCase(), kind, body, supersedes, documentRefs };
    return withWriteLock(() => {
      const record = readRecord(id);
      const file = sidecar('notes', id);
      const journal = sidecarData(file, []);
      const existing = journal.find(entry => entry.note.id === submitted.requestId);
      if (existing) {
        const savedArguments = { ...existing.submitted, supersedes: existing.submitted.supersedes };
        if (!isDeepStrictEqual(savedArguments, submitted)) throw Error('Request ID already used with different fields');
        return existing.note;
      }
      checkRecordScope(record);
      requireRevision(record.revision, revision, id);
      if (supersedes && !journal.some(entry => entry.note.id === supersedes)) {
        throw Error('Superseded note must exist in the same journal');
      }
      for (const relativePath of documentRefs) readDocument(relativePath);
      const note = {
        id: submitted.requestId, recordId: id, at: new Date().toISOString(),
        kind, body, ...(supersedes && { supersedes }), documentRefs
      };
      writeJson(file, [...journal, { submitted, note }]);
      return note;
    });
  }

  function linksFor(id) {
    return sidecarData(sidecar('links', id), { revision: 0, references: [] });
  }

  function readLinks(id) {
    const item = readRecord(id);
    if (item.kind !== 'item') throw Error('Knowledge links require a work item');
    return { id, itemRevision: item.revision, ...linksFor(id) };
  }

  function changeLinks(input, adding) {
    const { id, revision, referencesRevision, relativePath, purpose, documentRevision } = input;
    return withWriteLock(() => {
      const item = readRecord(id);
      if (item.kind !== 'item') throw Error('Knowledge links require a work item');
      checkRecordScope(item);
      requireRevision(item.revision, revision, id);
      const file = sidecar('links', id);
      const current = sidecarData(file, { revision: 0, references: [] });
      requireRevision(current.revision, referencesRevision, 'Knowledge links');
      documentLocation(relativePath);
      if (adding) {
        requireRevision(readDocument(relativePath).revision, documentRevision, 'Document');
      }
      const matching = reference => reference.relativePath === relativePath && reference.purpose === purpose;
      const existing = current.references.some(matching);
      if (adding === existing) return { id, itemRevision: item.revision, ...current };
      if (adding && current.references.length >= 32) throw Error('A work item can link up to 32 documents');
      const references = adding
        ? [...current.references, { relativePath, purpose }]
        : current.references.filter(reference => !matching(reference));
      const next = { revision: referencesRevision + 1, references };
      writeJson(file, next);
      return { id, itemRevision: item.revision, ...next };
    });
  }

  function backlinks({ relativePath, ...pagination }) {
    documentLocation(relativePath);
    const folder = path.join(root, 'links');
    const files = isStored(folder, 'directory') ? fs.readdirSync(folder).sort() : [];
    const rows = files.filter(name => /^WI-\d{3,}\.json$/.test(name)).flatMap(name => {
      const id = name.slice(0, -5);
      const { revision, references } = linksFor(id);
      return references.filter(reference => reference.relativePath === relativePath)
        .map(reference => ({ id, purpose: reference.purpose, referencesRevision: revision }));
    });
    return { relativePath, ...page(rows, pagination) };
  }

  const writeFields = { relativePath: documentPath, revision: integer, body: string };
  const writeRequired = Object.keys(writeFields);
  const documents = operations({
    list: {
      fields: { scope: string, text: string, ...paging }, required: ['scope'], run: listDocuments
    },
    read: {
      fields: { relativePath: documentPath }, required: ['relativePath'],
      run: ({ relativePath }) => readDocument(relativePath)
    },
    create: { fields: writeFields, required: writeRequired, run: input => writeDocument(input, true) },
    update: { fields: writeFields, required: writeRequired, run: input => writeDocument(input, false) },
    backlinks: { fields: { relativePath: documentPath, ...paging }, required: ['relativePath'], run: backlinks }
  });

  const notes = operations({
    read: {
      fields: { id: string, requestId: string, ...paging }, required: ['id'],
      run: ({ id, requestId, ...pagination }) => {
        const record = readRecord(id);
        let entries = notesFor(id).map(entry => entry.note);
        if (requestId) {
          if (!uuid.test(requestId)) throw Error('Use a UUID for requestId');
          entries = entries.filter(note => note.id === requestId.toLowerCase());
        }
        return { id, revision: record.revision, ...page(entries, pagination) };
      }
    },
    append: {
      fields: {
        id: string, revision: integer, requestId: string, kind: noteKind, body: string,
        supersedes: string, documentRefs: { type: 'array', items: documentPath, maxItems: 8, uniqueItems: true }
      },
      required: ['id', 'revision', 'requestId', 'kind', 'body'],
      run: appendNote
    }
  });

  const linkFields = { id: string, revision: integer, referencesRevision: integer, relativePath: documentPath, purpose };
  const knowledge = operations({
    read: { fields: { id: string }, required: ['id'], run: ({ id }) => readLinks(id) },
    link: {
      fields: { ...linkFields, documentRevision: integer },
      required: [...Object.keys(linkFields), 'documentRevision'], run: input => changeLinks(input, true)
    },
    unlink: { fields: linkFields, required: Object.keys(linkFields), run: input => changeLinks(input, false) }
  });

  const tools = [
    {
      name: 'documents', inputSchema: documents.inputSchema,
      description: 'list requires scope drafts or a PI ID. read and backlinks use relativePath. create and update use relativePath, body and revision (zero for create, observed revision for update). Drafts live under drafts/ and PI documents under PI-##/.'
    },
    {
      name: 'notes', inputSchema: notes.inputSchema,
      description: 'Read paged notes by record id, or id and requestId. Append with observed record revision, retained requestId UUID, kind and Markdown body. Optionally supply documentRefs paths or supersedes note ID. Recover a lost response by reading the same requestId.'
    },
    {
      name: 'knowledge', inputSchema: knowledge.inputSchema,
      description: 'Read work item document references by id. Link/unlink using id, observed item revision, referencesRevision, relativePath and purpose. Adding also requires observed documentRevision. Documents backlinks returns referencing items.'
    }
  ];
  return { tools, actions: { documents: documents.run, notes: notes.run, knowledge: knowledge.run } };
}
