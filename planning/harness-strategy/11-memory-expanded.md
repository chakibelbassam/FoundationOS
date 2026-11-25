# Memory, expanded (D2)

You asked to expand "the option". There are several, so this document expands
the one the plan leans on (**M2: memory as portable workspace files**, bridged
to whichever engine is answering) and then covers how to inspect Hermes'
native memory so the choice is based on facts.

## What memory actually has to do

Five jobs, not one:

| Job | Example | Best owner |
| --- | --- | --- |
| **Recall decisions** | "We chose wildcard subdomains, not path proxying" | Files (durable, reviewable) |
| **Recall preferences** | "You prefer plain language and no jargon" | Hermes / profile |
| **Recall work state** | "The Weather app is blocked on QA" | Store (live, structured) |
| **Avoid repetition** | "I already explained this yesterday" | Engine memory |
| **Forget correctly** | "That approach was abandoned" | Files with history |

If one system has to do all five, it becomes a database. Splitting them keeps
each simple.

## The design

```
L1  Transcript      users/<u>/.../edge/<scope>.json     already exists
L2  Project memory  <app>/MEMORY.md, DECISIONS.md        portable, human-readable
L3  Engine memory   Hermes / OpenCode sessions           native, opaque
L4  Work state      work items store                     live, structured
```

The prompt for any turn is assembled from L1 (recent), L2 (relevant), L4
(current) — and the engine adds L3 on its own.

### L2 file layout per app

```
Weather/
  AGENTS.md      # how to work here: commands, conventions, do-nots
  BRIEF.md       # why this app exists, who it is for, done-when
  PLAN.md        # current ordered plan + acceptance checks
  MEMORY.md      # durable facts: gotchas, decisions, links
  DECISIONS.md   # append-only: date | decision | why | who
```

Rules:

- `AGENTS.md` is instructions, not history. Stable, short.
- `MEMORY.md` is facts that are still true. Rewritten, not appended.
- `DECISIONS.md` is append-only, never rewritten. It is the audit trail.
- Nothing in these files is secret (see privacy below).

### Example `MEMORY.md`

```md
# Weather — what we know

- Build: `npm run build` writes `system/dist`. Never edit `dist` by hand.
- The app is offline-first; no network calls at runtime.
- Sample data lives in `system/data/sample.json` and is labelled "sample".
- Tablets: the forecast row wraps at 760px; do not add another breakpoint.
- Known trap: `formatDay()` returns UTC dates; the Paris timezone bug came
  from using it for "today".
```

### Example `DECISIONS.md`

```md
## 2026-11-25 — one workshop per app
Why: roles (builder/QA) are sub-agents inside a workshop, not separate URLs.
Who: human. Status: decided.

## 2026-11-24 — sample data must be labelled
Why: reviewers kept mistaking it for real weather.
Who: human. Status: decided.
```

## Write policy (the part that usually goes wrong)

**Do not write on every message.** That produces sludge.

Write L2 only on these events:

1. A **decision** is made (human says "let's do X", or a plan is approved).
2. A **handoff** happens (Edge -> workshop, or workshop -> review).
3. An **SCR is accepted or rejected** (the why matters more than the what).
4. A **session ends** with unresolved context worth keeping (manual, rare).
5. A **trap is discovered** ("the build breaks if X").

Who writes:

- **Edge** drafts the entry, a human confirms if it is a decision.
- **The workshop** may append to `MEMORY.md` under a `## From the workshop`
  section; it may not rewrite human entries.
- **A nightly job** compacts `MEMORY.md` (dedupe, drop stale) and never touches
  `DECISIONS.md`.

## Retrieval and budget

A brief is not "paste the files". It is a bounded assembly:

```
1. BRIEF.md            always        (~200 tokens)
2. PLAN.md current     always        (~300)
3. MEMORY.md relevant  top 8 lines   (~200)
4. DECISIONS.md        last 5        (~250)
5. L1 recent turns     last 6        (~600)
6. L4 open items       ids + titles  (~200)
                       total cap     ~2,000 tokens
```

Ranking for "relevant": same app first, then keyword overlap with the current
message, then recency. If the cap is exceeded, drop in reverse order (6 -> 5
-> 4), never truncate a decision mid-sentence.

## Compaction

Triggers: `MEMORY.md` > 150 lines, or `DECISIONS.md` > 400 lines.

- `MEMORY.md`: merge duplicates, delete facts that are no longer true, keep
  file references, keep a one-line pointer to `DECISIONS.md` for history.
- `DECISIONS.md`: never compact. Split by year if it gets huge.

Never compact automatically without a diff the human can see. Silent memory
edits are how an assistant starts confidently remembering wrong things.

## Conflict resolution

| Conflict | Winner |
| --- | --- |
| File says X, Hermes remembers Y | **File**, if it is newer and marked decided |
| Hermes remembers a preference the file lacks | Hermes, and offer to write it down |
| Two files disagree | The one with the newer `DECISIONS.md` entry |
| The human contradicts both | Human, immediately, and write it down |

The engine must be told: "if the workspace files disagree with your memory,
the files win, and say so."

## Inspecting Hermes (the unknown)

Before committing to M1, find out what Hermes actually retains:

1. Where does it store state? Look for a data directory next to its config
   (`%APPDATA%`, `%LOCALAPPDATA%`, or a dot-folder).
2. Is memory per user, per conversation, or global?
3. Is there an export, a search endpoint, or a memory file we can read?
4. Does it survive restart, reinstall, model change?
5. Can two clients see the same memory (our server + the desktop app)?

Outcomes:

- **Readable/exportable** -> M1 is safe; we can back it up and migrate later.
- **Search API only** -> M1 works, but write a nightly export of what it
  returns so the knowledge is not trapped.
- **Black box** -> do not let it be the only memory. L2 becomes mandatory on
  day one, and every decision gets written even if Hermes already knows it.

## Privacy and safety

Never write to L2:

- credentials, tokens, API keys
- personal data that is not needed to do the work
- anything a screenshot would make embarrassing

Do write: decisions, constraints, gotchas, links, acceptance criteria.

L2 lives inside the workspace and may be committed. Treat it as public within
the project.

## Implementation sketch

```js
// server/memory.mjs (proposed)
readContext(appPath, { query, budget })   // -> brief string + sources
appendDecision(appPath, { text, why, actor })
appendMemory(appPath, { section, lines })
compactMemory(appPath, { dryRun })        // returns a diff
```

Events that call it: `edgeSend` (assemble brief), workshop start (handoff
brief), SCR accept/reject (decision entry), nightly timer (compaction).

## How we would know it works

- **Repeat rate**: how often you re-explain something already decided. Should
  trend down. Log it manually for two weeks — cheap and honest.
- **Handoff misses**: workshop asks for context that the brief should have
  carried. Each miss is a bug in the brief builder.
- **Stale facts**: entries contradicted later. Count them during compaction.

## Open questions

1. Does the brief go into the **prompt** every turn (cost grows) or only at
   handoff (cheaper, but drift returns)? Lean: handoff + first turn, then rely
   on the engine's session.
2. Do we keep one `MEMORY.md` per app, or one per app *and* per role?
3. Who is allowed to edit `DECISIONS.md` by hand — anyone, or only through the
   UI so attribution is recorded?
