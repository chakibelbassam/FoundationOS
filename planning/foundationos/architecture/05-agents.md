# 05 — Agents, worktrees and Edge

**Status:** DECIDED (D1, D12, D19, D23) · 25 November 2026

## 1. An agent is three things

```
identity  agents/<agentId>/agent.json     who it is, whose it is
grant     agents/<agentId>/grant.json     what it may do, where
process   a harness instance               what is running now
```

Plus two folders that are easy to confuse:

| Folder | Contents | Shared? |
| --- | --- | --- |
| **Worktree** | A checkout of the project repo at `agent/<user>/<job>` | Same history, separate files |
| **Private memory** | `agents/<id>/memory/` | Never shared, gitignored |

An agent's *work* is in the project; an agent's *memory* is its own. Mixing
them is how one person's notes end up in another person's repo.

## 2. Grant

```json
{
  "agentId": "01J...",
  "ownerUserId": "01J...",
  "projects": {
    "01JWEATHER": { "permissions": ["read", "propose"], "expiresAt": "..." }
  }
}
```

- Created by a human, bounded by that human's project role (ceiling rule).
- Permissions: `read` (see the project), `propose` (file items, comment, open a
  change in a worktree). `apply` — merging to the canonical repo — is **never**
  granted to an agent; a human applies.
- Default: `read` + `propose`. `propose` requires the owner to be a member+.
- Default lifetime 8 hours; revoked on server restart or by the owner.
- Every request re-checks the **current** grant, not the one at start-up.
- An agent never authenticates as a human and never holds a human session.

## 3. Two agents on one project

This is the case the whole design exists for: Alice and Bob both working on
**Weather**, each with their own agent.

```
projects/01JWEATHER/repo/              the one canonical repo
  ├── worktree  agent/alice/142        Alice's builder
  ├── worktree  agent/bob/143          Bob's builder
  └── worktree  agent/alice/144-qa     Alice's QA, read-mostly
```

- Each job gets a **git worktree** from the project's base revision.
- Neither agent writes the other's worktree.
- A commit is attributed to the agent, with the human as committer/owner.
- The only place two agents' work meets is the **merge queue**.

**Merge queue rules:**

1. One merge at a time, per project.
2. The merge is refused if the base moved since the job started
   (`stale-base`), and the job is re-based or re-run.
3. A human reviews the diff and runs the tests before applying. The reviewer
   cannot be the author's own agent.
4. Apply is a fast-forward or a squash, never a silent force-push.

For **folder** projects git is a poor fit: v1 is read-only for guests, or
check-out/check-in with a single writer lock. Real-time co-editing is `LATER`.

## 4. Delegation

Edge can prompt another agent. That creates a **delegation tree**, not a chain
of authority.

- Every job records `parentJobId`.
- Authority never accumulates: a child's grant is the **intersection** of the
  parent's and the child's own, never the union.
- Depth is capped (2 in v1: Edge → builder → QA).
- A child's failure is reported to its parent and to the human who owns the
  root job.
- An agent cannot delegate to an agent whose owner cannot see the project.

The rule in one line: **an agent can ask, but it cannot lend permission it does
not have.**

## 5. Messaging (D19)

Both modes ship:

| Mode | When | What the recipient sees |
| --- | --- | --- |
| **Draft + approve** (default) | Any human-initiated message | "Alice: …" with a "via Edge" tag |
| **Auto-send** | Only for contacts Alice marked trusted, and only for job events | "Alice's builder: build finished" |
| **System** | Job state changes, invites, failures | A system card, not a chat bubble |

Hard rules:

- An agent never impersonates a human. The tag is always present.
- An agent cannot DM someone its owner cannot DM (not friends, blocked, no
  shared project).
- Reading DM history requires an explicit per-conversation grant; send-only is
  the default.
- Auto-send never applies to a message the agent composed as a human would; it
  applies to **events** and to pre-approved templates.
- Blocking a person blocks their agents too.

## 6. Edge

Edge is the conversational interface **option**, not the server's brain.

- Edge is a principal with a grant, exactly like any other agent.
- Edge's identity, memory and jobs are files under `agents/<edgeId>/`, so it
  can be restarted, inspected, corrected and swapped.
- Edge can use the UI's API and the project's files, but it has no privilege
  beyond its grant.
- **The UI must work with Edge offline** (D23): browse, file, triage, read the
  channel and run a workshop are all Edge-independent. Only drafting,
  delegation and "ask Edge to do it" degrade.
- When Edge is available, it is the fastest path for a phone: speak the intent,
  let Edge navigate and file.

## 7. Memory

| Layer | Where | Written by | Read by |
| --- | --- | --- | --- |
| Project brief/plan/decisions | `projects/<id>/memory/` | humans + agents (propose) | everyone with access |
| Item history | `board/events.jsonl` | server | board, agents |
| Agent private memory | `agents/<id>/memory/` | that agent | that agent only |
| Transcript | harness session store | harness | the agent, on resume |

Memory is **files first**. Engine-native memory is a bonus, never the only
copy. A switch of harness must not lose the brief, the plan or the decisions.

## 8. Failure and resume

- Every job is a durable record (`18-notifications.md`).
- On boot: `running` → `interrupted`; resume up to **3 times after the first
  run**, backoff 5 s / 30 s / 2 min, then `failed` + notification.
- `waiting-approval` never auto-resumes.
- A crash mid-write is safe because of the store's atomic write + idempotency
  (`02`).
- A job that exhausts resumes offers one button: **file an item** with the log
  attached. It does not file silently.

## 9. Open questions

1. Can an agent hold a grant on two projects at once? (Lean: yes, but one
   worktree per project per job.)
2. Should QA agents get `read` + a test-run permission, never `write`? (Lean:
   yes — QA proves, it does not patch.)
3. Merge queue: auto-merge when tests pass, or always human? (Lean: always
   human in v1.)
4. Do agents get their own inbox, or only the owner's? (Lean: their own job
   list; notifications go to the owner.)
