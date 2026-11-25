# 01 — First run: setup, login, join

**Status:** DECIDED (D21) · 25 November 2026
**Routes:** `/setup`, `/login`, `/join/<token>`, `/s/<token>`

These are the first screens anyone sees, and the only ones reachable without a
session. They decide whether the server feels trustworthy.

## 1. Route rules

| Route | Reachable when | Otherwise |
| --- | --- | --- |
| `/setup` | zero accounts exist | 404 (never "already set up") |
| `/login` | at least one account exists | redirect to `/setup` |
| `/join/<token>` | a valid server invite exists | "This invite is invalid or has expired" |
| `/s/<token>` | a valid project share exists | sign-in, then the same message |
| everything else | signed in | redirect to `/login?next=…` |

`/setup` returning **404** after setup is deliberate: it does not advertise
that the server is configured, and it cannot be used to probe for a reset.

## 2. Setup — one screen, two steps

**Step 1 — the server**

| Field | Rule |
| --- | --- |
| Server name | 2–40 chars, shown in the header and invite pages |
| Time zone | defaults to the machine's; used for quiet hours and dates |
| Data location | read-only display of `FOUNDATIONOS_DATA` |

**Step 2 — the owner**

| Field | Rule |
| --- | --- |
| Username | 3–24 chars, `a–z 0–9 _ -`, unique, immutable |
| Display name | 1–40 chars, changeable |
| Password | min 10, confirm, show/hide, strength hint |
| Quiet hours | default 22:00–08:00, editable later |
| Theme | system / light / dark |

One button: **Create server**. It writes `server.json`, the owner account and
the owner's personal workspace in one transaction. If any step fails, there are
still zero accounts and `/setup` is still open.

No email field. No "invite your team" step. Both are later and neither should
block the first run.

## 3. Login

- Username + password + "keep me signed in".
- Enter submits; the username field is focused on load.
- Failure: one generic message, announced to screen readers, no field-level
  "user not found".
- After 5 failures in a minute: "Too many attempts. Try again in 60 s." The
  form stays usable; the button is not disabled without explanation.
- A `?next=` path is honoured only if it is a relative path on this origin.
- Footer shows the server name and version; no "forgot password" link that
  leads nowhere. Instead: *"Ask your server admin for a reset link."*

## 4. Join by server invite

`/join/<token>` shows **who invited you** and **to which server**, then asks
for username, display name, password and confirm.

- The token is validated before the form renders; an invalid one shows the
  error state, not a broken form.
- On success: account created as `member`, session started, land on Home with
  a one-time "Welcome — here is what you can do" card.
- The invite is marked used in the same transaction. A double-submit cannot
  create two accounts.
- If already signed in: "You are signed in as Alice. Switch account to accept
  this invite?" Never a silent second account.

## 5. Project share

`/s/<token>` is a **grant**, not an account.

- Signed out → login or join first, then redeem and land on the project.
- Signed in → show the project name, the role being granted, and **Accept**.
- The ceiling rule is checked at redemption time, not only at creation: if the
  inviter's role dropped, the invite fails with "this invite is no longer
  valid".
- A viewer invite says so plainly: *"You will be able to read, not edit."*

## 6. States

| State | What the user sees |
| --- | --- |
| Loading | The form shell with disabled fields; no layout shift |
| Empty (no server yet) | Setup, with a one-line explanation of what it creates |
| Invalid token | The reason and one action: "Ask for a new invite" |
| Expired / used / revoked | Distinct messages; never a generic 404 |
| Server unreachable | "Can't reach the server" + retry; no fake success |
| Rate-limited | Countdown, not a dead button |

## 7. Accessibility and standards

- Every input has a visible label; no placeholder-as-label.
- Errors are announced (`aria-live="polite"`) and tied to the field.
- Focus moves to the first invalid field on submit; focus returns to the
  trigger after a dialog closes (Interface Standards §2.1).
- The card stays inside the viewport at 320 px wide and at 200% zoom
  (§1.1); the form scrolls, the page does not jump.
- Password show/hide is a real button with an accessible name.
- No autoplay, no carousel, no motion beyond a 150 ms fade.

## 8. Acceptance

1. Fresh data folder → `/` redirects to `/setup`; setup creates the owner;
   `/setup` then returns 404.
2. Wrong password five times → rate limit message; correct password still
   works after the window.
3. A server invite works once; the second attempt says "already used".
4. An expired project share says "expired", not "not found".
5. A signed-in user opening `/join/<token>` is offered a switch, never a
   second account.
6. Keyboard only: setup, login and join can be completed without a mouse.

## 9. Open questions

1. Should setup ask for a recovery code at creation? (Lean: yes — one
   generated code, shown once, for owner reset.)
2. Is `allowOpenSignup` ever exposed in the UI, or only in `server.json`?
   (Lean: owner-only setting, off by default, with a warning.)
3. Do we show the server name on the login page before sign-in? (Lean: yes —
   it prevents "which server is this?" mistakes.)
