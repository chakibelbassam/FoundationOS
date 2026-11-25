# 01 — The tree

**Status:** DECIDED direction (D22) · 25 November 2026
**Rule:** the tree is the truth; the index is a cache.

## 1. Two trees, never confused

| Tree | Where | What it holds | Backed up |
| --- | --- | --- | --- |
| **Code** | `C:\FoundationOS\` (D14) | The product: `FoundationOS-Server/`, `FoundationOS-Interface/`, `system/` | git + OneDrive copy |
| **Data** | `C:\FoundationOS\data\` | Accounts, projects, boards, channels, jobs, catalog | copy the folder |
| **Backups** | `C:\FoundationOS\backups\` | Dated snapshots of `data/` | OneDrive copy |

`FOUNDATIONOS_DATA` overrides the data root. Nothing in the product may
hard-code either path; one `root` variable, per D14.

## 2. The data tree

```
data/
  server.json                 name, version, schemaVersion, policy, createdAt
  accounts/<userId>.json      username, displayName, serverRole, status, hash
  sessions/<sessionId>.json   userId, createdAt, expiresAt, revokedAt?
  invites/<inviteId>.json     kind: server|project, tokenHash, role, expiresAt,
                              usedAt?, revokedAt?, createdBy
  audit/2026-11.jsonl         append-only; one event per line

  projects/<projectId>/
    project.json              kind, name, description, ownerUserId, schemaVersion
    grants.json               principalId -> role  (users and agents)
    board/
      items/<itemId>.json     one work item per file
      events.jsonl            filed, triaged, claimed, evidence, done
    channel/
      messages.jsonl          append-only message log
    repo/                     kind = app   (a real git repo)
    files/                    kind = folder
    memory/
      BRIEF.md  PLAN.md  DECISIONS.md

  agents/<agentId>/
    agent.json                ownerUserId, profile, harness, model, status
    grant.json                projectId -> permissions, expiresAt
    memory/                   private, gitignored
    jobs/<jobId>.json         state, attempt, baseRevision, evidence

  catalog/<entryId>/
    entry.json                manifest, permissions, version, review state
    snapshot/                 the reviewed copy

  index/                      derived; safe to delete
    foundationos.sqlite
```

Three rules fall out of this layout:

1. **A project is one folder.** Creating a project, its board, its channel and
   its first grant is one directory creation, not four racing writes.
2. **Projects live at the top level**, not inside a personal folder. A
   "personal workspace" is a filter over `ownerUserId` and `grants.json`; if it
   were a directory, sharing would mean moving the folder and breaking git
   remotes, worktrees and links.
3. **Agents live at the top level too**, with a grant per project. An agent is
   not a subfolder of a person, because it outlives the session and can hold
   grants on several projects.

## 3. Identity in the path

- Every object gets a **ULID** at creation: sortable, opaque, no collisions.
- The path segment **is** the id: `projects/01J8.../`.
- The **name is display only**, stored inside `project.json`. Renaming never
  moves a folder and never breaks a link.
- Human-readable aliases are optional symlinks or shortcuts, never the key.
- Deleted objects move to `data/trash/<id>/` with a `deletedAt`; purged after
  30 days by the reaper. Nothing is unlinked on the first click.

## 4. Append-only by default

Mutable records (an item, a job, a grant) are current-state files. Everything
that *happened* goes to a log:

| Log | Records | Used by |
| --- | --- | --- |
| `projects/<id>/board/events.jsonl` | filed, triaged, claimed, evidence, review, done | board history, notifications, replay |
| `projects/<id>/channel/messages.jsonl` | every message, in order | channel view, unread counts |
| `audit/YYYY-MM.jsonl` | sign-in, invite, role change, delete, admin action | admin console, the affected user |

Logs are **append-only**. Corrections are new events (`retracted`), never edits
to old lines. That gives audit, replay and "what happened?" for free, and it is
the natural companion to "files are truth".

## 5. The index

`index/foundationos.sqlite` holds only what is expensive to compute:

- item lists filtered by project, status, assignee, priority;
- unread counts per user per conversation;
- full-text search over items, messages and docs;
- the "what should I work on?" query.

Rules:

- The index is **never** the source of truth and never accepts a write that the
  tree did not already accept.
- It can be deleted at any time; `fos_index rebuild` recreates it from the tree.
- A schema change bumps `schemaVersion`, rebuilds the index, and leaves the
  tree alone.
- If the index and the tree disagree, the tree wins and the index logs a
  `drift` event.

## 6. Backup and recovery

- **Backup = copy `data/`.** No database dump, no export step.
- A dated snapshot is taken before every schema migration and kept for 7 days.
- Recovery = stop the server, restore the folder, start. The index rebuilds.
- A single project can be exported as a folder and imported into another
  server; ids are preserved, so links survive.

## 7. What is *not* in the tree

- **Process ids, ports and live sockets.** Runtime state, rebuilt on boot.
- **Secrets in shared files.** A project's `.env` lives beside `repo/`, is
  gitignored, and is never copied into the catalog snapshot.
- **The product's own source.** That is the code tree, versioned by git.
- **Edge's model weights or provider keys.** Those belong to the harness
  configuration, not to the project.

## 8. Open questions

1. One file per work item, or one file per board? (Lean: per item — smaller
   writes, fewer conflicts. The index makes listing cheap.)
2. Should `channel/messages.jsonl` rotate per month once it grows? (Lean: yes,
   `messages-2026-11.jsonl`, with a pointer in `channel/index.json`.)
3. Do folder projects store files directly in `files/`, or a manifest pointing
   at an imported copy? (Lean: directly; importing copies in.)
4. Is `data/` allowed on a different drive than the code? (Lean: yes, via
   `FOUNDATIONOS_DATA`; backups follow the data.)
