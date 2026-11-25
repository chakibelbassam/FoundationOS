# Agent integration protocol (how anything plugs into FoundationOS)

Goal: ChatGPT, Claude Code, OpenCode, DSH, Codex — or a future agent — can
connect and immediately know **what FoundationOS is, what exists, what is
running, what is broken, and what to do next**, then propose or record work
without corrupting anything.

## Principle

**FoundationOS owns the state. Agents get tools, never the files.**

This is the rule SynapsAi already proves at scale: its connector "never opens
Scrum storage" and takes no human identity. Copy it.

## Four doors, in order of preference

| Door | Who uses it | Effort | Notes |
| --- | --- | --- | --- |
| **MCP over stdio** | Claude Code, OpenCode, DSH, local agents | Low | Same shape as `Scrum-Mcp.mjs` |
| **MCP over HTTP** | Remote/hosted agents | Medium | Needs auth + a public origin (see domain) |
| **HTTP JSON API** | Our UI, scripts, integrations | Low | Already exists (`/api/<op>`) |
| **Prompt pack (files)** | Anything with no integration | Zero | `AGENTS.md` + `FOUNDATIONOS.md` + generated `STATE.md` |

The prompt pack matters more than it looks: it is the floor. Even a chat window
with a file upload can be useful if `STATE.md` is good.

## The six verbs

Rename from `scrum_*` to `fos_*`, keep the semantics identical.

| Tool | Purpose |
| --- | --- |
| `fos_access` | Who am I, which project, what may I do, when does my grant expire |
| `fos_manual` | Rules for a topic/type before writing (points at the Triage Guide) |
| `fos_state` | **One call to know everything**: workspace, apps, open items, blockers, running workshops, recent decisions |
| `fos_query` | list / get / hierarchy / search, bounded pages, every row carries `revision` |
| `fos_mutate` | create / update / note / attach evidence — needs `request_id` and `expected_revision` |
| `fos_receipt` | Reconcile a lost mutation by `request_id` before retrying |

`fos_state` is the addition that makes this feel like "plug into FoundationOS"
rather than "query a database":

```jsonc
{
  "workspace": { "name": "Chakib", "root": "…", "version": "0.1.0" },
  "apps": [
    { "id": "…", "name": "Weather", "ready": true, "lastQa": "6/6 passed 2h ago",
      "workshop": { "state": "running", "harness": "opencode", "port": 4612 } }
  ],
  "prds": [ { "id": "…", "title": "One workspace, many agents", "status": "draft" } ],
  "items": {
    "open": 14, "ready": 6, "inProgress": 1, "blocked": 2,
    "next": [ { "id": "…", "title": "Harness supervisor", "type": "dev-task", "priority": "P-1", "effort": "Ef-2" } ]
  },
  "decisions": [ { "id": "D4", "status": "LEAN", "question": "…" } ],
  "alerts": [ { "kind": "workshop-crashed", "app": "Weather", "since": "…" } ],
  "yourAuthority": { "read": true, "write": true, "accept": false, "publish": false }
}
```

Keep it under a size budget (SynapsAi uses 64 KiB and refuses rather than
clipping — copy that behaviour).

## The state digest (`STATE.md`)

`fos_state` is for agents that can call tools. `STATE.md` is the same picture
for agents that cannot: a generated file, checked into the workspace, rebuilt
whenever work changes (debounced), never hand-edited.

```markdown
# FoundationOS — state
generated: 2026-11-25T14:32:10Z · store revision 1841 · stale after 5 min

## What this is
One workspace that organizes work. Read `system/agents/FoundationOS.md` first.

## Now
- Running: Weather / builder / 12m / waiting for approval (item #142)
- Next ready: #151 Harness supervisor (P-1, Ef-2, dev-task)

## Apps
| id | name | state | last QA | open items |
| weather | Weather | ready | 6/6 2h ago | 3 |

## Work
- open 14 · ready 6 · in progress 1 · blocked 2 · review 1
- Top of queue: #151, #152, #149 (ordered by priority, then age)

## Decisions pending a human
- D1 harness target (OpenCode recommended) · D13 notifications

## Rules
- Types, severity, priority, effort: `09-triage-guide.md`
- Authority: propose yes; accept/publish/delete no
```

Rules for the digest:

- Stable headings and one fact per line, so an agent can grep it.
- It says when it was generated; an agent must treat a stale digest as a hint,
  not a fact.
- No secrets, no tokens, no transcript, no customer data.
- If it would exceed the budget, drop history first, never the "Now" section.
- It is a **view**. The store is the truth; a digest that disagrees is a bug.

## How a remote cloud agent participates

A hosted agent (ChatGPT web, a cloud Claude) cannot reach `127.0.0.1`. Three
paths, cheapest first:

| Path | What the agent gets | Exposure | When |
| --- | --- | --- | --- |
| **Export / import** | `STATE.md` + selected items as JSON; returns a proposal JSON | none | now |
| **Public MCP over HTTPS** | the six verbs, read + propose, 8 h grant | public endpoint with auth + rate limits | after D11 |
| **Prompt pack only** | the digest pasted or uploaded | none | always |

The import path is deliberately boring: the agent returns

```jsonc
{ "proposals": [ { "kind": "create", "type": "bug", "scope": "app:weather",
  "title": "…", "fields": { … }, "evidence": [ … ] } ] }
```

and a human imports it; every proposal is a draft, never a confirmed item.
This is also the fallback if the tunnel is down, so it is not throwaway work.

If we expose MCP publicly, it goes on its own first-level hostname
(`mcp.cebsolutions.dev`), with its own grant, read-only by default, and a
kill switch. Never the workshop origin, never the shell origin.

## Identity and grants

- Each connector gets a **principal**: `{ agent, installation, workspaceId,
  appId?, projectScope, permissions, expiresAt }`.
- A grant is created by a human and can never exceed that human's app role
  (D15): a viewer's agent cannot write; a member's agent cannot publish.
- Default lifetime **8 hours**; revoked on server restart or by the user.
- A grant can be `read` or `read+propose`; **never** `accept` or `publish`.
- Every record keeps the **real actor** (agent + session). Never impersonate a
  human, never invent a role.
- The token is never returned to the UI — only a reference is.

## Concurrency and durability (this is the real blocker)

Today the SCR store is one JSON file per item, written by one server. Add
agents and embedded harnesses and you get:

- two writers, lost update
- a half-written file after a crash
- OneDrive syncing a lock file mid-write

Required before any agent writes:

1. **Atomic writes**: temp file + rename, never in-place truncate.
2. **A store lock** with a bounded wait (SynapsAi default 30 s).
3. **Revisions**: every item has an integer; writes carry `expected_revision`.
4. **Receipts**: `request_id` -> `{ value, acknowledgement }`, kept per
   principal.
5. **Backups**: a dated snapshot before any migration or bulk change.

## What each agent can actually do today

| Agent | MCP client | Local host reachable | Notes |
| --- | --- | --- | --- |
| OpenCode | yes (MCP servers in config) | yes | We already drive it over ACP |
| DSH | yes (MCP + native plugins) | yes | SynapsAi connector is the reference |
| Claude Code | yes | yes | stdio MCP |
| Codex | configurable MCP | yes | Repo already targets it |
| ChatGPT (web) | connectors require a public HTTPS endpoint | **no** | Needs a tunnel or an export |
| Anything else | no | no | Prompt pack + `STATE.md` |

**Blocker:** a cloud agent cannot reach `127.0.0.1`. The chosen path is a
public MCP endpoint over the Cloudflare Tunnel with its own grant (D11); the
export/import path above is the fallback when the tunnel is down.

## Authority matrix (same as the Triage Guide)

```
create draft        agent yes
propose type/sev    agent yes
confirm triage      human
move to Ready       human
attach evidence     agent yes
move to Done        human
publish build       human
delete              human
```

An agent that believes it finished says "ready for review" and stops. That is
a feature, not a limitation.

## Migration of what exists

Current: `users/<user>/.foundationos-scrs/<uuid>.json` with
`{ id, targetId, path, title, criteria, status, severity, priority, createdAt }`.

Keep the files, add:

```
workspaceId     the owning personal workspace (D15)
createdBy       user id that filed it
appId?          present for app-scoped items; null for FoundationOS-level
type            feature | enhancement | bug | enabler | dev-task
enhancementKind new | improve          (required when type = enhancement)
description     (from criteria today)
userStory, acceptance[], reproSteps[], expected, actual   (conditional)
severity        1-5                    (bugs only)
priority        P-1 .. P-5             (all items, default P-3)
effort          Ef-1 .. Ef-5           (all items) + effortBasis (dominant dimension)
revision        0, 1, 2 …
requestId       last idempotency key
actor           { kind: human|agent, id, session? }
links           { prd?, evidence[], duplicateOf?, unblocks[] }
```

Backfill type from `scope` heuristics + a human pass over the 10 existing
records. Do not guess silently — record `type: null` and let triage fill it.

## Open questions

1. Is the canonical store still **files in the workspace** (portable, visible)
   or a small database? Files match the project's philosophy; they need locks.
2. Should `fos_mutate` support **creating a PRD** and splitting it into items,
   or is PRD authoring human-only? (Lean: agent drafts, human approves.)
3. Do we expose one MCP server for the whole workspace, or one per app scope?
   (Lean: one server; the grant carries `workspaceId` + `appId`.)
4. ChatGPT support: tunnel now, or defer to prompt-pack export?
