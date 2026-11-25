# Glossary

**Status:** living · 25 November 2026

One line per noun. If a term is missing, it is probably a synonym — use the
canonical word here, not the synonym.

## The substrate

| Term | Meaning |
| --- | --- |
| **Server** | One running FoundationOS instance on one machine. Owns the tree and every process. |
| **Tree** | The data directory (`data/` by default). The source of truth for everything. |
| **Index** | A derived, rebuildable cache (SQLite) over the tree. Never authoritative. |
| **Event log** | An append-only `events.jsonl` per scope: what happened, in order. |
| **Receipt** | The stored response for an idempotency key, so a retry cannot duplicate a write. |
| **Schema version** | A number in every manifest; bumped only by a migration. |

## People and access

| Term | Meaning |
| --- | --- |
| **Account** | A person with a login, a username and a **server role**. |
| **Server role** | `owner` (one), `admin`, `member`. Governs the server, not project content. |
| **Workspace** | A person's personal container. A **filter** over ownership and grants, not a folder. |
| **Grant** | `(principal, project, role)`. The only thing that confers access. |
| **Role** | Within a project: `owner`, `admin`, `member`, `viewer`. |
| **Principal** | Any actor with a grant: a human or an agent. |
| **Ceiling rule** | Nobody can grant a role higher than their own, and no agent exceeds its owner. |
| **404 rule** | No access returns **404**, not 403, so existence does not leak. |
| **Invite** | A one-time credential. Either a **server invite** (creates an account) or a **project share** (grants a role). |
| **Friendship** | A mutual social link. Grants **no** access to anything. |
| **Session** | A signed-in browser or client, revocable. |

## Work

| Term | Meaning |
| --- | --- |
| **Project** | The unit of shared work. `kind` is `app`, `folder` or `board`. |
| **App** | A project with code, a git repo and a workshop. |
| **Folder** | A project of documents. Managed folder; read-only or one writer in v1. |
| **Board** | A project of work items only, with no files. |
| **Lobby** | The project's channel. Being in it **is** having project access. |
| **Work item** | The umbrella: Feature, Enhancement (`new`/`improve`), Bug, Enabler, Dev Task. |
| **SCR** | The **intake record** that produces one work item. Not a type. |
| **PRD** | Intent and scope for a body of work. Not a work item. |
| **Sprint** | The only timebox. There is no PI layer. |
| **Triage** | Assigning type, severity (bugs), priority, effort; a human confirms. |
| **Evidence** | Diff, test output, screenshot or log attached to an item or job. |

## Agents

| Term | Meaning |
| --- | --- |
| **Agent** | An AI worker with an identity, a grant, a profile and a folder. |
| **Edge** | The conversational agent and the primary interface *option*. A principal like any other. |
| **Workshop** | The embedded harness session for an app project. One per project. |
| **Job** | One durable unit of agent work: state, attempts, base revision, evidence. |
| **Worktree** | A git working tree per job, sharing the project's history but not its files. |
| **Delegation** | An agent prompting another agent. Authority never accumulates down the chain. |
| **Merge queue** | The single place where two agents' work meets, one merge at a time. |

## Conversation

| Term | Meaning |
| --- | --- |
| **Conversation** | A DM or a project channel. |
| **Message** | Authored by a **human**, an **agent** (tagged "via Edge"), or the **system**. |
| **DM** | A private conversation between friends. |
| **Channel** | The project's conversation surface; also the membership lobby. |
| **Quiet hours** | A per-user window (default 22:00–08:00) when only Sev-1 and failures notify. |

## Distribution

| Term | Meaning |
| --- | --- |
| **Catalog** | The server's library of approved app **snapshots**. |
| **Catalog entry** | A submitted app: manifest, permissions, version, review state. |
| **Install** | Copying a catalog app into a project. Each install is independent. |
| **Publish** | Submitting a snapshot for review. A human act, never an agent's. |

## Memory

| Term | Meaning |
| --- | --- |
| **Memory** | Files that survive a session: `BRIEF.md`, `PLAN.md`, `DECISIONS.md`, notes. |
| **Project memory** | Memory inside the repo, shared with everyone who can see the project. |
| **Agent memory** | Private memory under `agents/<id>/memory/`, gitignored, never shared. |
| **Decision** | A recorded choice with a status and a date. Lives in the decision log. |
