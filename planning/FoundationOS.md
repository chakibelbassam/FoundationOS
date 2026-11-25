# FoundationOS — product definition

**Status:** DRAFT v0.2 · 25 November 2026
**Role:** the source of truth for **what FoundationOS is, who it is for, and how
the parts fit**. Decisions live in `harness-strategy/01-decision-log.md`;
architecture detail lives in `foundationos/`. If this file and a detail doc
disagree about *what the product is*, this file wins and the doc is fixed.

---

## 1. In one sentence

**FoundationOS is a self-hosted workspace server where people and their agents
organize work, build apps, and share projects.**

## 2. In one paragraph

It gives every person a private workspace and every project a shared one. Work
is filed as typed items, triaged once, and carried out by agents in isolated
workshops. People can befriend each other, message, share a project, or publish
an app to the server's library. The server owns the state; the browser is only
a view.

## 3. The two things it is

FoundationOS is a **folder structure** and an **interface** over it.

- **The tree is the product.** Accounts, projects, boards, channels, jobs,
  memory and evidence are files in one folder you can copy, inspect and back
  up. There is no hidden database of record.
- **The interface is a view.** The web shell at `os.cebsolutions.dev`, the
  downloadable `FoundationOS-Interface`, the CLI, or Edge in conversation. Any
  of them can be closed, replaced or absent.
- **Edge is a folder too.** Its identity, grant, memory and jobs are files, so
  it can be restarted, inspected, corrected and swapped for another engine
  without losing anything.
- **The tree is the truth.** The index, the board, the inbox and every screen
  are derived. Delete them and they rebuild from the tree.
- To change the tree you can use the interface (deliberate, minimal) or ask
  Edge (conversational). **Edge uses the same doors and is bounded by the same
  grant** — it is not privileged by being a service.

The test for every future feature: *if the interface vanished, would the work
still be there?*

## 4. The problem

Work is scattered across chats, files, tickets and agents. Each tool knows a
fragment:

- the chat knows the intent, not the state;
- the code editor knows the files, not the decision;
- the ticket tracker knows the item, not the evidence;
- the agent knows the session, not the project;
- the person knows all of it and has to hold it together.

Agents make this worse before they make it better: they are powerful, but
stateless, siloed, and unsafe to point at shared work without scope, memory and
review.

FoundationOS exists to be **the place that holds the work**: the intent, the
items, the state, the evidence, the decisions, the people and the agents — in
one server you own.

## 5. The user story

### A Tuesday

Chakib runs FoundationOS on the PC under his desk. He opens
`os.cebsolutions.dev` for the first time and gets **setup**: server name, his
username, his password, time zone and quiet hours. That creates the **owner**
account and the server. `/setup` now returns 404.

He creates two accounts, **Alice** and **Bob**, as members. Each gets a
one-time link and QR. They join, choose their own passwords, and land in their
own personal workspaces.

Alice searches `@bob` and sends a friend request. Bob accepts. They can now
message each other.

Bob creates a project called **Weather**. It is an **app project**: a repo, a
manifest, a board and a channel. The channel `#weather` is created with him in
it. He adds Alice to the channel as a **member** — which is also her grant to
the project. Alice adds her builder agent to the channel as a **member**: the
ceiling rule stops her granting more than she has, and it appears as *"Alice's
builder (agent)"*.

Both open the workshop. FoundationOS starts **one** session for the project.
Alice's builder works in `agent/alice/142`; Bob's builder works in
`agent/bob/143`. They share the same history but never the same working tree.
Alice's agent opens a change; `#weather` says *"Alice's builder opened a
review."* Bob reads the diff, runs the tests, and approves. The merge queue
applies it, one merge at a time.

Meanwhile Alice shares a folder of trip photos with Bob as a **viewer**. He can
browse, not edit.

Bob has built a small **Budget** app. He submits it to the server **catalog**.
Chakib gets a review notification, checks the manifest, permissions and
screenshots, and approves it. Alice installs a copy into her workspace — a new
project with its own history, not a window into Bob's.

