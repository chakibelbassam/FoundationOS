# Draft PRD — "One workspace, many agents"

Status: **DRAFT v0.1** · Date: 2026-11-25 · Owner: you
Source: brainstorm in this folder · Not approved, not scheduled.

---

## 1. Problem

FoundationOS can host apps, but the work of *building* them happens in a
separate tool. Today "Open in OpenCode" throws you out of FoundationOS into a
desktop app, on one machine, with no connection back to the workspace. Meanwhile
Edge — the assistant inside FoundationOS — runs on a different engine with a
better memory, so the product has two brains, two histories and two places to
look.

We want: one workspace where the conversation, the files, the plan and the
agent that does the work all live together, reachable from any device, with
each engine used where it is strongest.

## 2. Vision

> Any app in the Explorer can open a workshop. The workshop is a real agent
> runtime, hosted by our server, scoped to that app's folder, embedded in our
> shell, and visible from your phone. Edge talks about the work; the workshop
> does it; the plan and the evidence stay in the folder.

## 3. Goals

- G1. A user can go from app card -> workshop -> build -> QA -> publish
  without leaving FoundationOS.
- G2. The same flow works on a phone, a tablet, a laptop and a touch PC.
- G3. One engine (OpenCode) with profiles; the provider seam keeps Hermes as a
  rollback and leaves room for a second harness without a rewrite.
- G4. Memory survives an engine switch. Nothing important lives only in a
  vendor's head.
- G5. Every agent action is scoped to a folder and is visible to the user.
- G6. FoundationOS is the system of record for work: one store, typed items,
  revisions, evidence, and a Triage Guide that matches the schema.
- G7. Any agent (OpenCode, DSH, Claude Code, Codex, ChatGPT) can plug in and,
  in one call, know the state of the workspace and what to do next.

## 4. Non-goals (v1)

- N1. **Superseded (D15):** accounts and invites are now in v1. The tenancy
  shape — shared team workspace vs per-user isolated workspaces vs hybrid — is
  still to be chosen.
- N2. Anonymous or unauthenticated remote access. Authenticated access for
  members is in scope (D11); open doors are not.
- N3. Building a memory service from scratch (see M3 in `02`).
- N4. Replacing the harness UI with our own agent chat. We embed theirs; Edge
  stays ours.
- N5. Containerisation. Processes with a scope and a kill switch are enough at
  this scale.
- N6. Rebuilding SynapsAi's AgentHub delivery pipeline. If it is wanted, reuse
  it (`08`); do not reimplement it in this PRD.

## 5. Users and scenarios

**S1 — "Make the weather app actually work."**
Phone, on the sofa. Opens FoundationOS, taps Weather, taps Workshop. The pane
says "Starting…" then shows the agent. It reads BRIEF.md and PLAN.md, edits
files, runs the app, screenshots it. The user watches, taps Publish. App card
now says "Built 2 min ago".

**S2 — "What did we decide about the card flip?"**
Laptop. Opens Edge, asks. Edge answers from the workspace files (decisions and
memory), not from a vendor's hidden state. No workshop is started; nothing is
spent.

**S3 — "Fix the SCR I filed yesterday."**
Tablet. App Studio shows the open SCR, offers "Plan this" -> a 4-step PLAN.md.
"Open workshop" starts OpenCode at that folder with the plan as its first
message. Approval cards for edits appear in the rail because tool mode is
`ask`.

**S4 — "I only have a phone and I want to see the log."**
The pane shows the instance is running; the server streams its last lines into
the rail. No terminal needed.

**S5 — "I invited a teammate."**
Owner opens Settings, creates a one-time invite (link or QR), sets a role and an
expiry. The teammate redeems it, sees the workspace they were invited to, and
can file and propose work. They cannot publish or delete. The owner sees the
invite as pending, used or revoked, with a last-used timestamp.

## 6. Requirements

