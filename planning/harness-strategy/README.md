# FoundationOS — delivery track

This folder holds the **execution** half of the plan: the PRDs, the ordered
backlog, the triage rules, the agent protocol and the infrastructure notes.

The **product definition** lives one level up in `../FoundationOS.md`, and the
organized architecture/UX notes live in `../foundationos/`. When a doc here and
the product file disagree about *what the product is*, the product file wins.

**Rule for this folder:** a decision only counts as made when it is written in
`01-decision-log.md` with a status of `DECIDED` and a date. Everything else is
a lean, an option, or a question.

**Approved 2026-11-25:** OpenCode for both chat and studio (worktree per job),
T3 hybrid accounts (personal workspace + shared projects, roles, link/QR
invites), 3 resumes then notify, inbox + browser + Windows toast, code moves to
`C:\FoundationOS` outside OneDrive, the **project umbrella** (`app | folder |
board`), **policy + audit** admin privacy, the **channel as the lobby**, both
messaging modes, one PC origin with two clients, first-run setup/login, the
**tree as the truth**, and **Edge as optional**. See D1/D12–D23.

## How we work from here

```
brainstorm (this folder)
   -> PRD draft            (06-prd-draft.md)
   -> PRD approved         (status flips in 01-decision-log.md)
   -> work items           (07-work-items.md, split into feature / enhancement
                            new|improve / bug / enabler / dev task)
   -> ordered queue        (top-down, dependency-aware)
   -> execute, tick off, re-plan when reality disagrees
```

A PRD can be born from this folder *or* from a batch of SCRs. Either way it
must answer: what problem, for whom, what is explicitly out of scope, what
"done" looks like, and which decisions are locked.

## Index

| File | What it covers |
| --- | --- |
| `01-decision-log.md` | D1–D23: what is decided, what is lean, and why |
| `02-harness-routing-and-memory.md` | Which engine answers where, and how memory survives a switch |
| `03-embedded-harness.md` | Running OpenCode/DSH **inside** FoundationOS, server-hosted, any device |
| `04-app-studio.md` | Brief/Plan in FoundationOS, Build/Run/QA in the harness |
| `05-edge-ui.md` | Mode switching (D6) and suggestion chips (D7) |
| `06-prd-draft.md` | Draft PRD: goals, non-goals, requirements, phases, risks |
| `07-work-items.md` | Provisional work-item backlog derived from the draft PRD |
| `08-synapsai-dsh-reuse.md` | What the DSH/SynapsAi bundle already solves, and the cost of reusing it |
| `09-triage-guide.md` | Work-item types, Sev 1-5, SCR form, DoR/DoD, authority (PDF source) |
| `10-agent-protocol.md` | The six `fos_*` tools any agent uses to plug into FoundationOS, plus `STATE.md` and the remote-agent paths |
| `11-memory-expanded.md` | Deep design for memory: layers, write policy, retrieval, export |
| `12-effort-rubric.md` | Ef-1..Ef-5 measured by **agent** difficulty, with dimensions and calibration |
| `13-intake.md` | Three doors, one schema, one-sentence path, interaction rules |
| `14-versioning.md` | Git per app, worktrees per job, one writer, the OneDrive problem |
| `15-cloudflare.md` | DNS, wildcard TLS, tunnel shape, auth/cookies, setup order |
| `16-harness-decision.md` | OpenCode vs Hermes: pros/cons, recommendation, cutover plan |
| `17-old-plan-review.md` | What survives from the earlier ChatGPT plan, what changed, what to answer |
| `18-notifications.md` | Durable job record, resume/retry, inbox, channels, escalation |
| `19-prd-server-and-social.md` | PRD for server roles, admin, friends, DMs, channels and the catalog |
| `Triage-Guide-v0.3.pdf` | Generated draft export of `09`; rebuild with `node build-triage-pdf.mjs` |

## Evidence gathered 2026-11-25 (drives the whole plan)

Read-only checks against the installed OpenCode **v2.4.1** CLI:

```
opencode serve     -> "Start the v2 API and web server"
opencode pair      -> "Print one-time links to connect a browser or app"
opencode service   -> start/stop/status background server
opencode machine   -> "Manage remote machines"
opencode plugin    -> list / add / check  (plugins are a real extension point)
opencode session   -> "List top-level sessions in the current project"
opencode acp       -> Agent Client Protocol server (what Edge uses today)
--auto             -> "Auto-approve permissions that are not explicitly denied"
--server <url>     -> "Connect to a server URL instead of the background service"
--session <id>     -> "Session ID to continue, or to create if it does not exist"
```

Live probe: `opencode serve --hostname 127.0.0.1 --port 4599` returned a real
web UI (`200 text/html`, 9.4 kB, mobile viewport meta) and `/api/info`
returned **401 Unauthorized** — the server has its own auth.

Headers on `/`: **no `X-Frame-Options`**, and the CSP has no
`frame-ancestors` directive. That means the UI is *embeddable*.

`opencode pair` printed a one-time link of the shape
`http://127.0.0.1:<port>/auth/connect/<token>` that "works once and expires
in 5 minutes", and told us remote devices work via
`opencode service set hostname 0.0.0.0`.

**What this means:** the "host the harness on the server, open it from any
device, scoped to an app folder" idea is not something we invent. OpenCode
already ships the pieces. Our job is orchestration, isolation, auth
brokering, and putting it inside our own shell.

## The harness question (updated 2026-11-25)

You asked for "OpenCode by default" and also "Hermes for chat, OpenCode for
App Studio". `16-harness-decision.md` resolves it:

- **Recommendation: OpenCode for both**, with two profiles — `edge-chat`
  (read-only tools, fast model) and `studio` (full tools, worktree, stronger
  model) — and file-based memory.
- **Reason:** Edge is a folder (`Edge.md` + `AGENTS.md`), and OpenCode operates
  from a folder; Hermes consumes a prompt and keeps memory server-side. One
  engine means one memory system, one capability ladder, one upgrade surface.
- **Pending your approval.** Hermes stays behind the provider seam as a
  fallback until the 10-question recall test in `16` §8 passes.

The old working interpretation (Hermes for chat because of its memory) is now
the fallback option, not the default.

## Update after the DSH/SynapsAi review

The race is effectively decided: **AgentHub is out** (D8), so DSH loses its
main differentiator for us.

- **OpenCode**: lighter, stable CLI, web UI verified embeddable, no work-state
  system of its own — we build the work state (`09`, `10`).
- **DSH**: web UI, plugin architecture, Agent Teams, and the SynapsAi bundle
  already provides scrum records, a guarded agent connector, a delivery
  pipeline and browser review — at the cost of per-version native patches.

Details and the three reuse paths: `08`. We port the *mechanics* (revisions,
receipts, access states, authority split) and stay harness-agnostic. DSH remains
a P-4 option behind the same supervisor interface (W-22), not the target.

Two more things changed the plan:

- **Work Items are now a first-class product surface** (`09`, `10`), not just
  a tracking habit. FoundationOS is "a place that organizes work", and agents
  plug into it through six tools.
- **The domain is real** (`cebsolutions.dev`), and Cloudflare is the chosen
  DNS/TLS/tunnel provider — see `15`.