At lunch, Chakib tells Edge: *"Tell Alice the Weather build is ready."* Edge
drafts the message; Chakib edits one line and approves. Alice receives a DM
tagged **via Edge**. Edge does not read her reply unless Chakib explicitly asks
it to.

That evening, Chakib closes the browser while a QA job is still running. The
job keeps going. When it finishes, the inbox and a Windows toast say *"QA
finished: 6/6 passed."* If the server restarts mid-job, the job resumes up to
three times, then fails with a notification and a log.

The point: **people and agents share the same work, but each has their own
space, permissions and memory.**

### The cast

| Who | What they need | What they must not do |
| --- | --- | --- |
| **Owner** (Chakib) | Run the server, manage accounts, approve the catalog, keep backups | Read every private project or DM by default |
| **Admin** | Manage users, quotas, invites, catalog review | Act as a member of every project |
| **Member** (Alice) | Build, file work, invite friends, share projects, publish | Publish or delete without the right role |
| **Viewer** (Bob, on Photos) | Read a shared project | Write anything |
| **Agent** (Edge, Builder, QA) | Read context, act within a scope, report evidence | Impersonate a human, exceed its owner's role, touch another project |

## 6. The four layers

| Layer | Unit | Governed by | Question |
| --- | --- | --- | --- |
| **Server** | account | owner / admin | Who may use this FoundationOS? |
| **Social** | friendship, conversation | the members | Who can talk to whom? |
| **Work** | project | project members | Who shares this app, folder or board? |
| **Distribution** | catalog entry | admin review | What is available to everyone? |

The rule that keeps it sane: **friendship is not access, access is not
friendship, and server admin is not a member of every project.**

```
Server
├── Accounts (owner / admin / member)
│   ├── Personal workspace      a filter over ownership and grants
│   │   └── Projects            kind: app | folder | board
│   │       ├── Members + roles owner / admin / member / viewer
│   │       ├── Channel         the lobby; membership = access
│   │       ├── Board           typed work items
│   │       └── Resources       repo | files | workshop
│   ├── Friendships             social only; grants nothing
│   └── Conversations           DM | project channel
├── Agents            principals bounded by their owner's role
└── Catalog           approved app snapshots, installed as copies
```

## 7. The information model

| Object | One-line definition |
| --- | --- |
| **Server** | The running FoundationOS instance on one machine |
| **Tree** | The data folder; the source of truth |
| **Index** | A rebuildable cache over the tree; never authoritative |
| **Account** | A person with a login, a username and a server role |
| **Workspace** | A person's private *view* of projects and files |
| **Project** | The unit of shared work; `kind` is `app`, `folder` or `board` |
| **App** | A project with code, a repo and a workshop |
| **Folder** | A project of files, optionally previewable |
| **Board** | A project of work items, with no files |
| **Channel** | The project's conversation surface and its membership lobby |
| **Grant** | `(principal, project, role)`; the only thing that confers access |
| **Work Item** | The umbrella: Feature, Enhancement, Bug, Enabler or Dev Task |
| **SCR** | The **intake record** that produces one work item; not a type |
| **PRD** | Intent and scope for a body of work; not a work item |
| **Sprint** | One timebox; no PI layer |
| **Agent** | An AI worker with a role, a profile and a grant |
| **Principal** | Any actor with a grant: a human or an agent |
| **Workshop** | The embedded harness session for an app project |
| **Job** | One unit of agent work with a durable record |
| **Conversation** | A DM or a project channel |
| **Message** | Human-authored, agent-authored (tagged) or system |
| **Invite** | A one-time credential for the server or a project |
| **Friendship** | A mutual social link; carries no access |
| **Catalog entry** | An admin-approved app snapshot |
| **Decision** | A recorded choice with a status and a date |
| **Memory** | Files that survive a session: brief, plan, decisions, notes |

## 8. Features, by layer

Status key: **Decided** = recorded in the decision log with a date;
**Lean** = a direction we prefer; **Exploring** = a real option, not a
commitment; **Later** = after v1.