Priority: **Must** = without it the PRD fails · **Should** = v1 should have
it · **Later** = after v1. (Work-item priority is a separate scale, P-1..P-5,
in `09`.)

### A. Harness orchestration

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| A1 | Start an OpenCode instance with `cwd` = the pressed app folder, `--standalone`, bound to `127.0.0.1` | Must | D4 |
| A2 | Stop an instance reliably, including child processes, on Windows | Must | D4 |
| A3 | Report state per instance: `starting / ready / crashed / stopped`, with last log lines | Must | D4 |
| A4 | Reuse a running instance instead of starting a second one for the same app | Must | D4 |
| A5 | Reap idle instances after a configurable timeout | Should | D4 |
| A6 | Kill recorded orphans on server boot after a crash | Should | D4 |
| A7 | Cap concurrent instances and show why a start was refused | Should | D4 |
| A8 | Support a second harness type (DSH) behind the same interface | Later | D1 |

### B. Embedded experience

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| B1 | Proxy an instance under `oc-<slug>.<host>:4317` with HTTP and WebSocket support | Must | D4 |
| B2 | Embed the instance in a pane with our chrome: app name, status, stop, pop-out | Must | B1 |
| B3 | Show a real loading state, and a recovery action on crash | Must | A3 |
| B4 | One origin per instance so cookies cannot cross apps | Must | B1 |
| B5 | Get a browser into the instance's auth without manual pairing | Should | B1 |
| B6 | Survive a page refresh without losing the pane or the session | Should | B5 |
| B7 | Reach the same pane from another device on the LAN | Should | B1, DNS |
| B8 | Generalise launch to `static / dev / harness / external` runners | Later | D4 |

### C. Routing and memory

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| C1 | Named agents in config: harness, scope, memory, tools, model, surfaces | Should | D1 |
| C2 | Routing precedence: pin > surface > job offer > default | Should | C1 |
| C3 | Every handoff writes a brief into the app folder | Should | D2 |
| C4 | Read/write `BRIEF.md`, `PLAN.md`, `AGENTS.md` as the portable memory layer | Should | D2 |
| C5 | Time-boxed spike: OpenCode session + memory plugin vs Hermes memory | Should | D2 |
| C6 | A visible "which agent am I talking to" indicator | Should | C1 |
| C7 | Export/import memory so a switch is reversible | Later | D2 |

### D. App Studio

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| D1 | One page per app: Brief, Plan, Workshop. No stage wizard | Must | D5 |
| D2 | Brief and Plan persist to files, and reload after restart | Must | D5 |
| D3 | "Open workshop" starts the instance and seeds one short first message | Must | A1 |
| D4 | Plan items can be filed as SCRs, and SCRs can seed a plan | Should | D5 |
| D5 | QA reports land in `system/qa/` and surface on the app card | Should | D5 |
| D6 | A failed QA check becomes an SCR in one action | Later | D5 |
| D7 | Publish stays a deliberate act, never automatic | Should | D5 |

### E. Edge UI

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| E1 | Auto-switch modes with an undo banner, per D6 rules | Should | D6 |
| E2 | Router is rules-first, with a mismatch log to justify a model later | Should | D6 |
| E3 | Suggestion chips: 3 static + 1 contextual, cached per scope | Should | D7 |
| E4 | Offline shows one "Connect a harness" chip, not silence | Should | D7 |
| E5 | All chips and mode controls are touch, stylus, keyboard and gamepad reachable | Must | — |
| E6 | Approval cards for `ask` tool mode render in the rail | Should | D3 |

### F. Safety

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| F1 | Harness never binds beyond `127.0.0.1`; proxy requires our auth | Must | D4 |
| F2 | Scope is enforced server-side, not by prompt text | Must | D4 |
| F3 | A visible "this agent can edit files" badge on the pane | Must | B2 |
| F4 | Kill switch reachable from anywhere, including another device | Must | A2 |
| F5 | Instance creation is rate-limited | Should | A7 |

