# Ordered work items

**Status:** PROPOSED — not approved, not started. Derived from
`06-prd-draft.md` and `19-prd-server-and-social.md`; typed with the taxonomy in
`09-triage-guide.md`; sized with the agent-effort rubric in `12-effort-rubric.md`.

**Reordered 2026-11-25** after D16 (project umbrella), D18 (channel is the
lobby) and D21 (first run). The channel moved into the spine because it is the
membership surface, not a chat feature added later.

## How we split

Types (one word, one meaning — `09` §3):

- **Feature** — a capability that did not exist.
- **Enhancement** — `new` (additive inside an existing feature) or `improve`
  (make existing behaviour better).
- **Bug** — promised or previously working, now wrong.
- **Enabler** — unlocks other work, no user-visible behaviour on its own. Must
  name what it unblocks.
- **Dev Task** — work that must happen with no user-visible change (build, QA,
  spike, refactor, infra, docs, dependency).

Rules for every item:

1. One sentence of intent, one testable acceptance, one evidence command.
2. **No Ef-5 in the queue.** Ef-5 means "split me first"; every row is Ef-4 or
   easier.
3. Done = behaviour verified live + `npm run check` + `npm test` + docs updated
   + evidence attached. Not "code written".
4. If it touches a decision still `OPEN` in `01`, it waits.
5. **Priority orders; effort sizes.** Never "it's easy, do it first".

## Phase 0 — ground, identity, store

| Order | ID | Type | Title | P | Ef | Depends |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | W-32 | Dev Task | Move the workspace to `C:\FoundationOS`; update paths, shortcuts, tests | P-1 | Ef-3 | — |
| 2 | W-25 | Enabler | Baseline git commit, ignore rules, `git init` per new project | P-1 | Ef-2 | W-32 |
| 3 | W-31a | Enabler | Identity + project schema (`workspaceId`, `createdBy`, `projectId`, `ownerUserId`, `kind`) | P-1 | Ef-4 | W-25 |
| 4 | W-06a | Enabler | Store: atomic writes, bounded lock, dated backups | P-1 | Ef-4 | W-25 |
| 5 | W-31b | Enabler | Auth backend: sign-in/out, sessions, revocation; no anonymous writes | P-1 | Ef-4 | W-31a |
| 6 | W-34 | Feature | First-run: setup, login, join by invite (`/setup`, `/login`, `/join`, `/s`) | P-1 | Ef-4 | W-31b |
| 7 | W-31c | Enabler | Grants, roles, ceiling rule, server-side 404 | P-1 | Ef-4 | W-31b |
| 8 | W-06b | Enabler | Typed schema, `revision`, `requestId` receipts, project-scoped | P-1 | Ef-4 | W-06a, W-31a |
| 9 | W-31d | Feature | Invites: server + project, link/QR, expiry, revoke, audit | P-1 | Ef-4 | W-31c |
| 10 | W-31e | Dev Task | Cross-project 404 tests: project, items, channel, workshop | P-1 | Ef-3 | W-31c |
| 11 | W-31f | Dev Task | Migrate existing apps/items into projects | P-1 | Ef-3 | W-31a |
| 12 | W-07 | Feature | Triage form + generated Triage Guide PDF | P-1 | Ef-4 | W-06b |

W-31a-c and W-06a/b unblock every work-state feature and every agent write.
Nothing else starts until 1-9 are true. W-31d/e/f can run alongside W-07.

## Phase 1 — the project spine