### 8.1 Server, identity and first run

| Feature | Status | Notes |
| --- | --- | --- |
| First-run setup, login, join by invite | Decided (D21) | `/setup` closes permanently after the owner exists |
| Accounts, sign-in, sessions, revocation | Decided (D15) | No anonymous writes |
| Server roles: owner / admin / member | Decided (D15) | Admin manages the server, not private content |
| Admin privacy: policy + audit, no E2E | Decided (D17) | Stated plainly in the UI |
| Personal workspace per account | Decided (D15) | A filter, not a folder |
| Server invites: link or QR, one-time | Decided (D15) | Hashed, expiring, revocable, audited |
| Admin console: users, quotas, audit | Exploring | The first screen after login for an admin |
| Backups, quotas, retention | Exploring | Multi-user makes these obligations |

### 8.2 Social

| Feature | Status | Notes |
| --- | --- | --- |
| Friend request by exact `@username` | Decided (D18/D19) | No directory; mutual accept; block |
| DMs between friends | Decided (D18/D19) | Friendship gates DMs, not access |
| Project channel | Decided (D18) | Auto-created; membership = grants |
| Agent-assisted message ("tell Alice…") | Decided (D19) | Draft/approve by default; auto-send for trusted contacts and events |
| Blocking, mute, quiet hours | Lean | Needed before messaging ships |
| Group chat | Later | Not v1 |

### 8.3 Work

| Feature | Status | Notes |
| --- | --- | --- |
| Projects: app / folder / board | Decided (D16) | One umbrella, one permission system |
| Work items: Feature, Enhancement, Bug, Enabler, Dev Task | Decided (D9) | One schema, conditional fields |
| Severity (bugs), priority (all), effort (all) | Decided (D9) | Sev 1-5, P-1..P-5, Ef-1..Ef-5 |
| Three intake doors | Decided (D9/D13) | Problem, feature, task; Edge drafts |
| Triage Guide generated from schema | Decided (D9) | PDF is an export |
| Board, sprint, DoR/DoD, evidence | Decided (D9) | Human confirms triage and Done |
| PRD → work items | Exploring | Agent drafts, human approves |

### 8.4 Agents and workshops

| Feature | Status | Notes |
| --- | --- | --- |
| OpenCode for chat and studio | Decided (D1/D12) | `edge-chat` read-only, `studio` full tools |
| One workshop per app project | Decided (D4) | Roles are sub-agents, not extra instances |
| Git worktree per job | Decided (D12) | Isolated edits; review before apply |
| One writer at a time | Decided | Per project repo and per work item |
| Job record, resume, 3 retries, notification | Decided (D13) | The UI is only a view |
| File-based memory (`BRIEF/PLAN/MEMORY/DECISIONS`) | Decided direction | Portable; engine-native memory is a bonus |
| Edge is an optional principal | Decided (D23) | The UI works with Edge offline |
| Agent-to-agent collaboration | Decided shape (D12/D19) | Through worktrees, the merge queue and the channel |
| Approval cards (`ask` mode) | Lean | Harness UI or our rail; both surfaces |
| Agent registry and routing | Lean | Pin > surface > job offer > default |

### 8.5 App Studio

| Feature | Status | Notes |
| --- | --- | --- |
| One page per project: Brief, Plan, Workshop | Lean (D5) | No stage wizard |
| Brief and Plan persist to files | Lean | Reload-safe |
| Open workshop seeds the first message | Lean | One-line plan pointer |
| Build, run, QA, publish | Lean | Publish stays a human act |

### 8.6 Catalog

| Feature | Status | Notes |
| --- | --- | --- |
| Submit an app to the server library | Exploring | Snapshot, not a live share |
| Admin review and approval | Exploring | Manifest, permissions, deps, secrets, license |
| Install a copy | Exploring | Each install is independent; upstream link |
| Versions and updates | Later | Re-review when permissions change |
| Static-only or sandboxed server-side apps | Exploring | The security fork; v1 leans static |