### G. Work state and triage

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| G1 | One canonical work store; no second truth beside it | Must | D8 |
| G2 | Typed schema per item (feature / enhancement `new|improve` / bug / enabler / dev task), validated on write | Must | D9 |
| G3 | Every item carries `revision`; writes need `expected_revision` and `request_id` | Must | D9 |
| G4 | Atomic writes, a bounded store lock, and dated backups | Must | D8 |
| G5 | SCR intake with common fields + type-conditional fields (repro only for bugs) | Must | D9 |
| G6 | Severity (Sev 1-5, bugs only), priority (P-1..P-5, all) and effort (Ef-1..Ef-5, all) are separate and required | Should | D9 |
| G7 | Evidence attachments (screenshot, log, link) on every item | Should | G1 |
| G8 | Triage Guide generated from the schema, exportable to PDF | Should | G2 |
| G9 | Migrate the 10 existing SCRs without silent guessing | Should | G2 |
| G10 | Authority matrix enforced: agents cannot accept, publish or delete | Must | D10 |
| G11 | Three intake doors (problem / feature / task) over one schema, scope pre-filled from the screen | Should | G5 |
| G12 | Effort carries its dominant dimension (`effortBasis`) and is never silently changed after work starts | Should | G6 |

### H. Agent protocol

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| H1 | Six `fos_*` tools over MCP stdio: access, manual, state, query, mutate, receipt | Should | G1 |
| H2 | `fos_state` returns the whole workspace picture in one bounded call | Should | H1 |
| H3 | Connector grants: scoped, labelled, expiring, revocable, per installation | Must | H1 |
| H4 | Grants are read + propose only; no accept, publish or delete | Must | G10 |
| H5 | Every agent write records the real actor and session | Should | H1 |
| H6 | Prompt-pack fallback: `AGENTS.md` + generated `STATE.md` for agents with no MCP | Should | H2 |
| H7 | MCP over HTTPS for remote agents (ChatGPT, hosted tools) | Later | I2 |

### I. Remote access

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| I1 | Wildcard DNS and TLS for `*.cebsolutions.dev` (first-level; no `*.fos.`) | Should | D11 |
| I2 | Workshop origins reachable only with a FoundationOS session | Must | B4 |
| I3 | Rate limits on login, instance start and agent writes | Should | I2 |
| I4 | Kill switch usable from a phone | Must | A2 |
| I5 | Cloudflare Tunnel as the only inbound path (no forwarded ports) | Should | I1 |
| I6 | Audit log of instance start/stop and who triggered it | Should | A3 |

### J. Multi-agent workshop

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| J1 | One workshop per app; roles are sub-agents, not extra instances | Must | A4 |
| J2 | Role templates: builder, QA, reviewer | Should | J1 |
| J3 | Workshop status surfaced: idle / working / waiting for approval / finished / failed | Must | A3 |
| J4 | A durable job record that survives the tab and the process | Should | J3 |
| J5 | Notification when a background job finishes (inbox + Edge message + optional OS/browser) | Should | J4 |
| J6 | Restart policy: auto-resume up to 3 times with backoff, then mark `failed` and notify | Should | J4 |

### K. Identity, projects and first run

