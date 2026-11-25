# Effort rubric for agents (Ef-1 to Ef-5)

You asked for effort measured by **how hard the item is for an agent**, not for
a person. That is the right axis for the workspace we are building, and it is
not the same axis as human effort.

## 1. Why agent effort is different

| Task | For a human | For an agent |
| --- | --- | --- |
| Rename a field across 40 files | Tiring, error-prone | Easy: mechanical, compile/test proves it |
| Write a new state machine with locking | Hard | Harder: needs design, invariants, race cases |
| Read 30 files to find where a bug lives | Slow | Cheap-ish, but context cost and drift |
| "Make the empty state feel right" | Taste, fast | Hard: no objective test, iterates blindly |
| Copy an existing pattern into a new screen | Medium | Easy if the pattern is in the repo |
| Fix a crash with no logs | Hard | Very hard: cannot observe, must hypothesise |
| Mass-update 200 constants | Painful | Trivial |

The pattern: **agents are strong where the work is mechanical and verifiable,
weak where the work is novel, ambiguous, or judged by taste.**

## 2. The eight cost dimensions

Score the item on each; the **worst dimension decides**, not the average. A
task is as hard as its hardest constraint.

| # | Dimension | Low cost | High cost |
| --- | --- | --- | --- |
| 1 | **Context span** | 1-3 files, all known | Must discover across many files/modules |
| 2 | **Locality** | One layer | Cross-cutting: schema + server + UI + docs |
| 3 | **Specification** | Exact change stated | Intent only; many valid designs |
| 4 | **Verifiability** | Test, build, or visible result | Subjective, or only a human can tell |
| 5 | **Novelty** | Existing pattern to copy | New logic, new algorithm, new invariants |
| 6 | **Blast radius** | Reversible, local | Auth, data, publish, destructive migration |
| 7 | **Environment friction** | Plain JS, fast loop | Builds, installs, Windows quirks, network, credentials |
| 8 | **Judgement** | Acceptance is checkable | Taste, layout feel, wording tone |

Concurrency and timing deserve a note: they are **locality + verifiability**
at their worst. An agent can write a lock; proving it is correct needs
adversarial tests it rarely invents on its own.

## 3. The rubric

### Ef-1 — hardest

New subsystem, new algorithm, or a change that is cross-cutting **and**
ambiguous, **or** impossible to verify without human judgement.

Signals: needs a design decision first; touches 3+ layers; failure modes are
concurrency, migration or data loss; no test can prove it.

Examples from our backlog:
- "Work store v2: locks, revisions, atomic writes" (new invariants + blast radius)
- "Embed a third-party harness UI with auth brokering" (unknowns + security)
- "Design and build the agent MCP protocol" (spec + multi-layer)

### Ef-2 — hard

A real feature with new logic, several files, some ambiguity, but a test or a
visible result can prove it.

Examples:
- "Harness supervisor with process-tree cleanup" (platform quirks)
- "App Studio one-page with file handoff"
- "Remote access via Cloudflare Tunnel with auth" (ops + config)

### Ef-3 — moderate

Contained change that follows an existing pattern; 1-3 files; provable.

Examples:
- "Suggestion chips with three states"
- "Auto-switch modes with undo banner"
- "Add `unblocks[]` to enablers and show it"

### Ef-4 — easy but wide

Mechanical work: rename through the stack, add a field everywhere, copy a
pattern into one more place, update docs and fixtures.

Examples:
- "Rename P0-P3 to P-1..P-5 across schema, UI, tests and docs"
- "Add `effort` to every existing record and form"

### Ef-5 — trivial

One line, one constant, one label, one config value.

Examples:
- "Default priority P-3 instead of P-2"
- "Change the empty-state sentence"
- "Add one missing aria-label"

## 4. Modifiers

Apply after the base score, one step each, maximum two steps total.

**Harder (toward Ef-1):**

- No automated verification exists and none can be added cheaply.
- Touches auth, data migration, publish, or deletion.
- No reference implementation anywhere in the repo.
- Estimate confidence is low ("we think it is 3 files…").
- The agent must invent acceptance criteria.

**Easier (toward Ef-5):**

- An existing implementation can be copied almost verbatim.
- Tests already cover the behaviour and will fail loudly.
- The change is pure data/config with no code path.

Never go below Ef-1 or above Ef-5.

## 5. How an item gets its effort

1. Whoever files it proposes `Ef` **and** names the dominant dimension:
   `effortBasis: "verifiability"` or `"context-span"`.
2. An agent may propose; a human confirms at triage (same rule as severity).
3. Low confidence bumps one step harder. Plan for the bad case.
4. Store the estimate. Never silently change it after work starts; add a
   `revisedEffort` if it was wrong, so calibration is possible.

## 6. Calibration (the part that makes it real)

Effort is only useful if it predicts. Track per item:

- actual wall-clock turns (how many agent messages to completion)
- retries / failed attempts
- files touched vs predicted
- human interventions
- whether acceptance passed first time

Then check: do Ef-2s actually take twice an Ef-3? If not, the rubric is
decoration. Recalibrate the dimensions, not the labels.

## 7. Anti-patterns

- **Effort as priority.** "It's easy, do it first" is how important work gets
  buried. Priority orders; effort sizes.
- **Averaging the dimensions.** A one-file change with an unverifiable outcome
  is not "medium".
- **Ef-1 in a sprint.** Split it, or admit the sprint contains a design task
  that may not finish.
- **Estimating in hours.** Agents do not experience hours; they experience
  turns, retries and context. Keep the five-step scale.

## 8. Open questions

1. Do we show effort on the board card, or only in details?
2. Should the agent that will do the work be the one proposing effort, or a
   neutral one? (Lean: the assignee proposes, a human confirms.)
3. Do we want a second axis for **risk** (chance the agent breaks something),
   or is blast radius inside effort enough?
