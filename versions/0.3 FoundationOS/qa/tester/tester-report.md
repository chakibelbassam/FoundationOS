# PI-3 (Accounts and connection) v0.3 — hands-on tester report

## Candidate and environment

- Candidate: PR #12, branch `edge-opencode/pi-03-accounts-and-connection`, head `66ddc0b`
  (verified in-checkout via `git rev-parse HEAD` → `66ddc0b080be88ff6f329edeb0b8a5f806590f45`).
- Date: 2026-11-27, ~11:16–11:28 UTC.
- Version pair: client 0.3 at http://127.0.0.1:63515/ (`FoundationOS 0.3`), server v0.3
  at http://127.0.0.1:63513 (`Server v0.3 is ready.`, `Expected v0.3 · found v0.3 · schema 3`).
- Browsers: real Chrome on this computer via the browse extension (relay 0.1.5, one jar).
  Second independent session: PowerShell cookie jar (`Invoke-WebRequest` `-WebSession`,
  cookie `fo_sess_0818c9…`). No second browser jar (Edge / built-in) was available in this session.
- Viewports exercised: desktop 1920×889 (CSS px 1905×889), 390×844, 320×600.
- Accounts used: owner `erik`, member `maya`, disposable member `tester1` (created, reset, closed).
  Passwords, six-digit codes and cookies are redacted from this report and the screenshots.
- Screenshots: `versions/0.3 FoundationOS/qa/tester/` (`01`–`18`, PNG). Images `04`, `06`, `07`
  had their one-time codes covered with black boxes after capture; the codes themselves were
  single-use and two of the three are now consumed, the third revoked.

## Check table (expected → observed)