Added 2026-11-25 (D15). Shape chosen: **T3 hybrid** — personal workspace by
default, explicit per-project sharing. Amended by **D16** (project umbrella),
**D18** (channel is the lobby) and **D21** (first run). Social and catalog
requirements live in `19-prd-server-and-social.md`.

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| K1 | Sign-in, sign-out and session revocation; no anonymous API writes | Must | — |
| K2 | Every project is owned by an account (a personal workspace is a view, not a folder); records carry `workspaceId`, `createdBy`, `projectId?`; projects carry `ownerUserId` and `kind` | Must | K1 |
| K3 | Project roles owner / admin / member / viewer; publish and delete are owner/admin only | Must | K2 |
| K4 | One-time invites (server and project): copy link or QR, expiring, revocable, hashed, rate-limited, audited | Must | K1 |
| K5 | Agent grants belong to a user and project; bounded by that user's role; no ambient authority | Must | K2 |
| K6 | Cross-project access tests: no grant -> 404 for the project, items, channel and workshop | Must | K2 |
| K7 | Audit log for invites, joins, role changes and revocations | Should | K3 |
| K8 | Existing apps/items migrate into projects, current user as owner | Must | K2 |
| K9 | Home separates "My projects" and "Shared with me"; card shows role, member count and job status | Should | K2 |
| K10 | First-run setup, login and join-by-invite; setup exists only while zero accounts exist | Must | K1 |
| K11 | Project channel is the lobby: membership mirrors grants; a member may invite at or below their own role | Must | K3 |
| K12 | Project umbrella: `kind` is app, folder or board; items scope to `projectId` | Must | K2 |

## 7. Phases

| Phase | Contents | Outcome |
| --- | --- | --- |
| **Phase 0 — Proof** | K1-K3, K8, K10, K12, A1-A4, B1-B3, D1-D3, F1-F4, G1-G5, G10, J1, J3 | Setup, login, one project, one invited member, one workshop, typed items |
| **Phase 1 — Usable** | A5-A7, B4-B6, C1-C4, C6, D4-D5, E1-E5, G6-G9, G11-G12, H1-H6, I1-I4, I6, J2, J4-J6, K4-K7, K9, K11 | Daily driver on laptop + phone, agents and members can plug in |
| **Phase 2 — Durable** | B7, C5, C7, A8, B8, D6, E6, H7, I5 | Engine-swappable, remote-capable, evidence-driven |
| **Phase 3 — Scale** | SSO, billing, custom roles, container sandboxing, E2E | Beyond this PRD |

## 8. Success criteria

- Time from a project card to a working agent pane: **under 15 s** on a warm
  start.
- Zero instances left running after "Stop all" and after a server restart.
- A phone on the LAN can open the same workshop URL and see the same session.
- The OpenCode cutover preserves BRIEF/PLAN and the transcript; rolling back to
  Hermes is one environment variable, not a migration.
- No agent ever touches a path outside its project folder (verified by a test,
  not by vibes).
- Suggestion chips render in all three states: ready, starting, offline.
- `fos_state` answers "what should I work on?" in **one** call, under 64 KiB.
- Two concurrent writers on the same item never lose an update: one wins, the
  other gets a stale-revision refusal it can act on.
- Setup creates the owner and then closes; a second visit to `/setup` is 404.
- An account without a project grant cannot read the project, its items, its
  channel or its workshop — verified by a test that tries all four.
- Adding someone to a project channel grants access; removing them revokes it
  after a confirm that names what is lost.
- An invite works once, expires, can be revoked, and leaves an audit row.
- The Triage Guide PDF and the server schema agree on every field (generated,
  not hand-maintained).
- Kill the server mid-job: on restart the job resumes at most 3 times, then
  `failed` with a notification waiting in the inbox — not a silent ghost.
- A phone can see a workshop that is working, waiting for approval, or
  finished, without opening the pane.

