# Notifications and background jobs

You asked for three things that are really one design:

1. agents keep working when the pane is closed,
2. on server restart they resume, retry up to 3 times, then tell you,
3. the UI is only a view.

The rule that makes all three safe: **the job record is the truth; the
notification is a projection of it.** If a notification is lost, the work is
not. If the UI is closed, the job still has a state you can inspect later.

## 1. The job record

One record per unit of agent work, stored beside the work item, not inside the
harness:

```
id, workspaceId, scope (app:<id>), itemId, role (builder|qa|reviewer), harness,
profile, state, attempt, resumeAttempts, maxResumeAttempts (3),
sessionRef, baseRevision (git commit), startedAt, updatedAt,
waitingReason?, lastError?, evidence[], notificationIds[]
```

States:

```
queued -> running -> review -> done
             |  \
             |   -> waiting-approval -> running
             |
             -> interrupted -> running        (restart, resumable)
             -> failed                        (retries exhausted)
             -> cancelled                     (human)
```

- **`review` is not `done`.** An agent that believes it finished moves the job
  to `review`; a human accepts.
- `waiting-approval` is a *success* state for the supervisor: the job is alive
  and correctly blocked on a person.
- Every transition is written atomically and carries a monotonic `seq`, so the
  inbox can be rebuilt from job records if its own file is lost.

## 2. What is worth a notification

Only transitions that change what *you* must do. Progress is visible in the
rail; it does not need an alert.

| Event | Kind | Needs you? | Default channels |
| --- | --- | --- | --- |
| Job finished, evidence ready | `review-ready` | **yes** | inbox + Edge + browser |
| Job failed after 3 resumes | `job-failed` | **yes** | inbox + Edge + browser + OS |
| Approval requested (`ask` tool) | `approval` | **yes** | inbox + Edge + browser + OS |
| Job interrupted, not resumable | `interrupted` | **yes** | inbox + Edge |
| Job resumed successfully | `resumed` | no | inbox (silent) |
| Work item moved to Ready | `item-ready` | no | inbox |
| Work item blocked / unblocked | `blocked` | yes if it blocks you | inbox + Edge |
| Bug with Sev-1 filed | `sev1` | **yes** | all + email |
| Server restarted with jobs recovered | `recovered` | no | inbox (one summary) |
| Tunnel / harness unreachable | `degraded` | yes | inbox + OS |

Not notified: every agent message, every tool call, every file save, token
spend per turn. Those belong in the job log, not in your attention.

## 3. Channels, and when each one actually works

| Channel | Works when | Latency | Notes |
| --- | --- | --- | --- |
| **Inbox in the rail** | server up, any device | instant | durable, the source of "unread" |
| **Edge message** | server up | instant | a system note in the scope's transcript, with a link |
| **Browser notification** | a FoundationOS tab is open | instant | needs permission; click focuses the item |
| **Windows toast** | server up, browser closed | instant | via the local server; this is what makes "pane closed" real |
| **Email** | server up (sends out) | minutes | opt-in; for escalations and Sev-1 |
| **Phone push** | server up | instant | optional later (ntfy/Telegram); not v1 |

**The honest limit:** if the PC is asleep or the tunnel is down, nothing is
delivered *at that moment*. The inbox shows it on wake. True push while the
machine is off needs an always-on relay, which is a separate deployment and is
not in this PRD (`15` §6).

## 4. Restart and resume

On boot the supervisor:

1. Loads every job not in `done` / `cancelled`.
2. Marks anything `running` as `interrupted` (the process is gone; pretending
   otherwise is how you get ghost jobs).
3. Decides per job:

| Condition | Action |
| --- | --- |
| `waiting-approval` | keep waiting; notify once that it is still waiting |
| Resumable: session ref + base revision still matches | **auto-resume** |
| Base revision changed (someone edited the app) | do **not** resume; mark `interrupted` with a conflict notice |
| No session ref (harness cannot continue) | mark `interrupted`; offer one-click restart |
| `resumeAttempts >= 3` | mark `failed`; notify with the last error |

Resume policy:

- `maxResumeAttempts = 3` **resumes** after the initial run. If you meant
  "three attempts in total", change the constant; the record keeps both numbers
  so the difference is visible.
- Backoff between resumes: 5 s, 30 s, 2 min. No infinite loop, no tight retry.
- **Crash-loop guard:** if a resumed job dies within 10 s three times, stop and
  notify; do not burn the remaining attempts.
- Resuming re-enters the same harness session and re-sends a short **resume
  brief**: item id, what was done, what remains, the base revision. It does not
  replay the whole transcript.
- A resume never re-applies a patch that was already applied; the job record
  stores `appliedRevision` and the supervisor checks it first.

## 5. Delivery rules

- **One notification per transition**, keyed by `eventId = jobId:seq`. Duplicate
  delivery is a no-op.
- **Acknowledgement is not deletion.** "Seen" sets `readAt`; the record stays.
- **Escalation:** a `needs-you` notification unacknowledged for 15 minutes is
  repeated once; after 60 minutes it goes to email if configured. Escalation
  stops on acknowledgement.
- **Quiet hours** (default 22:00-08:00): no browser/OS/email except `sev1`,
  `job-failed`, and approvals that block a running job.
- **No secrets, no diffs, no transcripts** in a notification. Title, app, item,
  one action, one link.
- **Coalescing:** ten `item-ready` events in a minute become one summary; ten
  failures do not — failures stay separate.
- **Clicking** a notification opens the item or job in the shell, restores the
  originating view, and returns focus to the control that opened it
  (Interface Standards §2.1).

**Per user, not per workspace (D15).** Each member has their own inbox, unread
count and quiet hours. A terminal event goes to the job creator, the item owner,
and any watchers; approvals go to the app's owner/admin only. A viewer never
receives work notifications. The job record itself is shared with everyone who
can see the app; the notification state is not.

## 6. The inbox surface

- Lives in the rail with an unread count; it is a **bounded panel**, not a
  modal, and it never moves the row it was opened from (Standards §1.1).
- Sections: **Needs you**, **Today**, **Earlier**. Empty state explains what
  will appear there and offers "Open the board".
- Each row: what happened, which app, when, and one action. Rows are keyboard
  and gamepad reachable; `Esc` closes and restores focus.
- The app card carries the job state (`working 12m`, `waiting for approval`,
  `review ready`) so the phone can answer "is it done?" without opening a
  harness.
- A job detail view shows attempts, resume history, evidence and the last 50
  log lines. It is a page, not a chat.

## 7. What we deliberately do not do

- No notification per agent message (that is a chat app, not a work console).
- No "success" toast that disappears before it is read.
- No auto-approval on resume. A pending approval stays pending forever until a
  human acts; the job may be resumed only after approval.
- No silent retry of a job whose base revision changed.
- No email of transcripts or code diffs.
- No promise that a sleeping PC notifies you.

## 8. Effort

- Job record + state machine: **Ef-2**.
- Resume-on-boot with revision check: **Ef-2** (process + concurrency).
- Inbox + rail badge + app-card status: **Ef-3**.
- Browser notification + Windows toast: **Ef-3** (permissions, platform quirk).
- Escalation/quiet hours/coalescing: **Ef-3**.
- Email channel: **Ef-4** (config + one provider).

## 9. Open questions

1. "Retry up to 3 times" = 3 resumes after the first run (lean), or 3 attempts
   total?
2. Do you want Windows toasts at all, or is the inbox plus browser enough?
3. Email: which address/provider, and only for Sev-1 and failures?
4. Should a failed job automatically file a Bug/Dev Task with the log attached,
   or only offer a button? (Lean: offer — automatic filing creates noise.)