### 8.7 Remote access and clients

| Feature | Status | Notes |
| --- | --- | --- |
| Cloudflare DNS, TLS, tunnel | Decided (D11) | First-level hosts only |
| `os.` shell, `oc-<project>` workshops | Decided shape | Project ids avoid name collisions |
| Phone access to shell, inbox, workshop status | Decided | No terminal needed |
| Cloudflare Access on `os.` | Optional | Never on the workshop wildcard |
| PC is the only origin | Decided (D20) | "Online when the machine is on", stated |
| Downloadable `FoundationOS-Interface` | Decided (D20) | Same API as the web shell |
| Local mode without a server | Later | A client today; a product later, if at all |

## 9. The project umbrella

```
Project { kind: app | folder | board }
```

- **app** — code, a repo, a workshop, App Studio.
- **folder** — documents and files; read-only or one-writer in v1.
- **board** — work items only.

A project has members, roles, a board, a channel and resources. Work items
scope to `project:<id>`. The UI can still say "Apps" and "Folders"; the model
is one thing.

**Location rule:** projects live at `data/projects/<id>/`, at the top level. A
"personal workspace" is a filter (`ownerUserId == me`), not a directory. If
projects lived inside a person's folder, sharing would mean moving the folder
and breaking git remotes, worktrees and links.

**Membership rule:** the channel is the lobby. Adding someone to the channel
grants them a role; removing them revokes it. Nobody can grant a role higher
than their own, and no agent exceeds its owner (D18).

## 10. How work moves

```
Notice -> Intake -> Triage -> Ready -> Claim -> Work -> Evidence -> Review -> Done
                                  |                              |
                                  +---------- Blocked -----------+
```

- **Intake:** three doors; Edge drafts the fields.
- **Triage:** type, severity (bugs), priority, effort; a human confirms.
- **Ready:** DoR passes; no open decision blocks it.
- **Claim:** one owner, one writer; an agent gets a worktree.
- **Evidence:** diff, test output, screenshot, log.
- **Review:** a human accepts; no evidence, no review.
- **Done:** human acceptance; the decision and memory are written.

The social loop is separate:

```
Find -> Befriend -> Share -> Collaborate -> Publish
```

Friendship enables conversation. A project grant enables work. Publishing puts
a copy in the catalog. None of these implies the others.

## 11. Principles

1. **The tree is the truth.** Views are derived and rebuildable.
2. **The server owns the state.** Agents get tools, never the files.
3. **One writer at a time.** Revisions, locks and atomic writes, not hope.
4. **Agents propose; humans confirm.** Triage, Done, publish and delete are
   human acts.
5. **The UI is a view.** Closing the pane does not stop the work.
6. **Sharing is explicit.** A friend sees nothing until a project is shared.
7. **Scope is enforced server-side.** Prompt text is not a security boundary.
8. **Every agent action is attributed.** Real actor, real session, real grant.
9. **Edge is optional.** The product works without its conversational layer.
10. **Memory is portable.** Files in the workspace, not only in a vendor.
11. **Local-first, remote-capable.** The PC is the origin; the phone is a view.
12. **Do not break user work.** No destructive edit without confirmation.

## 12. What FoundationOS is not (v1)

- Not a public social network. Friends exist for collaboration.
- Not a global marketplace. The catalog is per server, admin-approved.
- Not a multi-tenant SaaS. One server, a few accounts.
- Not a replacement for GitHub. Git is the versioning layer.
- Not a real-time document suite. Folder projects are read-only or one-writer.
- Not an E2E encrypted messenger. Server-stored, policy + audit.
- Not a container platform. Worktrees first; containers only if isolation fails.
- Not a place where an admin silently reads private work.

## 13. Current state (honest)

**Exists today:** the FoundationOS server and explorer, the app launcher and
shell, Edge chat with a Hermes provider and a working OpenCode ACP provider, the
mode router, the SCR store and the App Studio shell.

