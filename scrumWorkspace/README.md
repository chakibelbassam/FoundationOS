# Development Scrum workspace

`scrumWorkSpace` owns the project's PI, sprint and work-item records, plus the drafts, notes and knowledge links that belong to them. Use it through the OpenCode MCP server named `scrumWorkSpace`, or run it directly from the Development root:

```powershell
node Edge/tools/scrumWorkSpace.mjs query '{"pi":"PI-01","sprint":1}'
```

Pass a JSON argument, or pass `-` and send the JSON on standard input. With no arguments the same file serves the MCP protocol over standard input. `Edge/tools/scrum.mjs` is a compatibility entry point.

PI-00 tracks development setup. PI-01 is the first product increment. Read PI-00 and PI-01 before selecting work.

## Storage map

| Path | Contents |
| --- | --- |
| `increments/PI-XX.json` | Product increments and development setup |
| `sprints/S-XX-Y.json` | Sprints, parented to a PI |
| `work-items/WI-XXX.json` | Features, enhancements, bugs, enablers and tasks |
| `documents/drafts/*.md` | Evolving drafts shared across the project |
| `documents/PI-XX/*.md` | Documents owned by one PI |
| `notes/<record-id>.json` | Append-only note journals |
| `links/<work-item-id>.json` | Explicit document links for one work item |
| `.write.lockdir` | Short-lived write lock |

Documents use a revision header:

```markdown
---
revision: 3
---
# Title
```

The old flat `scrum/*.json` files remain readable as legacy storage. Grouped storage is canonical. A record that exists in both places is an error; move it deliberately instead of guessing.

## Records

| Kind | ID | Parent | Required fields |
| --- | --- | --- | --- |
| PI | `PI-00` | none | title, acceptance, status, revision |
| Sprint | `S-01-1` | PI | title, acceptance, status, revision |
| Work item | `WI-001` | sprint | title, acceptance, status, revision, type, priority, effort |

Work-item types are `feature`, `enhancement`, `bug`, `enabler` and `task`. Priority is 1 (highest) through 5 (lowest). Effort is 2 (hardest admitted) through 5 (easiest); split anything that would be Ef-1. Only bugs carry `severity`, written as `Sev-1` through `Sev-5`.

Statuses are `proposed`, `ready`, `active`, `review` and `done`. Planning records move between `proposed` and `ready`. Work items also move `ready` to `active`, `active` to `review`, and `review` back to `active`. Final acceptance, `done`, severity raising and PI/sprint activation are owner-controlled. A `review` item needs evidence. An accepted parent closes its scope to agent edits.

## Operations

### query

Read one record, list by filter, or read a PI with its descendants.

```powershell
node Edge/tools/scrumWorkSpace.mjs query '{"id":"WI-008"}'
node Edge/tools/scrumWorkSpace.mjs query '{"pi":"PI-01","sprint":1}'
node Edge/tools/scrumWorkSpace.mjs query '{"parent":"S-00-1","kind":"item","status":"active"}'
```

Filters are `id`, `kind`, `status`, `parent`, `pi`, `sprint`, `type`, `priority`, `text`, `offset` and `limit`. A `pi` plus numeric `sprint` returns the sprint and its items ordered by priority and ID. Paginate with `nextOffset`.

### create

Create a proposed record at revision zero. Supply every required field.

```powershell
node Edge/tools/scrumWorkSpace.mjs create '{"id":"WI-009","kind":"item","parent":"S-00-1","title":"Example","acceptance":"Observable result","status":"proposed","revision":0,"type":"task","priority":2,"effort":4}'
```

### update

Query the record first. Send its exact revision and only the fields to change. Use `clear` to remove optional fields such as `evidence` or `severity`; do not also set them in `changes`.

```powershell
node Edge/tools/scrumWorkSpace.mjs update '{"id":"WI-009","revision":1,"changes":{"status":"ready"}}'
```

### documents

`documents` manages Markdown under `drafts/` or `PI-##/`. A document path is relative to `documents/`, for example `drafts/outline.md` or `PI-01/server-plan.md`.

| Action | Fields | Notes |
| --- | --- | --- |
| `list` | scope, text, offset, limit | Scope is `drafts` or a PI ID. Search matches titles and paths, not bodies. |
| `read` | relativePath | Returns title, revision and body. |
| `create` | relativePath, revision, body | Revision must be zero. Refuses duplicates. |
| `update` | relativePath, revision, body | Use the revision from a fresh read. An identical body is unchanged. |
| `backlinks` | relativePath, offset, limit | Returns work items that link the document. The target need not exist. |

```powershell
node Edge/tools/scrumWorkSpace.mjs documents '{"action":"list","scope":"drafts"}'
node Edge/tools/scrumWorkSpace.mjs documents '{"action":"create","relativePath":"drafts/outline.md","revision":0,"body":"# Outline\n\n- First decision\n"}'
```

### notes

Notes are append-only observations attached to one record. Append with the observed item revision, a retained request UUID, a kind (`progress`, `blocker`, `decision`, `investigation` or `handoff`) and a Markdown body. Optionally add up to eight `documentRefs` or supersede an earlier note ID. Notes do not advance the item revision.

```powershell
node Edge/tools/scrumWorkSpace.mjs notes '{"action":"append","id":"WI-008","revision":3,"requestId":"3f0f6b1e-7d2a-4f7e-9f0e-2f6a1c9d8b7a","kind":"progress","body":"Baseline verified."}'
node Edge/tools/scrumWorkSpace.mjs notes '{"action":"read","id":"WI-008"}'
```

After a lost response, read the same `requestId` before retrying. Reusing a request ID with different fields is refused.

### knowledge

Knowledge links connect a work item to a document with a purpose: `requirement`, `investigation`, `decision` or `handoff`. The link record has its own revision, separate from the item and document revisions.

```powershell
node Edge/tools/scrumWorkSpace.mjs knowledge '{"action":"read","id":"WI-008"}'
node Edge/tools/scrumWorkSpace.mjs knowledge '{"action":"link","id":"WI-008","revision":3,"referencesRevision":0,"relativePath":"drafts/outline.md","purpose":"decision","documentRevision":1}'
node Edge/tools/scrumWorkSpace.mjs knowledge '{"action":"unlink","id":"WI-008","revision":3,"referencesRevision":1,"relativePath":"drafts/outline.md","purpose":"decision"}'
```

Use `documents backlinks` to answer what would change if a document changes.

## Revisions, locks and recovery

Every write carries an observed revision. Item, document and knowledge revisions are separate domains; never substitute one for another. A conflict means reread and reconcile the newer state, not blind retry.

Writes hold `scrumWorkspace/.write.lockdir` briefly. If a write is interrupted, confirm the writer has exited and inspect the affected record before removing only a stale lock directory. Never remove a live lock.

If a write response is lost, query the record ID and compare state before another write. For notes, read the same request ID first. The `receipt` operation will make create and update recovery explicit.
