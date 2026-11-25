# 03 — The workshop

**Status:** DECIDED (D4, D12, D23) · 25 November 2026

One workshop per **app** project. It is an embedded harness session, hosted by
the server, opened from any device, scoped to the project's folder.

## 1. Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Weather   [ ready ]        Open in tab   Pop out   Stop    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   the harness UI (iframe, its own origin)                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Our chrome is a thin bar; the harness owns everything below it.
- The harness is loaded from its own origin (`oc-<projectId>.<domain>` or a
  loopback proxy), never injected into our page's DOM.
- The pane fills the viewport minus the chrome; it does not scroll the page.

## 2. States

| State | Chrome shows | Body shows | Actions |
| --- | --- | --- | --- |
| **starting** | amber pill, elapsed | progress + "what is starting" | Cancel |
| **ready** | green pill | the harness | Open in tab, Pop out, Stop |
| **waiting** | amber pill | last frame + "waiting for approval" | Open approval |
| **crashed** | red pill | error, exit code, last 50 log lines | Restart, Copy log |
| **stopped** | grey pill | "Workshop stopped" | Start |
| **unavailable** | grey pill | "Harness not installed / not configured" | Setup link |

The pill is text + colour, never colour alone (Interface Standards §2.2).

## 3. Starting

1. The supervisor allocates a port, a worktree and a scope folder.
2. It starts the harness with `cwd` = the project repo, bound to `127.0.0.1`.
3. It waits for a health check, then swaps the iframe in.
4. A warm start targets **under 15 s**; the elapsed time is visible, not a
   fake spinner.

Starting is cancellable. Cancel kills the process tree, not just the parent.

## 4. Auth

- The pane never asks the user to log in to the harness separately.
- The server injects a one-time pair link (W-13a) or a scoped token; the
  harness session is tied to the FoundationOS session.
- Refreshing the page or opening on another device reuses the same session
  (W-13b), until it is revoked.
- A revoked session shows "session ended" and a **Reconnect** button; it does
  not silently reload into a login screen inside the iframe.

## 5. Closing is not stopping

- Closing the tab, the pane or the browser **does not stop the job**.
- The project card shows the job pill; the inbox gets the terminal event.
- "Stop" is explicit and confirmed if a job is running.
- After a server restart, the supervisor reconciles: running → interrupted →
  resume per `18` (3 resumes, then failed + notification).

## 6. Pop-out and multi-device

- **Open in tab** opens the same session in a new tab, same origin.
- **Pop out** opens a minimal window with only the harness.
- A second device opening the same workshop joins the same session; it does
  not start a second instance.
- Two people in the same workshop see the same session and the same job. Their
  **worktrees** differ per job, not per viewer.

## 7. Degraded mode (D23)

| Missing | Still works | Does not work |
| --- | --- | --- |
| Edge offline | Board, files, triage, channel, workshop | "Ask Edge to…" |
| Harness offline | Board, files, triage, channel, inbox | Workshop pane |
| Server offline | Nothing (the tree lives on the server) | Everything |

The first two show a quiet banner. The third shows the unreachable page from
`02` §6.

## 8. Standards

- The pane fits the viewport; the page does not scroll behind it (§1.1).
- Opening the pane does not steal focus from the control that opened it; the
  iframe gets focus only after it is ready, and only if the user asked for it
  (§2.1).
- The status pill and the stop button keep their positions across states
  (§1.2).
- Errors are text, with a copyable log, not a red flash.

## 9. Acceptance

1. Start Weather → pane ready in under 15 s warm; `cwd` is the Weather repo.
2. Close the tab mid-job → job continues; card shows `working`; inbox gets the
   result.
3. Kill the server mid-job → restart → job resumes; after 3 failures it is
   `failed` with a notification.
4. Revoke the session → pane shows "session ended", not a login form.
5. Stop → the process **and its children** are gone; the port is free.
6. 320 px: chrome wraps, no horizontal scroll, Stop still reachable.

## 10. Open questions

1. Do we hide the harness's own navigation? (Lean: no — show it as-is; our
   chrome is the frame.)
2. Should "Open in tab" be the default on mobile? (Lean: yes — iframes are
   cramped; the session is the same.)
3. One workshop per project, or one per member per project? (Lean: one per
   project; jobs and worktrees carry the isolation.)
