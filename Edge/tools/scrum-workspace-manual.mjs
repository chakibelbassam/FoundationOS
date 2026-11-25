import { checkFields, schema } from './scrum-workspace-storage.mjs';

const topics = {
  overview: {
    summary: 'Project-local PI, sprint and work-item records with drafts, notes and explicit knowledge links.',
    example: 'node Edge/tools/scrumWorkSpace.mjs query \'{"pi":"PI-01","sprint":1}\'',
    notes: [
      'The MCP server and tool family are both named scrumWorkSpace.',
      'The data root is scrumWorkspace/ beside this repository.',
      'Read a record before writing it; every write carries an observed revision.'
    ]
  },
  records: {
    summary: 'PI, sprint and work-item shapes, parentage and lifecycle.',
    fields: {
      pi: 'id PI-##, kind pi, title, acceptance, status, revision',
      sprint: 'id S-##-#, kind sprint, parent PI-##, title, acceptance, status, revision',
      item: 'id WI-###, kind item, parent S-##-#, title, acceptance, status, revision, type, priority, effort'
    },
    notes: [
      'Types: feature, enhancement, bug, enabler, task.',
      'Priority is 1 (highest) through 5. Effort is 2 (hardest admitted) through 5.',
      'Only bugs carry severity Sev-1 through Sev-5.',
      'Statuses: proposed, ready, active, review, done.',
      'Planning records move proposed to ready and back. Items also move ready to active, active to review, and review back to active.',
      'Done, severity raising and PI or sprint activation are owner-controlled.',
      'Review requires evidence. An accepted parent closes its scope to agent edits.'
    ]
  },
  query: {
    summary: 'Read one record, list by filter, or read a PI with its descendants.',
    fields: {
      id: 'exact record ID',
      kind: 'pi, sprint or item',
      status: 'proposed, ready, active, review or done',
      parent: 'PI ID for sprints, sprint ID for items',
      pi: 'PI ID; with sprint returns that sprint and its items',
      sprint: 'sprint number; requires pi',
      type: 'feature, enhancement, bug, enabler or task',
      priority: 'integer 1 through 5',
      text: 'case-insensitive match on ID, title and acceptance',
      offset: 'zero-based page start',
      limit: 'page size, maximum 200'
    },
    example: 'node Edge/tools/scrumWorkSpace.mjs query \'{"parent":"S-00-1","kind":"item","status":"active"}\'',
    notes: ['Follow nextOffset rather than adding limit to offset.']
  },
  create: {
    summary: 'Create a proposed record at revision zero.',
    fields: {
      id: 'stable ID chosen by the caller',
      kind: 'pi, sprint or item',
      parent: 'required for sprint and item',
      title: 'non-empty Markdown text',
      acceptance: 'non-empty Markdown text',
      status: 'must be proposed on create',
      revision: 'must be zero',
      type: 'work items only',
      priority: 'work items only',
      effort: 'work items only',
      severity: 'bugs only; normally set during triage',
      requestId: 'optional UUID; repeat the same call to recover a lost response'
    },
    example: 'node Edge/tools/scrumWorkSpace.mjs create \'{"id":"WI-009","kind":"item","parent":"S-00-1","title":"Example","acceptance":"Observable result","status":"proposed","revision":0,"type":"task","priority":2,"effort":4}\'',
    notes: ['With requestId, an identical retry returns the original record instead of creating a duplicate.']
  },
  update: {
    summary: 'Change only the supplied fields or clear optional ones.',
    fields: {
      id: 'exact record ID',
      revision: 'the revision observed from a fresh query',
      changes: 'object of fields to set',
      clear: 'optional array of evidence and/or severity to remove',
      requestId: 'optional UUID; repeat the same call to recover a lost response'
    },
    example: 'node Edge/tools/scrumWorkSpace.mjs update \'{"id":"WI-009","revision":1,"changes":{"status":"ready"}}\'',
    notes: [
      'Do not set a field in changes and clear it in the same call.',
      'A stale revision refuses; reread and reconcile before retrying.',
      'With requestId, an identical retry returns the original saved record.'
    ]
  },
  documents: {
    summary: 'Manage Markdown drafts and PI documents under scrumWorkspace/documents.',
    fields: {
      action: 'list, read, create, update or backlinks',
      scope: 'list only; drafts or a PI ID',
      text: 'list only; matches titles and paths, not bodies',
      relativePath: 'drafts/name.md or PI-##/name.md',
      revision: 'zero for create; observed revision for update',
      body: 'Markdown body without the revision header',
      offset: 'backlinks page start',
      limit: 'backlinks page size, maximum 50'
    },
    example: 'node Edge/tools/scrumWorkSpace.mjs documents \'{"action":"create","relativePath":"drafts/outline.md","revision":0,"body":"# Outline\\n\\n- First decision\\n"}\'',
    notes: [
      'Paths use lowercase kebab-case basenames.',
      'Creation refuses duplicates and traversal.',
      'Backlinks works even when the target document is missing.'
    ]
  },
  notes: {
    summary: 'Read or append durable observations on one record.',
    fields: {
      action: 'read or append',
      id: 'record ID',
      revision: 'append only; the observed item revision',
      requestId: 'append only; UUID retained for recovery',
      kind: 'progress, blocker, decision, investigation or handoff',
      body: 'non-empty Markdown text',
      supersedes: 'optional earlier note ID in the same journal',
      documentRefs: 'optional array of up to eight existing document paths'
    },
    example: 'node Edge/tools/scrumWorkSpace.mjs notes \'{"action":"append","id":"WI-008","revision":3,"requestId":"3f0f6b1e-7d2a-4f7e-9f0e-2f6a1c9d8b7a","kind":"progress","body":"Baseline verified."}\'',
    notes: [
      'Notes are append-only and do not advance the record revision.',
      'Read the same requestId after a lost response before retrying.',
      'Reusing a requestId with different fields is refused.'
    ]
  },
  knowledge: {
    summary: 'Read, add or remove explicit document links for one work item.',
    fields: {
      action: 'read, link or unlink',
      id: 'work-item ID',
      revision: 'observed item revision',
      referencesRevision: 'observed link revision',
      relativePath: 'existing document path for link; stored path for unlink',
      purpose: 'requirement, investigation, decision or handoff',
      documentRevision: 'link only; observed document revision'
    },
    example: 'node Edge/tools/scrumWorkSpace.mjs knowledge \'{"action":"link","id":"WI-008","revision":3,"referencesRevision":0,"relativePath":"drafts/outline.md","purpose":"decision","documentRevision":1}\'',
    notes: [
      'The link record has its own revision, separate from the item and document.',
      'A real link change advances only the link revision.',
      'Use documents backlinks to find the work items that reference a document.'
    ]
  },
  validate: {
    summary: 'Read-only consistency check of the current scrumWorkspace store.',
    example: 'node Edge/tools/scrumWorkSpace.mjs validate \'{}\'',
    notes: [
      'Reports errors for broken parentage, invalid fields, duplicate IDs and unsafe documents.',
      'Reports warnings for missing linked documents, stale locks and orphan sidecars.',
      'Validation never changes records and never implies acceptance.'
    ]
  },
  receipt: {
    summary: 'Recover the saved result of a create or update by its requestId.',
    fields: {
      requestId: 'the UUID supplied to create or update'
    },
    example: 'node Edge/tools/scrumWorkSpace.mjs receipt \'{"requestId":"3f0f6b1e-7d2a-4f7e-9f0e-2f6a1c9d8b7a"}\'',
    notes: [
      'A receipt returns the original saved record even if the store changed later.',
      'A missing receipt does not prove that an unreceipted write had no effect.',
      'Notes use their own requestId journal; read notes by requestId instead.'
    ]
  },
  recovery: {
    summary: 'Resolve revision conflicts, lost responses and interrupted locks.',
    notes: [
      'Query the exact record and compare state before retrying.',
      'Item, document and knowledge revisions are separate domains.',
      'For create or update with requestId, read the receipt first.',
      'For notes, read the same requestId first.',
      'A stale .write.lockdir may be removed only after confirming its writer has exited.',
      'Never blindly retry a write whose response was lost.'
    ]
  }
};