**Verified:** OpenCode ACP end to end; the rules-based mode router; the UI is
embeddable; Cloudflare is the chosen network path.

**Not built:** setup/login, accounts, server roles, projects, the project
channel, the typed work store, the workshop supervisor, notifications, the
catalog, friends, DMs, agent messaging.

**First executable item:** `W-32` — move the workspace to `C:\FoundationOS`.
Then `W-25` (baseline commit), `W-31a` (identity + project schema), `W-06a`
(atomic store), `W-31b` (auth), `W-34` (setup/login pages). See
`harness-strategy/07-work-items.md`.

## 14. What "it works" looks like

- A fresh install opens setup, creates the owner, and closes setup for good.
- Two people share a project; both agents work in separate worktrees; one
  reviews and merges without the other's edits being overwritten.
- Adding someone to the channel gives them access; removing them takes it away
  after a confirm that names what is lost.
- A bug filed from the current screen arrives with scope, route, version and a
  screenshot; triage takes one confirmation.
- A job finishes while the pane is closed; the inbox and a toast say so.
- The server restarts mid-job; it resumes up to three times, then fails loudly.
- A stranger gets **404** for the project, its items, its channel and its
  workshop — not 403.
- A friend request, a DM and a project share are three distinct actions.
- An app can be published, reviewed, installed and updated as a copy.
- A phone can see status, approve, and read the inbox without a terminal.
- The UI still works with Edge offline.

## 15. Open questions

1. **Admin visibility:** should an admin see project *names*, or only counts
   and sizes? (Lean: counts only.)
2. **Catalog runtime:** static-only in v1, or sandboxed server-side apps?
   (Lean: static only; revisit when someone needs a server.)
3. **Channel count:** one channel per project, or more? (Lean: one plus DMs.)
4. **Folder projects:** read-only for guests, or check-out/check-in from day
   one? (Lean: read-only first, one-writer next.)
5. **Availability:** PC-only is decided; do we ever add an always-on relay?
   (Lean: not in v1; state "online when the machine is on".)
6. **Local mode:** does the downloadable interface ever run against a local
   tree without a server? (Lean: later, if at all.)

## 16. Where the detail lives

| Question | File |
| --- | --- |
| The organized "what it is" notes | `foundationos/README.md` |
| What is on disk | `foundationos/architecture/01-tree.md` |
| How writes stay safe | `foundationos/architecture/02-store.md` |
| Accounts, roles, invites, 404 | `foundationos/architecture/03-identity.md` |
| Projects, the lobby, sharing | `foundationos/architecture/04-projects.md` |
| Agents, worktrees, Edge | `foundationos/architecture/05-agents.md` |
| Setup, login, join | `foundationos/surfaces/01-first-run.md` |
| Home and shell | `foundationos/surfaces/02-shell.md` |
| Workshop pane | `foundationos/surfaces/03-workshop.md` |
| Intake and triage | `foundationos/surfaces/04-intake.md` |
| Channels and DMs | `foundationos/surfaces/05-channels.md` |
| Catalog | `foundationos/surfaces/06-catalog.md` |
| Decisions and why | `harness-strategy/01-decision-log.md` |
| Requirements for release 1 | `harness-strategy/06-prd-draft.md` |
| Social/server requirements | `harness-strategy/19-prd-server-and-social.md` |
| Ordered work | `harness-strategy/07-work-items.md` |
| Triage rules and the PDF | `harness-strategy/09-triage-guide.md` |
| Agent protocol and `STATE.md` | `harness-strategy/10-agent-protocol.md` |
| Memory design | `harness-strategy/11-memory-expanded.md` |
| Git, worktrees, one writer | `harness-strategy/14-versioning.md` |
| Cloudflare and remote access | `harness-strategy/15-cloudflare.md` |
| Notifications and jobs | `harness-strategy/18-notifications.md` |

---

**Change rule:** this file is edited when the product definition changes, not
when a task moves. A change here must be reflected in the decision log and the
affected doc in the same pass.