| Order | ID | Type | Title | P | Ef | Depends |
| --- | --- | --- | --- | --- | --- | --- |
| 13 | W-02 | Enabler | Harness supervisor: start/stop/status, scoped cwd, process tree | P-1 | Ef-4 | W-25 |
| 14 | W-03 | Enabler | Host proxy on 4317: HTTP + WebSocket, one origin per instance | P-1 | Ef-4 | W-02 |
| 15 | W-05 | Enabler | Safety rail: loopback bind, auth gate, kill switch, badge | P-1 | Ef-4 | W-03 |
| 16 | W-04 | Feature | Workshop pane: chrome, starting/ready/crashed, pop-out | P-1 | Ef-4 | W-03, W-05 |
| 17 | W-35 | Feature | Project members + invite dialog (link + QR); channel membership = grant | P-1 | Ef-4 | W-31d, W-04 |
| 18 | W-36 | Feature | Project channel: messages, system cards, membership events | P-1 | Ef-4 | W-31c, W-35 |
| 19 | W-40 | Feature | Admin console: accounts, server invites, suspend, reset | P-1 | Ef-4 | W-31c, W-31d |
| 20 | W-09 | Feature | App Studio one page: Brief, Plan, Workshop + file handoff | P-1 | Ef-4 | W-04, W-07 |

W-05 ships **with** W-03, never after. W-35 and W-36 are one idea in two
surfaces: the member list and the conversation are the same `grants.json`.
W-40 exists because the owner must be able to create the second account
without editing a file.

## Phase 2 — work that survives the pane

| Order | ID | Type | Title | P | Ef | Depends |
| --- | --- | --- | --- | --- | --- | --- |
| 21 | W-27 | Feature | Three intake doors over one schema, scope pre-filled | P-2 | Ef-4 | W-07 |
| 22 | W-14a | Enabler | Durable job record + state machine (`running`, `review`, …) | P-1 | Ef-4 | W-02 |
| 23 | W-14b | Feature | Inbox, rail badge, project-card job status, Edge system note | P-1 | Ef-3 | W-14a |
| 24 | W-14c | Enabler | Restart/resume: revision check, 3 resumes, backoff, crash guard | P-1 | Ef-4 | W-14a |
| 25 | W-14d | Feature | Browser/Windows notifications, escalation, quiet hours | P-2 | Ef-3 | W-14b |
| 26 | W-08a | Enabler | Agent protocol read verbs + generated `STATE.md` | P-1 | Ef-4 | W-06b, W-31c |
| 27 | W-08b | Enabler | Agent protocol write verbs: idempotency + revision checks | P-1 | Ef-4 | W-08a |
| 28 | W-24 | Dev Task | Prompt pack for agents with no MCP | P-2 | Ef-3 | W-08a |
| 29 | W-10 | Feature | Agent registry + routing (pin > surface > job offer > default) | P-2 | Ef-4 | W-08a |
| 30 | W-11 | Enabler | File-based memory + brief assembly (`BRIEF/PLAN/MEMORY/DECISIONS`) | P-2 | Ef-4 | W-06b, W-10 |
| 31 | W-12 | Enabler | Lifecycle: job-aware reaper, boot orphan cleanup, concurrency cap | P-2 | Ef-4 | W-02 |
| 32 | W-13a | Enabler | Pair-link injection into the embedded pane (happy path) | P-2 | Ef-4 | W-04 |
| 33 | W-13b | Enabler | Session survival across refresh/device, revocation | P-2 | Ef-4 | W-13a |
| 34 | W-26a | Enabler | Worktree per job in the supervisor | P-2 | Ef-4 | W-25, W-02 |
| 35 | W-26b | Feature | Diff review / Apply / Discard, with stale-base refusal | P-2 | Ef-4 | W-26a, W-14a |
| 36 | W-15 | Feature | Role templates (builder / QA / reviewer) + workshop status | P-2 | Ef-4 | W-04 |
| 37 | W-19 | Feature | QA evidence loop: `system/qa/`, project-card summary, fail → item | P-2 | Ef-4 | W-13a, W-15 |
| 38 | W-30 | Enabler | Cut Edge chat over to OpenCode (`edge-chat` + `studio`), recall gate | P-2 | Ef-4 | W-10, W-11 |

W-14c is the requirement you stated: resume automatically, retry up to 3 times,
then notify. W-14b makes the result visible on a phone without opening a pane.
W-26a/b are the two-agent case: separate worktrees, one merge queue.

## Phase 2.5 — people and conversation