const fields = {
  action: { type: 'string', enum: ['index', 'topic'] },
  topic: { type: 'string', enum: Object.keys(topics) }
};

export const manualTool = {
  name: 'manual',
  description: 'Read the scrumWorkSpace operation index or focused help for one topic before writing. Use action index, or action topic with a topic name.',
  inputSchema: schema(fields, ['action'])
};

export function manualAction(input) {
  checkFields(input, fields, ['action']);
  if (input.action === 'index') {
    if (input.topic !== undefined) throw Error('index does not accept topic');
    return {
      name: 'scrumWorkSpace',
      version: '0.3',
      root: 'scrumWorkspace/',
      storage: {
        increments: 'increments/PI-XX.json',
        sprints: 'sprints/S-XX-Y.json',
        workItems: 'work-items/WI-XXX.json',
        drafts: 'documents/drafts/*.md',
        piDocuments: 'documents/PI-XX/*.md',
        notes: 'notes/<record-id>.json',
        links: 'links/<work-item-id>.json',
        receipts: 'receipts/<request-id>.json'
      },
      topics: Object.entries(topics).map(([name, topic]) => ({ name, summary: topic.summary }))
    };
  }
  if (!input.topic) throw Error('topic is required for action topic');
  return { topic: input.topic, ...topics[input.topic] };
}
