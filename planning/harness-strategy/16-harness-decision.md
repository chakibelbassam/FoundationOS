# Decision brief: which harness powers Edge and App Studio

Status: **recommendation**, for your approval.

## 1. The question

Should FoundationOS run on **one** harness (OpenCode) for both Edge chat and
App Studio, or keep **Hermes** for chat and use OpenCode only for building?

Your instinct: "Edge is just agent files, memory, instructions and skills — a
folder structure. A harness operates from it. OpenCode can connect to that
folder; Hermes has its own memory system."

That instinct is correct, and the code agrees.

## 2. What Edge actually is today

| Part | Where it lives | Owner |
| --- | --- | --- |
| Role and rules | `system/agents/Edge.md` | us (a file) |
| Tool instructions | `system/agents/FoundationOS.md`, `AGENTS.md` | us (files) |
| Transcript | `edge/store.mjs` (JSON per scope) | us |
| Memory | Hermes session, keyed by `X-Hermes-Session-Id` | **Hermes** |
| Tools | none | — |

`Edge.md` even says it: *"Keep this role independent of the tool hosting the
session."* The design intent was always harness-agnostic. The only thing that
is not ours is the memory — and that is exactly the tie.

## 3. What each harness provides (verified in our code)

**Hermes** (`providers/hermes.mjs`)
- Local gateway on `127.0.0.1:8642`, bearer key, OpenAI-compatible streaming.
- Memory lives behind `X-Hermes-Session-Id` / `X-Hermes-Session-Key` — server
  side, opaque to us.
- We inject `Edge.md` as a system prompt and send **only the current message**.
- No tools in this integration: it can talk, not act.
- Requires a separate gateway process and key to be running.

**OpenCode** (`providers/opencode.mjs`, CLI 2.4.1)
- ACP: `initialize` -> `session/new` (cwd-scoped) -> `session/prompt`.
- Sessions are per project folder; `--session <id>` resumes or creates.
- `--agent` selects a profile; `--model` selects a model per profile.
- `--worktree` starts a session in a git worktree (isolation).
- Tools, MCP, plugins, `AGENTS.md` auto-load, and a web UI we can embed.
- One binary; no key of ours; the user's own auth/model config.

## 4. Comparison

| | Hermes | OpenCode |
| --- | --- | --- |
| Memory | **native, per session, good (unverified by us)** | ours (files) + session |
| Can act | no | yes |
| Tool safety | n/a (none) | permission levels |
| Scope to a folder | prompt-only | `cwd` enforced |
| Session continuity | automatic | must persist a session id |
| Latency | local stream, fast first token | ~2 s warm, ~12 s cold spawn |
| Model choice | gateway's model | per agent/model |
| Ops | extra gateway + key | one binary |
| Upgrade risk | gateway API | CLI/ACP version |
| Simplicity | two systems | **one system** |

## 5. Options

**A. OpenCode everywhere, two profiles** *(recommended)*
- `edge-chat`: read-only tools, cheap fast model, workspace scope, file memory,
  persistent session.
- `studio`: full tools inside one app folder, `--worktree`, stronger model.
- One provider, one session model, one folder convention, one upgrade surface.

**B. Hermes for chat, OpenCode for work** *(today)*
- Keeps Hermes' memory for free.
- Two memory systems, two session models, a handoff brief on every transition,
  two failure modes, and chat cannot act even when acting is one click away.

**C. Hermes chat + file memory bridge**
- Keeps Hermes but writes every decision to `MEMORY.md` so a switch is possible.
- Still pays for two integrations; the bridge is only worth it if Hermes memory
  proves materially better.

## 6. Recommendation

**Adopt A: OpenCode is the only harness.** Reasons:

1. **Edge is a folder.** OpenCode operates from a folder and reads `AGENTS.md`.
   Hermes consumes a prompt and keeps memory elsewhere; the folder is not the
   source of truth.
2. **One memory system.** Ours, as files, portable, inspectable, exportable.
   No handoff summaries, no split brain.
3. **One capability ladder.** Chat today is read-only; tomorrow the same agent
   can act. With two engines, "Edge, fix it" always needs a handoff.
4. **One upgrade and one failure surface.** We already proved ACP end to end.
5. **You are already leaning this way**, and the cost of maintaining Hermes as
   a second-class path is real.

**What we give up, honestly:**

- Hermes' memory quality. We have not measured it. Mitigation: a 10-question
  recall test (below) before deleting Hermes.
- Fast, simple text streaming. Mitigation: keep one ACP child alive per scope
  instead of spawning per turn.
- A chat path with no tools at all. Mitigation: `edge-chat` profile is
  read-only; writes require the studio profile.

## 7. How we would implement it

**Phase 1 — parity (no UI change)**
1. Add `FOUNDATIONOS_EDGE_AGENT=edge-chat` and persist `sessionId` per scope in
   the store.
2. Keep one ACP child per scope alive (a small runtime registry, same pattern
   as the harness supervisor), so turns are warm.
3. Assemble the prompt from files: `system/agents/Edge.md` + scope `AGENTS.md`
   + `MEMORY.md`/`DECISIONS.md` (see `11`).
4. Send the last N turns as context on the first prompt of a session; then rely
   on the session.

**Phase 2 — memory as files**
5. `MEMORY.md` / `DECISIONS.md` writer on decision and handoff events.
6. Nightly compaction with a visible diff.

**Phase 3 — cutover**
7. Default provider = `opencode`. Hermes stays selectable by env for rollback.
8. Delete Hermes only after the recall test passes for two weeks.

**App Studio uses the same engine with a different profile:**

```
edge-chat : scope = workspace (or app), tools = read,  model = fast
studio    : scope = app folder,        tools = auto,  worktree = on
```

No second integration, no handoff brief between "chat brain" and "build brain"
— just two agents on the same runtime.

## 8. The test that decides it

Before removing Hermes, run the same 10 questions against both:

1. "What did we decide about subdomains yesterday?"
2. "Which app was blocked on QA?"
3. "What is the naming rule for work items?"
4. "Why did we reject path-based proxying?"
5. "What did I say about card flip behaviour?"
6. "Which folder holds the weather sample data?"
7. "What is Ef-2?"
8. "What did we decide about AgentHub?"
9. "Which harness did we choose and why?"
10. "What is the next work item?"

Score: correct, correct-with-hedge, wrong. OpenCode must reach parity using
file memory. If it cannot, keep Hermes for chat (option B) and say so.

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| ACP changes between CLI versions | Pin the version; keep the provider seam |
| Chat latency from spawning | Persistent ACP child per scope |
| Tool misuse in chat | `read` profile; approvals for writes |
| File memory rots | Compaction with a visible diff, size budget |
| We lose Hermes memory we cannot recover | Export before cutover; keep Hermes for 2 weeks |

## 10. Open questions

1. Do you accept "OpenCode only" as the target, with Hermes as a temporary
   fallback?
2. Which model for `edge-chat` (fast/cheap) and which for `studio` (strong)?
3. Is chat allowed to *propose* an edit ("shall I fix it?") even though it
   cannot apply it? (Lean: yes — that is how work gets filed.)