| # | Check (task step) | Exact URL / viewport | Expected | Observed | Result | Evidence |
|---|---|---|---|---|---|---|
| 1 | Sign in as `erik` with Remember me; workspace, header identity, server line | `http://127.0.0.1:63515/signin` → `/`, Chrome desktop | Private workspace opens; header shows `erik`; server line names the paired server | `erik’s home` / `Your private workspace.`; header buttons `Connected`, `erik`; status `Server v0.3 is ready.`; connection dialog: `Address: http://127.0.0.1:63513`, `Expected v0.3 · found v0.3 · schema 3`, `Signed in as erik (owner).` Remember-me checkbox was checked. `document.cookie` empty (HttpOnly). | Pass | `01-signin-initial.png`, `02-home-erik.png` |
| 2 | Close tab, open new tab at client URL | `http://127.0.0.1:63515/`, same Chrome jar, desktop | Session still active, no sign-in | New tab opened straight to `erik’s home` at `/` with header `erik`; no credential prompt. | Pass | DOM snapshot (`erik’s home`, url `/`) |
| 3 | Sign out → private deep link `/settings/profile` → sign in → return to deep link | `/settings/profile` → `/signin` → `/settings/profile`, desktop | Signed-out deep link is safe; after sign-in the app returns to the requested page | Signed-out GET of `/settings/profile` landed on `/signin`. After signing in as `erik`, URL was `http://127.0.0.1:63515/settings/profile` showing the Profile tab (`Username`, `Introduction`, `Email (optional)`, `Change password`, `Sign out of all sessions`, owner no-delete notice). | Pass | `03-deeplink-profile.png` |
| 4 | Create invitation; join as `tester1` with CodeSlots; new private Home | `/settings/accounts` → `/join` → `/`, desktop | Owner-only six-digit invite; `tester1` redeems it into its own Home | Alert `Invitation code: [redacted] … Valid until 28/11/2026 … Share it only with the person you are inviting.` + pending entry. Join page: `0 of 6 digits entered` → after fill `6 of 6 digits entered`. CodeSlots DOM: one transparent `input[type=text][inputmode=numeric][autocomplete=one-time-code][maxlength=6][aria-label="Six-digit invitation code"]` over six visual slots. After `Join this server`: `tester1’s home`, header `tester1`. | Pass | `04-invite.png` (code redacted), `05-join-tester1-home.png` |
| 5 | `erik` issues member reset for `tester1`; recover via Member reset code; sign in with new password | `/settings/accounts` → `/recover` → `/signin` → `/`, desktop | One-time six-digit reset; `Password changed…` then sign-in reaches the same workspace | Alert `Reset code for tester1: [redacted] … Expires [30 min] … Share it privately`. Recover → Member reset code tab shows `Six-digit reset code` CodeSlots + new/repeat passwords. After submit: `Password changed. Sign in with the new password; your files and settings are unchanged.` Sign-in as `tester1` with the new password → `tester1’s home` at `/`. | Pass | `06-member-reset.png` (redacted), `07-recover-member.png` (redacted) |
| 6a | Edit introduction, rename `erik` → `erik-test`, save | `/settings/profile`, desktop | Header changes; save confirmed | `Username`=`erik-test`, intro set → `57 of 500 characters`, `Profile saved.`, header button changed `erik` → `erik-test`. | Pass | `08-profile-erik-test.png` |
| 6b | Rename back to `erik` | `/settings/profile`, desktop | Old name works again | Username `erik`, intro cleared (`0 of 500`), `Profile saved.`, header back to `erik`. | Pass | DOM snapshot |
| 6c | Upload small PNG avatar; remove it | `/settings/profile`, desktop | PNG accepted and served; removal falls back to initials | Hidden `input[type=file][accept="image/png,image/jpeg"]`; after upload a `Save picture` button appeared; after save an `img` `http://127.0.0.1:63515/api/profile/avatar` rendered. `Remove` deleted it: no `img`, fallback initials `ER` shown. | Pass | `09-avatar-preview.png` + DOM |
| 7 | Appearance theme change → Apply → reload → persists; server preference changed | `/settings/appearance`, desktop | Choice survives reload and is stored server-side | Before: `data-theme="dark"`, `Showing your saved settings.` After Light+Apply: `Saved for this member.`, `data-theme="light"`; after reload still `light`. `GET /api/preferences` → `{"theme":"light",…}` for erik's account. Restored `dark` afterwards to leave the shared pair as found. | Pass | `10-appearance-light.png` |
| 8a | `Sign out of all sessions` dialog: Cancel | `/settings/profile`, dialog, desktop | Cancel preserves all sessions | Dialog text: `This ends every session for erik on this server, including this browser. Other members stay signed in. Your files, settings and password are unchanged.` Cancel → still on `/settings/profile` as `erik`. | Pass | `11-signout-all-dialog.png` |
| 8b | Confirm global sign-out; browser returns to Sign in | `/settings/profile` → `/signin`, desktop | Initiating browser lands on Sign in | After confirm, URL `http://127.0.0.1:63515/signin` with `Sign in` heading and `Server v0.3 at http://127.0.0.1:63513`. | Pass | DOM snapshot |
| 8c | Second independent session for the same account loses access | `GET /api/profile` with PowerShell jar cookie | Revoked: 401 | Before global sign-out the second jar returned `profile: erik`. After: `HTTP 401 Unauthorized` on `/api/profile`. | Pass (via PowerShell jar, not a 2nd browser) | shell transcript in notes |
| 8d | Other member unaffected | `POST /api/sessions` as `maya` | Still works | `maya login: 200`, `maya profile: maya`. | Pass | shell transcript |
| 9a | Close `tester1` from Profile | `/settings/profile` → `/signin`, desktop | Explicit confirm; Home retained with deadline; return to Sign in | `Delete my account` → `Delete your account?` / `This ends access immediately and keeps your private Home offline for 30 days. … Enter your password to confirm.` After confirm: `/signin` with `Account closed. The private Home is retained until 27/12/2026.` | Pass | `12-close-account-dialog.png`, `13-after-close-signin.png` |
| 9b | Closed session cannot reach the Home | `/signin` as `tester1`, desktop | Generic invalid-credential feedback | `The username or password is not correct.` (no separate "closed" message). | Pass | DOM snapshot |
| 9c | Username stays reserved for a new join | `/join`, desktop | Collision message; invite stays usable | With a fresh invite entered: `That username is already taken. Choose another.` URL stayed `/join`, code entry preserved (`6 of 6 digits entered`). | Pass | DOM snapshot |
| 9d | Owner can still sign in; closed account listed | `/` and `/settings/accounts`, desktop | Owner unaffected; closure visible | `erik` signed in to `erik’s home`. Members list: `tester1 member closed … retained until 27/12/2026`. Test invites revoked afterwards (list: 2× used, 2× revoked). `maya` untouched. | Pass | DOM snapshot |
| 10a | Narrow viewports | `/settings/profile` 390×844; `/settings/accounts` 320×600; `/signin` 390×844 | Usable, no breakage | All sections reachable (Profile/Account/Sessions; Members/Invitations with Revoke); no horizontal clipping observed in snapshots or screenshots. | Pass | `14-profile-390.png`, `15-accounts-320x600.png`, `18-signin-390.png` |
| 10b | Keyboard-only entry | `/signin`, desktop | Tab reaches every control; Enter submits | Tab order observed: `INPUT:text` (username) → `INPUT:password` → `INPUT:checkbox` (Remember) → links → buttons, all reachable (Shift+Tab cycles back). Username focused, typed, Tab, typed password, Tab×2 to `BUTTON:Sign in`, Enter → `erik’s home` at `/`. | Pass | `17-keyboard-focus.png` |
| 10c | Paste into CodeSlots | `/join`, desktop | Clipboard paste fills all six slots | `navigator.clipboard.writeText` → `CLIP-OK`; focus code input + `Control+V` → digits shown, `6 of 6 digits entered`. (Paste-test invite revoked unused afterwards.) | Pass | DOM text snapshot |
| 10d | Visible focus | `/signin`, desktop | Focused control identifiable | MUI uses `Mui-focused` fieldset styling (2 matches while password focused); UA `outline` computes to `none`. Screenshot `17` shows the focused password field state. | Pass with note | `17-keyboard-focus.png` |
| 10e | Reduced motion | `/settings/accounts`, desktop, `prefers-reduced-motion: reduce` | Renders without motion dependence | `matchMedia('(prefers-reduced-motion: reduce)')` → `true`; page content identical and interactive. | Pass | `16-reduced-motion.png` |
| 10f | Browser console errors | Chrome tab console buffer | No unexpected errors | Only expected network 401s (signed-out/closed/revoked session probes: `/api/profile`, `/api/sessions/current`, `/api/sessions`) and one 409 (`/api/accounts/join`, taken username). No JS exceptions. | Pass | console read transcript |

