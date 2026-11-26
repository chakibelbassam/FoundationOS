# Decision log

Status values: `OPEN` (no lean), `LEAN` (direction agreed, details open),
`DECIDED` (locked, dated), `PARKED` (deliberately later).

---

## D1 — Which engine answers where

**Status:** DECIDED (2026-11-25) — **OpenCode for both** Edge chat and App
Studio, with two profiles (`edge-chat` read-only, `studio` full tools) and
file-based memory. Hermes stays behind the provider seam as a rollback path
until the recall test in `16` §8 passes.

The history below records how we got here.

**2026-11-25:** you asked for a full recommendation (`16-harness-decision.md`).
It recommends **OpenCode for both** Edge chat and App Studio, with two profiles
(`edge-chat` read-only, `studio` full tools) and file-based memory. Pending your
approval; Hermes stays behind the seam for rollback either way.

**What you said:** "OpenCode by default, but an easy mechanism to switch
harnesses for different jobs, different agents. Chat/navigation/projects ->
Hermes because its memory is good. App Studio -> OpenCode and its UI. If
going all-OpenCode in v1 is easier *and* we find a memory plugin, pick that.
DSH is also on the table if it reuses the plugins I already built."

**The real question is two questions:**

1. How many engines do we run at once?
2. What chooses the engine for a given moment?

Options for (1):

| Option | Shape | Cost | Risk |
| --- | --- | --- | --- |
| A. Two engines | Hermes = conversation, OpenCode = workshop | Two integrations, two failure modes | Drift: user repeats themselves across the seam |
| B. One engine, OpenCode | OpenCode everywhere + memory plugin | Depends on plugin quality | Rebuilding memory if the plugin is weak |
| C. One engine, Hermes | Hermes today, stop OpenCode work | Cheap now | Gives up browser/QA, the reason we started |
| D. Three engines | + DSH where its plugins win | Most orchestration | Every new surface x every engine |

Options for (2) — the "easy switch" mechanism:

- **Static env** (today): `FOUNDATIONOS_EDGE_PROVIDER=hermes|opencode`.
  Simple, one global, requires restart. Fine for rollback, useless per job.
- **Registry + rules** (recommended direction): named agents in config,
  each `{ surface, scope, memory, tools, model }`; routing is
  `surface default -> job override -> user pin`. See `02` for the shape.
- **Model router**: a small classifier picks the agent per turn. Powerful,
  non-deterministic, needs an approval story. D6 already leans toward
  "suggest, never hijack", which applies here too.

**Deliberately not decided:** whether DSH joins the registry. It only earns a
seat if it removes the hard problem (memory) or the expensive one (browser
QA). Otherwise it is a third thing to keep working.

**Triggers:** picking B makes `03` (embedded harness) the only UI, no seam.
Picking A keeps the seam and makes handoff summaries a first-class feature.

---

## D2 — Memory across engines

**Status:** RESOLVED by D1 (2026-11-25) — one engine means memory is
**file-based** (L1 transcript + L2 workspace files); OpenCode sessions are a
bonus, not a dependency. The design in `11-memory-expanded.md` still applies.

There were three memory candidates (transcript store, workspace files,
engine-native memory). We currently have #1 only; Hermes brings #3; OpenCode
brings sessions + `AGENTS.md` + plugins; DSH brings sessions + plugins too.

`11` turns this into a concrete design: what gets written, when, by whom, how
it is retrieved, how it is compacted, and how it is exported so a switch is
reversible.

---

## D3 — Can Edge *do* things, or only talk

**Status:** LEAN — you chose C (ask-in-drawer approval) **but want all three
supported**.

That is coherent if we treat it as a **capability level per agent**, not a
global switch:

| Level | Behaviour | Where it fits |
| --- | --- | --- |
| `read` | Look, never change | Edge chat on Home, first contact |
| `auto` | Full trust inside the scope folder | App Studio workshop, explicit "let it run" |
| `ask` | Every tool call surfaces an Approve/Deny card in our UI | Default for anything that edits files |