| Order | ID | Type | Title | P | Ef | Depends |
| --- | --- | --- | --- | --- | --- | --- |
| 39 | W-37 | Feature | Friends + DMs: exact `@username`, accept, block, send | P-2 | Ef-4 | W-31c, W-36 |
| 40 | W-38 | Feature | Agent messaging: draft/approve, trusted auto-send, system events | P-2 | Ef-4 | W-37, W-08b |
| 41 | W-41 | Feature | Audit log UI: admin actions, visible to the affected user | P-2 | Ef-4 | W-40 |
| 42 | W-42 | Feature | Home: My / Shared with me, role chips, member count, job pill | P-2 | Ef-4 | W-31c, W-14b |

## Phase 3 — catalog and reach

| Order | ID | Type | Title | P | Ef | Depends |
| --- | --- | --- | --- | --- | --- | --- |
| 43 | W-39 | Feature | Catalog: submit snapshot, review checklist, install as a copy | P-2 | Ef-4 | W-26b, W-31c |
| 44 | W-16 | Enabler | Host routing, cookie scope, trust proxy, per-host auth | P-2 | Ef-4 | W-05, W-13b, W-31c |
| 45 | W-28 | Dev Task | Cloudflare DNS cutover + tunnel service + cellular test | P-2 | Ef-3 | W-16 |
| 46 | W-17 | Enhancement (improve) | Suggestion chips: static + contextual, three states | P-2 | Ef-3 | — |
| 47 | W-18 | Enhancement (improve) | Mode auto-switch with undo + mismatch log | P-2 | Ef-3 | — |
| 48 | W-20 | Enabler | Generalise launch to `static / dev / harness / external` | P-3 | Ef-4 | W-04 |
| 49 | W-21 | Feature | Approval cards for `ask` mode (inbox + harness UI) | P-3 | Ef-4 | W-13b, W-14b |
| 50 | W-01 | Dev Task | Remaining fact-finding: Hermes memory export, DSH embed probe | P-3 | Ef-2 | — |
| 51 | W-22 | Enabler | Second harness (DSH) behind the same supervisor interface | P-4 | Ef-4 | W-08b |

## Why this order

- **1-2 first** because a workspace inside OneDrive cannot be trusted with git,
  and worktrees cannot branch without a commit.
- **3-8 before everything else** because identity, tenancy and the project
  umbrella must be in the schema from the first write. A store that starts
  single-user and grows `workspaceId` later is a data-leak generator.
- **6 before 7** because a login page is the fastest way to test sessions; a
  grant check with no way to sign in is unprovable.
- **9-11** make sharing real: invites, access tests, migration.
- **17-18 are one idea.** The member list and the channel are the same grants;
  shipping one without the other creates two truths about membership.
- **19** because the owner cannot run a server by editing JSON.
- **21-38** are the work-state and agent track. They meet the project spine at
  20 (App Studio) and 38 (Edge cutover).
- **22-24 before 25** because an inbox without a durable job record is a toast
  with extra steps.
- **34-35 after 22-24** because a worktree without a job record has nothing to
  attach its diff to.
- **39-40 after 18 and 27** because messaging needs a channel and an agent that
  can write.
- **43 after 35** because a catalog snapshot comes from a reviewed repo.
- **44-45 last in the P-2 band** because exposure is a security change; it
  ships only after auth, host routing, grants and the kill switch are proven
  locally.
- **46-47 are small and unblocked** — good parallel work.
- **51 is P-4** because a second harness is only worth it if OpenCode fails.

## Acceptance sketches (Phase 0–1)

**W-32**
The workspace runs from `C:\FoundationOS`; `npm run check` and `npm test` pass;
no path points at the old OneDrive folder; shortcuts still work.
Evidence: test output + a `Select-String` for the old root + a launch screenshot.

**W-25**
`git status` is clean after the baseline commit; `node_modules`, runtime state
and secrets are ignored; a new project gets `git init` + one commit.
Evidence: `git log --oneline`, `git status`, a fresh project's first commit.

**W-31a**
A new account gets a personal workspace; every project and item row has
`workspaceId`, `createdBy` and (for project rows) `projectId`; every project
has `ownerUserId` and `kind`. A row without them is rejected.
Evidence: schema tests + a created account/project/item.