## Defects and observations

1. **Sign-out menuitem often needs two attempts (minor, Sev-3, not release-blocking).**
   - Repro: as a signed-in user on a `/settings/*` page, open the header profile menu and click
     `Sign out`. Frequently the menu only dismisses (URL unchanged, session intact). Reopen the menu
     and click `Sign out` again → `/signin`, session ended.
   - Seen at steps 3, 4, 5 and the step-10 cleanup (roughly every second sign-out).
     Workaround always succeeded, so no check was blocked. No retest of a fix was possible (no code changes made).
2. **Keyboard focus can land on `Sign out of all sessions` with repeated ArrowDown + Enter**
   (menu order: identity, Profile settings, Accounts and invitations, Sign out, Sign out of all sessions).
   Enter then opens the global sign-out dialog rather than signing out. It still requires explicit
   confirmation, so no data loss, but keyboard users should be aware. Observation only.

## What was not exercised (and why)

- **Owner recovery code (16-char) and local maintenance recovery (`R` at the server console)** —
  not attempted. The recovery code is single-use and the maintenance path needs the shared server
  stopped; either could lock other agents out of the disposable pair.
- **30-day hard deletion / purge and restore before the deadline** — needs the QA-only test clock
  plus server restarts on the shared store; forbidden on this pair. Only the `retained until
  27/12/2026` state, closed-account listing and reserved-username behavior were verified.
- **Second browser jar (Edge / built-in)** — unavailable in this session. The "second independent
  session" check used a PowerShell cookie jar instead (genuinely independent token, verified 401
  after global sign-out). Cross-browser rendering was not verified.
- **Time-based edges**: invite 24 h expiry, reset 30 min expiry, setup-claim, rate-limit ladder,
  concurrent-redemption race — not exercised (would need clock control or timing attacks on shared state).
- **Optional email field** — left empty throughout; `erik@example.test` predates this run.
- **Device / client-host restart persistence and offline behavior** — processes must not be
  restarted or stopped (shared pair); only tab close/reopen was tested. Dropped-response behavior
  during global sign-out was not simulated.
- **`maya` and `erik` were not closed** (per instructions); only the disposable `tester1` was.

## Retest at 96c2bd4 (Sev-3 observation 1)

Retest date: 2026-11-27 ~13:00 UTC. In-checkout HEAD at retest time was `77ebcc2`, whose only
change over `96c2bd4` is `versions/0.3 FoundationOS/qa/release-evidence.md` (docs); product code
is identical to `96c2bd4` (`WI-075 Open the profile menu without a grow transition`, Header.tsx:
`transitionDuration={{ enter: 0, exit: … }}`). The served `dist` contains the fix — its sourcemap
embeds the fixed `Header.tsx` including the `transitionDuration={{ enter: 0, … }}` line. Browser:
real Chrome on this computer (same jar as the main run). No screenshots taken; this was a
behavioral retest. Pair left signed in as `erik` at `/`.

Steps and results:

1. Navigated to `http://127.0.0.1:63515/settings/profile` (signed in as `erik`).
2. Opened the header profile menu and clicked `Sign out` in the fastest sequence the tool
   allows (open → snapshot → click, same script): landed on `/signin` on the **first click**.
   Signed back in.
3. Repeated open-then-immediate-click three more times: **3/3 first clicks worked**
   (4/4 including step 2). No backdrop-dismiss miss occurred.
4. Keyboard path: focused `button.fo-username`, pressed Enter to open the menu, then
   ArrowDown ×3 + Enter. Result: signed out to `/signin` on the first Enter — the focus
   landed on `Sign out` as expected, not on `Sign out of all sessions`.
5. Reload of `/signin` after sign-out: page reloaded cleanly. Console capture over the whole
   retest showed one entry only, the expected signed-out probe
   `401 (Unauthorized)` for `/api/profile`. No JavaScript errors.

Conclusion: **observation 1 is fixed.** The fast first click no longer lands on the backdrop,
and the keyboard path reaches `Sign out` deterministically in this run.

## Verdict

**Pass with findings.** Every required journey in the task list passed on candidate `66ddc0b`
(0.3/0.3 pair): remembered sign-in, tab-reopen persistence, deep-link return, invitation → join via
CodeSlots, member reset → recovery, profile rename/intro/avatar add-remove, theme apply + reload
persistence with server-side confirmation, global sign-out with cancel + confirm (second session
revoked, other member unaffected), account closure with 30-day retention and reserved username, plus
viewport, keyboard, paste, focus, reduced-motion and console checks. No Sev-1 found. The two
observations (flaky first-click sign-out, keyboard focus landing on global sign-out) are minor and
did not block any check. Unexercised items above are environmental limitations of the shared live
pair, not product failures observed in this run.
