# 02 — The store

**Status:** DECIDED direction (D22) · 25 November 2026
**Problem:** files have no transactions. Two writers, one file, one lost update.

The tree is the truth, so the store must make plain files behave like records.
Five invariants do that. Everything else is detail.

## 1. The five invariants

| # | Invariant | Fails loudly as |
| --- | --- | --- |
| 1 | **Atomic writes** — write temp, flush, rename | a half-written file never exists |
| 2 | **One writer per scope** — a bounded lock | `423 Locked` with the holder and retry hint |
| 3 | **Every mutable record has a `revision`** | `409 Conflict` with the current revision |
| 4 | **Every write carries a `requestId`** | a retry returns the first answer, not a duplicate |
| 5 | **Every accepted write appends an event** | history is never reconstructed by guesswork |

A scope is a project folder, an agent folder, or `server/` — not the whole
tree. Two projects write in parallel; two writers in one project do not.

## 2. The write protocol

```
1. authenticate        -> principal, grant, project
2. authorise           -> role check; no access = 404 (D15)
3. read current        -> record + revision (or none, for a create)
4. check expected      -> expectedRevision == current.revision, else 409
5. check receipt       -> requestId seen? return the stored response
6. validate            -> schema; unknown/invalid fields rejected
7. acquire lock        -> scope lock, bounded wait (default 5 s)
8. write temp          -> <file>.tmp.<pid>.<rand>, flush
9. rename              -> atomic replace on the same volume
10. append event       -> board/events.jsonl or audit/
11. store receipt      -> requestId -> response, kept 7 days
12. update index       -> best effort; a failure logs `drift`, never blocks
13. release lock
```

Steps 6–10 happen under the lock. Everything before it is cheap and can fail
without side effects.

## 3. Locks

- One lock file per scope: `data/.locks/<scopeId>.lock`.
- Contents: `{ pid, startedAt, reason }`, written atomically.
- A lock older than 60 s whose pid is gone is **stale** and may be broken; the
  breaker logs a `stale-lock` event.
- Waiters poll with jitter, then fail with `423` and the holder's age.
- A lock is never held across a network call, a model call or a git operation.
  Long work is a **job**, not a locked write.

## 4. Revisions and conflict

Every mutable record carries:

```json
{ "id": "01J8...", "revision": 7, "updatedAt": "...", "updatedBy": "..." }
```

A write sends `expectedRevision`. A mismatch returns:

```json
{
  "error": "stale-revision",
  "expected": 6,
  "current": 7,
  "currentUpdatedBy": "alice",
  "hint": "re-read and re-apply"
}
```

The client never retries blindly. The UI shows "Alice changed this while you
were editing" with **reload** and **show my version**. An agent gets the same
refusal and must re-read.

## 5. Idempotency

- `requestId` is a UUID chosen by the caller, reused on retry.
- Receipts live in `data/.receipts/<requestId>.json` for 7 days.
- A repeated `requestId` returns the **stored response** with `"replayed": true`.
- A different payload under the same `requestId` is refused: `409 idempotency-mismatch`.
- This is what makes "resume after a crash" safe: the retry either completes
  the write or returns the one that already happened.

## 6. Validation and quarantine

- Every record has a JSON Schema under `system/schemas/`.
- Validation runs **on write** (server) and **on read** (loader).
- A file that fails validation is moved to `data/quarantine/` with a sibling
  `.error.txt`, and the inbox gets a "1 file needs attention" notice.
- The server never silently drops an invalid record, and never "repairs" one
  by guessing. A human or a migration fixes it.
- Unknown fields are rejected in strict mode (`server.json: strictSchema`),
  and preserved in lenient mode for forward compatibility during a rollout.

## 7. Migration

- `schemaVersion` lives in `server.json` and every manifest.
- A migration is a script: snapshot → transform → validate → bump → rebuild
  index. It is idempotent and refuses to run on an unexpected version.
- Downgrade is not supported. Restore the snapshot instead.

## 8. Acceptance (the tests that make this real)

| Test | Passes when |
| --- | --- |
| Kill mid-write | after restart the file is valid JSON, old or new, never partial |
| Two writers, same item | one succeeds; the other gets `409` with the current revision |
| Same `requestId` twice | one record; the second response says `replayed` |
| Stale lock | a dead pid's lock is broken and logged |
| Invalid file on disk | quarantined + notified; server still starts |
| Index deleted | `fos_index rebuild` restores every list and count |
| Migration interrupted | snapshot restores; version unchanged |

## 9. Open questions

1. SQLite for the index, or a JSON scan until it hurts? (Lean: SQLite from day
   one — "what should I work on?" is the first real query.)
2. Lock wait 5 s, or shorter with a queue? (Lean: 5 s, then `423`; the UI
   offers "wait" rather than blocking a request.)
3. Receipts for 7 days, or per-project retention? (Lean: 7 days globally.)
4. Should the event log be the only history, or do we also keep per-record
   `history[]`? (Lean: log only — one place to look.)