**W-06a**
Kill the server mid-write; the file is valid JSON after restart. Two writers:
the second waits, then succeeds or times out with a clear error. A dated backup
exists.
Evidence: crash test + two-process test + backup listing.

**W-31b**
A logged-out request to any write endpoint returns 401. Sign-out revokes the
session; the old cookie no longer works.
Evidence: three failing requests + one revoked-session test.

**W-34**
A fresh data folder redirects `/` to `/setup`; setup creates the owner; `/setup`
then returns 404; a server invite works once; an expired share says "expired".
Evidence: the six-step walk + the invite-twice test.

**W-31c**
Owner invites a member to Weather; the member can read and file items but
cannot publish. A viewer can read but not write. A stranger gets 404, not 403.
Evidence: role matrix test + a stranger's 404.

**W-06b**
A bug requires repro/expected/actual; a feature refuses them. The same
`requestId` twice returns the first acknowledgement. A stale
`expectedRevision` is refused, not silently applied.
Evidence: one test per rule.

**W-31d**
An invite link works once; a second redemption fails. It expires, can be
revoked, and the QR encodes the same token. The token is not stored in plain
text.
Evidence: redeem-twice + expiry + a file check.

**W-31e**
An account without a grant tries the project page, the item API, the channel
and the workshop URL; all four return 404.
Evidence: the test output with all attempts.

**W-31f**
Existing apps and items appear as projects under the first personal workspace,
owned by the current user; no item is orphaned and no `projectId` is null.
Evidence: migration report + counts before/after.

**W-07**
The form renders conditional fields per type; the generated PDF matches the
schema field-for-field (a test compares them).
Evidence: PDF diff test + a filed bug and feature.

**W-02**
Start Weather → a process exists with `cwd` = the Weather folder, bound to
127.0.0.1. Stop → the process *and its children* are gone. Restart → same port,
no orphan.
Evidence: supervisor log + `Get-Process` before/after + a port bind check.

**W-03**
One origin per instance; HTTP and WebSocket both proxy; a request without a
session gets the login redirect, not a shell.
Evidence: a proxied GET, a WebSocket echo, and a logged-out request.

**W-04**
Start → ready in under 15 s warm; close the tab mid-job → the job continues and
the card shows `working`; stop → children gone.
Evidence: timing log + a job that outlives the tab + `Get-Process`.

**W-35**
Adding Bob to the channel grants him `member`; removing him revokes it after a
confirm that names the loss; a member cannot grant `admin`.
Evidence: three role tests + the confirm copy.

**W-36**
A message appears for every member; a membership change writes a system card;
a viewer can read but not post.
Evidence: two clients, one channel + the system card + a viewer's refused send.

**W-40**
The owner creates an invite, sees it listed, revokes it; a suspended account
cannot sign in and its agents stop.
Evidence: console walk + a suspended sign-in attempt.

## Carried from existing SCRs (do not duplicate)

| SCR | Relationship |
| --- | --- |
| `4d0fc83b` Replace Hermes Edge backend with OpenCode | Provider seam, ACP execution and live proof are **done**. Remaining: W-30 cutover + recall test (W-01) |
| `e5bf53c4` Auto-switch Edge mode from the v0 router | Same work as **W-18**; close one when the other lands |
| `930e21cc` Edge avatar and offline header look broken | Overlaps **W-17** (offline state must read as a status, not an error) |
| `4f719801` Edge living modes | Mode shell shipped; W-18 finishes the idea |

## Explicitly not on the list

- Flipping the default provider to OpenCode before W-30 and the recall test.
- Deleting the App Studio stages before W-04 replaces them.
- Any change to `system/dist` publish semantics.
- E2E DMs, group chat, threads, reactions, a global marketplace, federation.
- Server-side catalog apps without a sandbox (N5 keeps v1 static).
- SSO, billing, custom roles and per-tenant branding (Phase 3+).
- Containers per job. Worktrees first (`14`); revisit only if isolation fails.
- Local mode for the downloadable interface (D20: later).
- The multi-server directory at `os.` (`15` §7).
