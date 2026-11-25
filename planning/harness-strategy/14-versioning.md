# Versioning: git, snapshots, and one writer

You asked: "should we have some git mechanism in place, even for folders,
projects and apps — how could this be implemented in an easy way?"

Short answer: **git per app plus a shell repo, snapshots for anything that is
not a repo, and one writer at a time.** Git gives review and rollback; it does
not give concurrency safety. Two different problems, two different tools.

## 1. What actually goes wrong today

| Failure | Cause | Does git fix it? |
| --- | --- | --- |
| Lost update | Two agents write the same file | **No** — needs a lock |
| Corrupt JSON | Truncated write / crash | **No** — needs atomic write |
| "What changed?" | No history | **Yes** |
| "Undo that" | No history | **Yes** |
| "Review before apply" | No diff | **Yes** |
| "Agent broke the app" | No isolation | **Yes** — worktrees |

So git is necessary but not sufficient. The store needs atomic writes and
revisions either way (`09`, W-06).

## 2. Current state

The workspace **is** a git work tree, but nothing is committed — every path is
untracked. That means there is no history to revert to, and `git worktree`
cannot branch from a commit that does not exist.

First step is therefore a **baseline commit**, not a new tool.

## 3. Repo boundaries

| Repo | Contains | Why |
| --- | --- | --- |
| **Workspace repo** (root) | shell, server, interface, `system/`, docs | One history for the product |
| **One repo per app** | `users/<u>/<app>/` | Apps are independent; each gets its own review and rollback |
| **Nothing** for plain folders | notes, scratch | No value, added noise |

Rules:

- The workspace repo `.gitignore`s app folders (they are their own repos).
  No submodules — submodules are the opposite of "easy".
- `node_modules`, `system/dist`, runtime dirs, `users/*/.foundationos-*`
  runtime state, secrets and logs are ignored.
- A new app is created with `git init` + one commit. That is the app's
  revision zero, and the base every job records.

**D15 impact (T3 hybrid):** an app repo lives under its owner's personal
workspace. Sharing grants **access**, not a copy: there is one repo per app,
and members work in it through a worktree. Two rules do not change: the
per-app write lock is per repo, and a member may only clone/work in repos their
app grant allows. Cross-app access is a server-side check, never a path
convention.

## 4. Isolating a job (the part that makes agents safe)

OpenCode already supports this natively:

```
opencode --worktree [=name]   "Start a new session in a new git worktree"
```

So the flow is:

```
app repo (main)
   |-- worktree A  <- builder session
   |-- worktree B  <- a second experiment
   |
   +-- main stays untouched until a human applies a diff
```

- The agent works in a throwaway worktree, never in the live folder.
- Review is a normal diff: files changed, lines added/removed, tests run.
- Apply = merge (fast-forward when possible); discard = delete the worktree.
- **Stale protection:** before applying, compare the recorded base commit with
  the app's current `HEAD`. If they differ, refuse and show the conflict. This
  is the "stale patch cannot overwrite newer edits" check from your earlier
  plan, implemented cheaply.

If a folder is not a repo (a legacy app, or a project with no code), fall back
to a **snapshot**: zip the folder into
`<app>/.foundationos/snapshots/<timestamp>.zip` before the job, and use
`git diff --no-index` between before/after for review. Same review UX, less
history.

## 5. One writer per app

Worktrees isolate *edits*, but publishing still needs a rule:

1. The supervisor takes a **per-app write lock** when a job starts.
2. Only one job may hold it. A second request queues with "Weather is busy —
   queued" rather than starting.
3. QA is exempt: it is read-only browser work and can run alongside.
4. Publishing (merge + build) is the serialization point. It is always a
   human action.

This also protects the work-item store from concurrent writes (same idea,
different lock).

## 6. The OneDrive problem (do not skip this)

The workspace lives in OneDrive. Git and OneDrive fight:

- OneDrive syncs `.git` objects while git writes them -> corrupt repo.
- File locks and "file in use" errors during checkouts.
- Conflicts create duplicate copies of `.git` internals.

Options, in order of preference:

1. **Move code repositories out of OneDrive** (`C:\FoundationOS`), keep
   OneDrive for documents and backups. Cleanest.
2. Keep the workspace in OneDrive but **exclude `.git`** from sync and pause
   sync during agent jobs. Fragile but workable.
3. Keep everything and accept occasional repair. Not recommended.

Whatever we choose, **back up** the repos to a second location (OneDrive or a
remote) on a schedule, since a corrupted `.git` is a bad day.

## 7. What the UI shows

- App card: "Clean" / "3 uncommitted changes" / "Job running (12m)".
- Workshop review panel: file list, diff, test output, **Apply** / **Discard**,
  and "based on revision abc123".
- After apply: "Applied to Weather at 14:32 — 3 files, build passed".
- Never auto-merge, never auto-publish.

## 8. What not to put in git

- runtime state (`session.json`, edge history) — these are data, not code
- tokens and secrets
- `node_modules`, build caches
- `system/dist` (build output; publish is a separate step)
- the work-item store? **Keep it versioned too**, but as a normal folder with
  atomic writes — git history is a bonus, not the consistency mechanism.

## 9. Effort estimate

- Baseline commit + ignore rules: **Ef-4** (mechanical but wide).
- Per-app `git init` on create: **Ef-4**.
- Worktree-per-job in the supervisor: **Ef-2** (process + path handling).
- Review/apply UI: **Ef-2**.
- Snapshot fallback: **Ef-3**.

## 10. Open questions

1. Are you willing to move the workspace out of OneDrive, or should we design
   around it? This is the single biggest reliability decision here.
2. One repo per app, or one repo for everything? (Lean: per app.)
3. Do you want worktree sessions visible in the UI as "experiments", or are
   they invisible until applied? (Lean: visible — trust.)
4. Should QA runs also work on a worktree? (Lean: no, read-only live.)