## 9. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| OpenCode UI changes between versions | Pane breaks | Pin a version; the pane treats the harness as an external app |
| Auth/pairing cannot survive an iframe | No embedded login | Token injection via proxy (B5 fallback) |
| PC or tunnel offline | Remote access unavailable | Local fallback; inbox shows missed events on wake; no false "always on" promise |
| Tenancy retrofitted into the store | Cross-workspace data leak | `workspaceId` + `projectId` from day one; server-side scope; K6 tests before UI |
| Invite token leaks | Unauthorized access | Hashed, one-time, expiring, rate-limited, audited (K4) |
| Channel-as-lobby surprises people | Removing from chat removes access | Confirm names the loss; system card in the channel (K11) |
| Admin privacy is policy, not crypto | An admin reads files | State it plainly; audit admin actions; E2E is a later, explicit trade (D17) |
| First-run endpoint taken over | A stranger becomes owner | `/setup` only while zero accounts exist; then 404; CLI reset only (D21) |
| Runaway agents | Cost, surprise edits | Idle reaper that respects jobs, cap, `ask` mode, badge |
| Windows process trees | Orphans, port conflicts | Job objects + boot-time cleanup (A6) |
| Concurrent writers corrupt the store | Lost work, silent overwrite | Atomic writes, lock, revisions, receipts (G3/G4) |
| Triage Guide drifts from the schema | Rules ignored | Generate the PDF from the schema; a test compares fields (G8) |
| Coupling to a patched DSH version | Every upgrade is a project | Port mechanics, not the bundle (D12/R1) |
| An exposed workshop is remote code execution | Full machine compromise | Auth on every origin, no 0.0.0.0, kill switch (F1-F4) |

## 10. Open questions

**Blocking Must:**
1. Does the harness pane need to be the *only* thing on screen, or is the rail
   always visible? (Layout decision, affects B2.)
2. Can FoundationOS-level items be shared, or are they always personal?
   (Lean: personal in v1; sharing is per project.)
3. Should a project be transferable between personal workspaces? (Lean: later,
   owner only; not v1.)

**Blocking Should:**
4. What exactly does Hermes memory retain, and can we export it? (Rollback gate,
   not a build dependency.)
5. Do we expose agents over HTTPS now, or ship the export/prompt-pack fallback
   first? (`10`, `15`)

**Non-blocking:**
6. Should the pane hide the harness's own navigation, or show it as-is?
7. Per-project chip suggestions: worth the model call?
8. Should a failed job auto-file an item, or only offer a button? (`18` §9)
9. Email provider/address for escalation and Sev-1? (`18` §9)
10. Does `dsh web` allow embedding? (Only matters if DSH returns as a second
    harness, P-4.)

**Answered since the first draft** (kept so the PRD does not re-litigate them):

- AgentHub is out; FoundationOS owns the work store (D8).
- Work Item is the umbrella; SCR is the intake record (D9).
- Severity is bugs-only; priority and effort apply to every item (D9).
- One timebox: Sprint. PI is removed (`09` §13).
- Cloudflare is the DNS/TLS/tunnel provider; hostnames are first-level (`15`).
- **OpenCode for both** chat and studio, approved; worktree per job (D1/D12).
- **3 resumes** after the first run; inbox + browser + Windows toast (D13).
- **Code moves to `C:\FoundationOS`**, outside OneDrive (D14).
- **T3 hybrid**: personal workspace + explicit project sharing; roles
  owner/admin/member/viewer; invites by link or QR (D15).
- **Project umbrella**: `kind` is app, folder or board; projects live at the top
  level, workspace is a filter (D16).
- **Admin privacy** is policy + audit, not E2E (D17).
- **The channel is the lobby**; a member may invite at or below their own role
  (D18).
- **Messaging ships both modes**: draft/approve and trusted auto-send (D19).
- **One PC origin, two clients**; local mode later (D20).
- **First run** is setup, login and join-by-invite (D21).
- **The tree is the truth**; the index is a rebuildable cache (D22).
- **Edge is optional**; the UI works with it offline (D23).

## 11. Traceability

Every requirement maps back to a decision in `01-decision-log.md`:
A/B/F -> D4, C -> D1+D2, D -> D5, E1-E2 -> D6, E3-E4 -> D7,
F1-F2 also D3 (tool modes), G -> D8+D9, H -> D10,
I -> D11, J -> D4+D13, K -> D15+D16+D18+D21, workshop harness choice -> D12,
repo location -> D14, store and Edge assumptions -> D22+D23.
Server/admin/social/catalog requirements (L/M/N) are traced in
`19-prd-server-and-social.md`.