OpenCode already has `--auto` ("auto-approve permissions that are not
explicitly denied"), so `read`/`auto` are configuration. `ask` is the real
work: we must answer `session/request_permission` over ACP and render it.
That is the piece that unlocks safe building from the chat drawer.

**Open question resolved:** you chose **both** — if the harness UI is running,
the approval appears there; if it is not, we show it in our rail. The rule to
write down is *"the surface that owns the process owns the approval"*, plus a
pending-approval count in our rail so a phone user can see something is
waiting even when the card lives in the harness.

Still open: how we learn about approvals that happen inside an embedded harness
(poll its API, mirror its events, or accept that they are invisible to us).

---

## D4 — "Open in OpenCode" should open OpenCode *inside* FoundationOS

**Status:** LEAN — direction agreed (server-hosted harness, opened from any
device, scoped to the pressed app's folder). Implementation pattern and
phasing are in `03`.

Answered 2026-11-25:

- **One workshop per app**, with **sub-agents** inside it for builder / QA /
  reviewer roles. The URL scheme is therefore per app, not per role.
- **Closing the pane does not stop the agent.** The UI is a window, not the
  engine. This makes notifications and a persistent job record mandatory.
- **The domain exists** (`cebsolutions.dev`, GoDaddy, currently parked), so
  remote access is a TLS/DNS task — see the new section in `03`.
- **Approvals appear in both places**, per the rule in D3.

Correction to earlier notes: the deep link **did** work — it opened a new
session in the desktop app. The problem was never the link; it is that the
harness leaves our shell.

---

## D5 — App Studio: screen or launchpad

**Status:** LEAN — B (hybrid). Brief/Plan stay in FoundationOS, Build/Run/QA
go to the harness. Details and the file-based handoff in `04`.

---

## D6 — Auto-switch Edge modes

**Status:** DECIDED — B: switch, but always show "Edge moved you to X —
undo".

Still open inside B: rules vs model, and how long the undo stays. See `05`.

---

## D7 — Suggestion chips

**Status:** OPEN — explain first, then decide. See `05`.

---

## D8 — One source of truth for work state

**Status:** DECIDED (2026-11-25) — **AgentHub is out; scrum records are in**,
and FoundationOS owns the store.

| Option | Shape | Verdict |
| --- | --- | --- |
| W1 | FoundationOS keeps its store and grows it (types, revisions, receipts) | **Chosen** |
| W2 | Adopt SynapsAi's record model and storage verbatim | Rejected — couples vocabulary and runtime |
| W3 | DSH/SynapsAi is canonical; FoundationOS reads through its API | Rejected with AgentHub |

We copy the *mechanics* (revisions, receipts, access states, authority split)
from SynapsAi, not the bundle. See `08` and `10`.

---

## D9 — Triage Guide is a contract, not a PDF

**Status:** DECIDED (2026-11-25) — the taxonomy is fixed; the PDF is generated
from the same schema the server validates.

Decided:

- **Work Item** is the umbrella; **SCR** is the intake record, not a type.
- Types: **Feature**, **Enhancement** (`new` / `improve`), **Bug**, **Enabler**,
  **Dev Task**.
- **Severity** is bugs-only (Sev 1-5). **Priority** is all items (P-1..P-5).
  **Effort** is all items (Ef-1..Ef-5, originally Ef-1 hardest for an agent; superseded by the owner’s ascending effort scale, Ef-1 lowest through Ef-5 highest).
- Promise vs absence decides Bug vs Enhancement (`09` §3.2).
- The guide is generated; the PDF is an export, never hand-edited.
- Enforce on new writes; backfill the 10 existing records with `type: null`
  and triage them by hand.

Still open: whether effort is visible on the board card (`12` §8).

---

## D10 — Agent protocol

**Status:** LEAN — six `fos_*` tools over MCP (`10`), host-owned storage,
`revision` + `request_id` on every write, agents may propose but never accept
or publish.

**Open:** one MCP server for the workspace with a project selector in the
grant (Lean), or one per app.
**Blocker:** cloud agents (ChatGPT web) cannot reach `127.0.0.1` without a
public endpoint or a manual export.

---

## D11 — Remote access and exposure

**Status:** DECIDED (2026-11-25) — **Cloudflare overall**: authoritative DNS,
Universal SSL, and Cloudflare Tunnel as the only inbound path. No forwarded
ports.

Shape (`15`):

- Hostnames are **first-level** only: `os.cebsolutions.dev` for the shell,
  `oc-<app>.cebsolutions.dev` for workshops, `mcp.` for the agent endpoint.
  Universal SSL does not cover `*.fos.cebsolutions.dev`.
- The origin stays on `127.0.0.1:4317`; `cloudflared` is the only thing that
  reaches it.
- Auth is ours, on every host; the session cookie is scoped to
  `.cebsolutions.dev`, `HttpOnly`, `Secure`, `SameSite=Lax`.
- Cloudflare Access is optional on `os.` only. Never on the workshop wildcard:
  per-host Access cookies would break every embedded pane.
- HSTS only after TLS is proven; rate limits on login and instance start.

**Still open:** is the PC allowed to be the only origin (accept an error page
when it sleeps), or do we want a tiny always-on relay later? Lean: PC only.
**Security consequence unchanged:** every embedded agent is a
remote-code-execution surface. Auth, per-app origins, rate limits and a kill
switch ship *with* exposure, never after it.

---

## D12 — Which harness gets the workshop seat

**Status:** DECIDED (2026-11-25) — **OpenCode for both**, approved. Jobs run in
a **git worktree per job**, not a container. Hermes remains selectable by env
until the recall test passes.

| | OpenCode | DSH + SynapsAi |
| --- | --- | --- |
| Web UI | verified | native |
| Work state | none | scrum + agent hub + evidence |
| Embedding | headers verified friendly | **needs testing** |
| Upgrade cost | pin a CLI | per-version native patches |
| Browser QA | tooling included | independent delivery-preview-browser |

**Why OpenCode wins for us:** Edge is a folder (`Edge.md` + `AGENTS.md`), and
OpenCode operates from a folder; Hermes consumes a prompt and keeps memory
server-side. One engine means one memory system, one capability ladder, one
upgrade surface. The cost is Hermes' memory quality, which we have not measured
— hence the recall test before deleting it.

**Isolation decision:** `opencode --worktree` per job, with a stale-base check
before apply (`14`). Containers are deferred; they are only revisited if
worktrees prove insufficient.

---

## D13 — How you learn a background job finished

**Status:** DECIDED (2026-11-25) — full model in `18-notifications.md`.

- The **job record is the truth**; notifications are a projection.
- Notify only on **needs-you** transitions: review ready, failed after retries,
  approval requested, blocked, Sev-1.
- Channels: in-app inbox (durable), Edge system message, browser notification,
  **Windows toast** when the browser is closed, email for escalation/Sev-1.
- On boot: `running` -> `interrupted`; auto-resume up to **3 resumes after the
  first run** with backoff (5 s, 30 s, 2 min), then `failed` + notification.
  `waiting-approval` never auto-resumes.
- Quiet hours 22:00-08:00, except Sev-1, failure, and approvals that block a
  running job.

**Still open:** email address/provider; whether a failed job auto-files an item
or only offers a button (lean: offer).

---

## D14 — Code lives outside OneDrive

**Status:** DECIDED (2026-11-25) — move the workspace to **`C:\FoundationOS`**;
keep OneDrive for documents and backups.

Git and OneDrive corrupt each other: sync touches `.git` objects while git
writes them, checkouts hit file locks, and conflict copies appear inside
`.git`.

Consequences:

- One migration item moves the workspace, re-creates shortcuts, and verifies
  `git status` + a full test run from the new path.
- OneDrive keeps a **backup copy** (scheduled or manual), not the live repo.
- All docs that assume the OneDrive path get a single "root" variable, so the
  move is a config change, not a rewrite.

---

## D15 — Accounts, sharing and invites (T3 hybrid)

**Status:** DECIDED (2026-11-25) — **T3 hybrid**: every account has a personal
workspace; apps can be shared explicitly; roles are **owner / admin / member /
viewer**; invites are **copy link + QR**. This supersedes PRD non-goal N1.

**Amended by D16 and D18:** "app" now means **project** (`kind: app | folder |
board`), and a member may invite at or below their own role. The rest stands.

The model:

- An **account** owns one **personal workspace** and is its owner.
- An **app** belongs to one workspace. An `appGrants` row shares it with another
  account as `admin`, `member` or `viewer`.
- **Work items inherit the app's access.** FoundationOS-level items (no app)
  are personal in v1.
- An **invite** is app-scoped: one-time, hashed at rest, expiring, revocable,
  rate-limited and audited. The link and the QR encode the same token. No email
  dependency.
- An **agent** is a principal bounded by the human's app role; never a role.

Why T3:

- It fits one server and a few collaborators without building a hosted control
  plane.
- Sharing is explicit per app, so a personal app cannot leak by default.
- T1 (shared team workspace) makes every app visible to every member; T2
  (per-user isolated) is a hosted-product model with tenant scoping everywhere.

What it forces, before the work-store schema is frozen:

- Every record carries `workspaceId` and `createdBy`; app-scoped records also
  carry `appId`. Apps carry `ownerUserId`; workspaces carry their owner.
  `visibility` is derived from the app grant, not typed by hand.
- Every request has an identity; no anonymous writes, including agents.
- Every app route checks the grant server-side and returns **404** without
  access, so app existence does not leak.
- Cross-app access tests are part of the definition of done (W-31e).
- Existing apps/items migrate into the first personal workspace, current user
  as owner (W-31f).

**Still open:** share non-app items later? (Lean: no.) Transfer app ownership?
(Lean: owner only, later.) Groups/teams? (Lean: no; per-app grants only.)

---

## D16 — The project umbrella

**Status:** DECIDED (2026-11-25) — `Project { kind: app | folder | board }`
replaces the app-only model, **before** the work-store schema is frozen.

Why:

- Sharing, permissions, chat, work items and agents all attach to one unit.
- Three shareable things (app, folder, board) would otherwise become three
  permission systems and three invite flows.
- `appId` → `projectId` is a rename plus a filter if done now; a migration of
  every record, grant and job if done later.

Consequences:

- Projects live at `data/projects/<id>/`, at the top level. A personal
  workspace is a **filter** (`ownerUserId`, `grants.json`), not a folder.
- `kind` decides which resources exist: `repo/` + workshop for `app`, `files/`
  for `folder`, items only for `board`.
- Folder projects are **managed folders**: importing copies files in; there is
  no live pointer outside the tree.
- The UI may say "Apps" and "Folders"; the model is one thing.
- W-06b is blocked until this schema exists (it now does).

**Still open:** nesting projects (lean: no); multiple channels per project
(lean: no); public read-only links (lean: no).

---

## D17 — Admin privacy is policy + audit

**Status:** DECIDED (2026-11-25) — not E2E.

- An admin can manage accounts, suspend, reset, see counts and sizes, review
  the catalog, and read the admin audit.
- An admin **cannot** open a project, read a channel or DM, or browse a repo.
- Break-glass, if ever added: a reason, an audit row, and a notice to the
  affected user. It is not a checkbox.
- The UI states the limit and the honest caveat: whoever controls the
  filesystem can read the data.
- E2E DMs are `LATER`; they would cost search and agent access.

Why: a friends server needs a moderation path, but "admin can read everything"
turns a collaborator into a surveillance surface. Policy + audit is the
smallest honest position.

**Still open:** whether an admin sees project **names** (lean: counts only);
how an abuse report is investigated without reading content.

---

## D18 — The channel is the lobby

**Status:** DECIDED (2026-11-25) — channel membership **is** project access.

- Every project gets one channel at creation.
- Adding a person or agent to the channel grants a role; removing them revokes
  it, with a confirm that names what is lost.
- A **member** may invite at `member` or `viewer` only; an admin up to `admin`;
  an owner anything. No grant exceeds the granter's role.
- An agent added to the channel is listed as "Alice's builder (agent)" with a
  grant bounded by Alice's.

This amends D15's assumption that only owner/admin invite.

Consequence to accept: **you cannot be in the conversation without being in the
project.** Private side-conversations are DMs.

**Still open:** whether the owner can leave a channel (lean: no — transfer or
delete the project).

---

## D19 — Messaging ships both modes

**Status:** DECIDED (2026-11-25) — **draft/approve and trusted auto-send**.

- Default: the agent drafts, the human approves, the message is sent as the
  human, tagged **"via Edge"**.
- Auto-send: only for contacts the human marked trusted, and only for job
  events or pre-approved templates.
- System events always send without approval.
- An agent cannot message someone its owner cannot message; blocking a person
  blocks their agents.
- Reading history is opt-in per conversation; send-only is the default.
- Friendship gates DMs; it grants no project access.

**Still open:** whether auto-send can include free prose (lean: no — events and
templates only).

---

## D20 — One PC origin, two clients

**Status:** DECIDED (2026-11-25) — the PC is the only origin; the web shell and
the downloadable `FoundationOS-Interface` are both clients of the same API.

- `os.cebsolutions.dev` serves the shell; `oc-<projectId>.cebsolutions.dev`
  serves workshops; Cloudflare Tunnel is the only inbound path.
- The downloadable client uses the same session/token flow; no bypass.
- "Online when the machine is on" is stated, not hidden.
- Local mode (client against a local tree without a server) is `LATER`.

Why: one origin keeps auth, cookies and the tunnel simple; a second client
forces the API to be the real contract instead of server-rendered HTML.

**Still open:** code signing and auto-update for the downloadable client (lean:
a signed installer first, updates later).

---

## D21 — First run and auth surfaces

**Status:** DECIDED (2026-11-25) — setup, login and join-by-invite are v1.

- `/setup` exists only while zero accounts exist. It creates the owner, the
  personal workspace and the server policy in one transaction; then it 404s.
- `/login` is username + password, generic errors, rate-limited, no email
  dependency.
- `/join/<token>` creates a member from a server invite; `/s/<token>` redeems a
  project share.
- Open registration is off by default (`allowOpenSignup: false`).
- Password reset is an admin-generated one-time link, not email.

**Still open:** a recovery code at setup (lean: yes, shown once); admin session
lifetime (lean: 7 days).

---

## D22 — The tree is the truth

**Status:** DECIDED (2026-11-25) — the data folder is authoritative; the index
is a rebuildable cache.

- Every record is a file; every history is an append-only log.
- The index (SQLite) serves queries and search, never accepts a write the tree
  did not accept, and can be deleted and rebuilt.
- Backup = copy `data/`; recovery = restore the folder.
- If the index and the tree disagree, the tree wins and the index logs drift.

Why: portability, debuggability, agent-native access, and a UI that can vanish
without taking the work with it.

**Still open:** one file per item vs per board (lean: per item); log rotation
(lean: monthly).

---

## D23 — Edge is optional

**Status:** DECIDED (2026-11-25) — Edge is a principal and a conversational
interface, not a dependency.

- Browsing, filing, triage, the channel, the workshop and the inbox all work
  with Edge offline.
- Edge has a folder (`agents/<id>/`) and a grant, like any agent; no god mode.
- Only drafting, delegation and "ask Edge to do it" degrade when it is down.

Why: "Edge is our interface for the most part" is a preference, not an
architecture. If the product dies when Edge does, the folder-structure claim is
false.

**Still open:** whether Edge gets a default grant on every new project (lean:
no — the owner adds it, like any agent).

---

## Standing decisions carried in from earlier work

- SC-1: Hop-back is always possible — nothing in this plan removes Hermes
  as a working fallback until an explicitly approved cutover.
- SC-2: A harness that can run shell commands is a remote-code-execution
  surface. It binds to `127.0.0.1` and is only reachable through our
  authenticated server. No exceptions, including "just for a demo".
- SC-3: No destructive edits to existing app folders. Handoffs add files
  (`BRIEF.md`, `PLAN.md`), they do not restructure user work.

## D24 — Product home and versioned development

**Status:** DECIDED (2026-11-25).

- C:\FoundationOS contains FoundationOS, FoundationOS Server and FoundationOS Development. The first two are reserved for the future runnable client and server, each with one launcher when ready.
- Development owns the shared planning tree and version briefs. Version 0.1 starts as a planning baseline. Future briefs link to the shared planning material.
- The original OpenCode plan and existing OneDrive checkout remain references. This supersedes the earlier W-32 proposal to move the existing workspace.
- The 0.1 starting journey is finding and launching a previously created Weather app. The app folder contract remains open.

**Further direction:** Start with web apps. A signed-in user's OpenCode launch carries app and context in the URL and user identity in the session. How the instance is confined remains open. Explore Edge as a movable return and forward navigation widget, with suggested destinations, dictation and controller input as possibilities. Local operation and os.subsolutions.dev are intended; hosting and routing come later.

**Delivery:** Four sprints are a flexible starting rhythm: implementation, checking, continued work and QA. Research can lead when appropriate. A fifth sprint can follow final QA when enough follow-up work exists. Priority orders work, effort informs capacity and severity informs bug priority. Automated bucket filling remains an idea.
