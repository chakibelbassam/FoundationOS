# PI-3 independent reviewer report · v0.3 · candidate 9252141

Reviewer: GLM 5.3 Flash, independent QA reviewer session (third role per `Edge/goals/PI-3.md`).
Date of the run: 27 November 2026, 11:21–14:05 local (UTC−5).
Deliverable: this report and the screenshots under `versions/0.3 FoundationOS/qa/reviewer/`.

## Candidate

| Item | Value |
|---|---|
| Pull request | #12 (open, draft at review time) |
| Branch | `edge-opencode/pi-03-accounts-and-connection` |
| Reviewed head | `9252141` (`9252141bc729f8bfe2cbaa1d5fec2dda274b926d`) — verified as the local working-tree HEAD and as an ancestor of the PR head |
| PR head at report time | `f742ba2` — the remote branch carries 6 commits **after** the reviewed candidate (`a1351a1` WI-057 pair client host, `474a890` WI-058 CodeSlots entry states, `0cfd68d` WI-077 tester report, `a26e21c` tester pass evidence, `96c2bd4` WI-075 menu grow transition, `77ebcc2` WI-079 evidence table, `f742ba2` WI-075 sign-out retest). Those commits are **not covered by this report** and need both-reviewer coverage on the final head before the PR is marked ready. |
| Version pair | Client 0.3 with server 0.3; store schema 3 (`GET /status` → `{"version":"0.3","status":"ready","schema":3}`) |
| Pair under test | Client `http://127.0.0.1:63464/`, server `http://127.0.0.1:63462/`, fresh store, the assigned one-use setup claim. Left running, untouched. The tester pair on 63513/63515 was never used. |

## Environment, browsers and cookie jars

| Surface | What it actually was |
|---|---|
| Jar 1 (primary) | The browse-extension-connected **real Chrome** (v158, the machine's installed browser). The browse MCP could not reach **real Edge** — the relay lists only "Chrome on this computer", and the built-in browser namespace (`tools.browser.*`) exists in this environment with no tools. Edge journeys are therefore **not covered**; all browser checks were Chrome. |
| Jar 2 (member) | Real Chrome, **disposable profile** at a temp path, driven over the Chrome DevTools Protocol from Node (independent cookie jar). |
| Jar 3 (second owner session) | Real Chrome, second **disposable profile**, also CDP-driven (independent cookie jar). |
| API jars | Node 24 `fetch` clients with independent manual cookie stores for header/flag and revocation probes. |
| Viewports | Desktop (1920×945 and 1264×805), emulated **390×844** and **320×600** (mobile), emulated offline, emulated `prefers-reduced-motion: reduce`. |
| Accounts | Owner `reviewer` (later renamed to `reviewer-lead`), member `otter` (closed during the run). Passwords, the recovery code, invite and reset codes were kept in a scratch file **outside the repository** and are redacted from every artifact here. |

Notes on the environment: the browse tab idle timer was changed 10 → "never" during the run (tabs were being reaped mid-journey) and restored to 10 afterwards. Processes started and stopped by this review: a fake 0.2-status server, a second client host against it, and the two CDP Chrome jars — all stopped at the end; the reviewed pair remains running. No product source, tests, Scrum records or Git state were modified. The shared Chrome profile carries an unrelated `fo_sess_…` cookie from the other (tester) installation; both installations' per-installation cookie names coexisted without interference, which is incidental evidence for the per-installation cookie binding.

## Release acceptance rows and checks

Legend: ✅ pass · 🟡 pass with a finding or partial coverage · ⬜ not exercised (reason given). Evidence file names are under `qa/reviewer/`.

### Row 1 — Fresh installation and older-store refusal

| Check | Expected | Observed | Result | Evidence |
|---|---|---|---|---|
| Server link opens the correct client | Setup page names the paired server | "Create the owner" page with "Server v0.3 at http://127.0.0.1:63462" in both first-run tabs | ✅ | `01-setup-create-owner.png` |
| Competing first-run tabs yield one owner | Second tab cannot create another owner | Owner created in tab A; tab B re-rendered itself to **Sign in** (no creation form left) | ✅ | `03-competing-tab-refused.png` |
| Reopened setup link cannot create a second owner | Refusal, store untouched | Reopen landed on the signed-in Home; direct API `POST /api/setup` with the used claim → **409** `This installation already has an owner. Sign in instead.` | ✅ | `04-setup-link-reopened-refused.png`; API output in the report log |
| One owner with a private Home and default preferences | One account, empty Home, server-side prefs | `GET /api/accounts` → exactly one owner; `GET /api/files` → `[]`; `GET /api/preferences` → `preferences:null`; Home renders "reviewer's home / Your private workspace" | ✅ | API output; `07` |
| v0.1/v0.2 store refused and left untouched | Clear refusal naming the pair; no migration | Controlled fixture: SQLite with `schema_meta` = 2 → server exits **1** with `store-refused` event: "this store is schema 2; FoundationOS 0.3 only opens a fresh 0.3 store… The existing store was not changed." Store content re-read after: still version 2, no 0.3 tables (opening created empty `-wal`/`-shm` companions only). Automated: `v0.3 refuses an older store` passes inside the 21-test suite | ✅ | Command + output cited in the log; automated suite below |

### Row 2 — Remembered sign-in

| Check | Expected | Observed | Result | Evidence |
|---|---|---|---|---|
| Refresh and close/reopen restore the page | No password re-entry, session checked before render | Closed and reopened the tab twice; Home restored each time without credentials | ✅ (tab close/reopen) | `07-tab-reopen-session-restored.png` |
| Full browser close/reopen | Same | **Not exercised**: closing the shared Chrome would have killed the concurrently running tester session's tabs; tab-level reopen was used instead | ⬜ (limitation) | — |
| Revoked session prompts for credentials | Sign in after global sign-out/reopen | After the owner's global sign-out, jar 3 reopen → Sign in; protected API → **401** `Invalid or expired session` | ✅ | `25-jar3-lost-access-reopen.png` |
| Temporary outage preserves route and offers Retry | In-app outage screen with Retry | Emulated offline inside the loaded app: "Server is not reachable.", route `/files` preserved, "Check connection" restores when back online. (First load while fully offline shows Chrome's native error page — no service worker; the in-app promise applies to the loaded app.) | 🟡 | `60–62` |
| Missing / denied deep links give a safe action | Not-found screen with a way home; authorized deep link returns after sign-in | Unknown route → "That page is not part of this workspace… Go Home"; signed-out `/settings/profile` → sign in → **returns to `/settings/profile`** | ✅ | `08`, `09`, `59-unknown-route.png` |
| Remember me default | Checked by default, persistent cookie | Checkbox checked on every sign-in screen; `Set-Cookie: fo_sess_<install>=…; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` (30 days) | ✅ | API header capture |

### Row 3 — Session boundaries (A/B same account, C different member)

Three **real browser jars** were used: jar 1 (owner), jar 3 (owner, disposable profile), jar 2 (member `otter`, disposable profile).

| Check | Expected | Observed | Result | Evidence |
|---|---|---|---|---|
| Ordinary sign-out in A leaves B and C working | B and C unaffected | Sign out in jar 1 → Sign in screen; jar 3 and jar 2 reload → both still signed in | ✅ | `19`, `20`, `21` |
| Sign back into A, cancel account-wide sign-out | Cancel preserves all sessions | Dialog lists consequences ("ends every session for reviewer… Other members stay signed in. Your files, settings and password are unchanged."), Cancel first; after Cancel all three jars still signed in | ✅ | `22`, `23` |
| Confirm account-wide sign-out | A returns to Sign in; B loses access on next request and reopen; C keeps working | Confirm → jar 1 at Sign in; jar 3 reopen → Sign in and API → **401**; otter (jar 2) still signed in and opens `member-note.txt` in the reader | ✅ | `24`, `25`, `26` |
| Original user signs back in, same files and settings | Same account ID, files, prefs | Sign-in with the same password → Home intact; `GET /api/files` shows `owner-note.txt`; account ID unchanged | ✅ | `27` |
| Dropped confirmation response | Local access cleared, server result unconfirmed, retry path | Offline confirm → "Local access ended. The server could not confirm that every session ended." + Retry; the other owner session (jar 3) was **still valid** (revocation had not happened server-side) | ✅ | `28-signout-offline-unconfirmed.png` |

### Row 4 — Invitations and recovery

| Check | Expected | Observed | Result | Evidence |
|---|---|---|---|---|
| Successful redemption | One account with its own Home | Member `otter` joined in jar 2 via CodeSlots; landed in `otter's home` (separate, empty) | ✅ | `12`, `14` |
| Home separation and cross-read | Each Home private | Owner's explorer lists only `owner-note.txt`, otter's lists only `member-note.txt`; owner API-read of otter's file → **404**; otter API-read of owner's file → **404** | ✅ | `15`, `16`, `17` |
| Name collision | Clear message, input kept, invite stays valid | Join with the closed-but-reserved `otter` → "That username is already taken. Choose another.", field keeps the input, invitation stayed `pending` | ✅ | `50` |
| Repeated redemption | Refused | The used invitation code → refused in the UI (message copy is misleading — defect F-1); server answers 401/429 with a clear message at the API level; redemption rate limiting engaged after several attempts | 🟡 | `52` |
| Revocation | Owner revokes; member blocked | Owner clicked Revoke → state `revoked` in UI and API; join with the revoked code → refused | 🟡 (F-1 copy) | `51` |
| Expiry (24 h) and expired state | — | **Not exercised** (would need 24 h); `pending/used/revoked` states observed in the UI, `expired` not seen | ⬜ | — |
| Password change | Ends every session incl. current; new password works | "Password changed. Sign in with the new password." Jar 1 signed out; jar 3 (second owner session) → reopen Sign in + API **401**; otter unaffected; sign-in with the new password reaches the same Home | ✅ | `29` |
| Member reset code | Owner issues six digits (30 min); member enters with CodeSlots, sets new password; old sessions revoked; same workspace | Owner alert with code + expiry + Copy; member used the **OS clipboard paste into CodeSlots** (Ctrl+V filled all six slots, "6 of 6 digits entered"); old password → **401**, new password → **200** with the same account ID and file; the first reset code was consumed and its reuse rejected ("That code is not valid or has expired.") | ✅ | `30`, `30b`, `32`, `33` |
| Owner recovery code | 16-char code consumed once, replacement issued, sessions revoked | Recovery with the saved code → "Password changed. Your new recovery code is below…", new code issued and saved (redacted evidence); old password → **401**, new → **200**; jar 3 (pre-recovery session) → reopen Sign in + API **401**; old code reuse → **401** `The username or recovery code is not correct.` | ✅ | `34` |
| Local maintenance recovery (console R) | Operator flow on the server machine | **Not exercised** — the server console belongs to the coordinator session; the task list did not include it; WI-069 carries its own terminal evidence | ⬜ | — |

### Row 5 — Profile and account closure

| Check | Expected | Observed | Result | Evidence |
|---|---|---|---|---|
| Rename | Availability check; conflicts keep input; ID/role/sessions/home/prefs stay; header updates | Collision (`otter`) → "That username is already taken."; reserved (`owner`) → "…Some names are reserved."; rename to `reviewer-lead` succeeded, header updated, account ID unchanged, old username no longer signs in, new one does | ✅ | `35`, `36` |
| Introduction | Plain text, 500 limit, persists | Saved 68 chars; counter "68 of 500 characters"; persists after reload | ✅ | `37`, `38` |
| Email | Optional, unverified, format-checked, persists | `qa-reviewer@example.org` saved, "Unverified." label, persists after reload | ✅ | `38` |
| Picture | PNG/JPEG ≤2 MB ≤4096 px, preview, replace, remove, initials fallback | PNG upload → preview → Save → served as `image/png`; replaced with a second PNG; SVG refused client-side ("Choose a PNG or JPEG picture."); Remove → initials avatar; all persisted after reload | ✅ | `39–44` |
| Close own member account | Password + explicit confirmation; exact deadline; access ends | Dialog states consequences and deadline; **Cancel preserves the account**; Confirm → returns to Sign in with "Account closed. The private Home is retained until 27/12/2026."; re-login with the (still correct) password refused with the closure notice | ✅ | `46`, `47`, `48` |
| Old sessions cannot reach the retained Home | Revoked on closure | The member's own re-login is refused; live store row shows `closed_at` + `retained_until = 2026-12-27` (+30 days); server suite passes "a member closes their account and the username stays reserved" | ✅ (browser + automated) | `48`; automated suite |
| Username cannot be reused while retained | Reserved for 30 days | Fresh invite + join as `otter` → "That username is already taken. Choose another." | ✅ | `50` |
| Sole owner and another member keep access | Owner unaffected by member closure | Owner jar reloads fine during and after closure | ✅ | `53` |
| Restore before 30 days / hard delete at deadline | Restore is operator-assisted; purge at deadline | **Restore not exercised** (no UI; operator flow). Hard delete verified by the automated test with a controlled clock: `a retained Home and username are hard deleted at the 30-day boundary` (FOUNDATIONOS_NOW 2026-01-01 → retained until 2026-01-31 → restart 2026-02-01 → Home removed, username released) | 🟡 (restore ⬜) | automated suite output below |

### Row 6 — Workspace regression and polish

| Check | Expected | Observed | Result | Evidence |
|---|---|---|---|---|
| Home, Projects, Apps, SVAR File Explorer, reader, Back | All render and behave | Home panels fine; Projects/Apps show clear empty states; explorer lists own files only; reader opens `owner-note.txt` with content; in-app Back and browser-history Back both return to the folder | ✅ | `55–58` |
| With two members | Regression for both roles | Owner (jar 1) fully regressed; member (jar 2) exercised Home/Files/reader before closure; the member-side appearance/settings regression was lighter | 🟡 | `12–17`, `26` |
| Switch accounts with a request in flight | No stale/private bleed | Not precisely reproduced (needs controllable latency); offline→online transitions showed no stale-state errors | ⬜ (approximated) | — |
| Keyboard-only entry | Visible focus, Tab order, Enter submits | Sign-in autofocuses the username; Tab order username → password → remember-me → Sign in → links; **Enter submits** (verified on both the success path, 200 → Home, and the error path, 401 → inline error); links show a solid 3-px focus outline; text fields indicate focus via the MUI label colour change (subtle but present) | ✅ | `67–71` |
| Autofill | Proper autocomplete attributes | `username`, `current-password` (sign-in), `new-password` ×2 (join/reset), `one-time-code` (CodeSlots), `email`. **Real autofill population not verified** (no saved credentials in the disposable jars; none were saved into the owner's profile) | 🟡 | DOM attribute capture |
| Paste into CodeSlots | Paste fills the slots | OS-clipboard Ctrl+V pasted six digits, counter reached "6 of 6 digits entered" | ✅ | `32` |
| Narrow layouts | No breakage at 390 px and 320×600 | `scrollWidth == clientWidth` at 390 (Home, Settings) and 320×600 (sign-in, Settings); screenshots show stacked, usable layouts | ✅ | `72–76` |
| Reduced motion | Animations respect the OS setting | Emulated `reduce`: page renders correctly, no errors; **no `prefers-reduced-motion` CSS rules found in the loaded stylesheets**, JS-driven motion (React Bits) not verifiable from a static probe | 🟡 | `77` |
| Appearance and preferences sync (WI-080) | Server-authoritative prefs, per member | Dark + Glass previewed and Applied → server `GET /api/preferences` returns `theme:dark, surface:glass, …` with `updatedAt`; persists after reload; per-account keying verified via `accountId` | ✅ | `63–66` |
| Browser console | No unexpected errors | Zero unexpected entries across Home/Projects/Apps/Files/reader/settings/rename/avatar journeys; the only entries were `ERR_INTERNET_DISCONNECTED` during the intentional offline window | ✅ | console capture |

## Automated suites re-run by the reviewer (commands + results)

From `versions/0.3 FoundationOS/FoundationOS Server`:

```
node --test server.test.mjs account-extra.test.mjs
  ✔ … 21 tests, 21 pass, 0 fail (duration 9.5 s)
  includes: "a member closes their account and the username stays reserved",
            "owner recovery consumes the code, rotates it and revokes sessions",
            "current-session sign-out leaves another session alive",
            "sign out of all sessions ends every session for one account only",
            "private homes stay isolated"

node --test --test-name-pattern "30-day|close their account|restore" account-extra.test.mjs server.test.mjs
  ✔ a retained Home and username are hard deleted at the 30-day boundary (1.98 s)
```

From `versions/0.3 FoundationOS/FoundationOS`:

```
npm test            → 17 files, 88 tests passed (74.8 s)
node --test tests/host.test.mjs tests/launcher.test.mjs
                    → 16 tests passed (2.6 s), incl. "incompatible server reports ok:false
                       with expected and found" and "Start.cmd passes a positional server URL"
```

Version boundary, client side (commands + observed output):

```
node <fake 0.2 server>            → /status answers {"version":"0.2","status":"ready","schema":2}
node host/serve.mjs --server http://127.0.0.1:63599 --port 0 --no-open --data-dir <temp>
  stdout: "Server incompatible at http://127.0.0.1:63599: expected version 0.3,
           found version \"0.2\" status \"ready\" schema 2"
  stdout: "FoundationOS 0.3 client ready at http://127.0.0.1:58143/"
Browser at that client URL:
  alert "This client needs server v0.3; found 0.2."
  alert "Start the matching v0.3 server. The client and server must both be 0.3."  (+ Retry)
```

Version boundary, server side (controlled fixture):

```
node <fixture: create SQLite with schema_meta version = 2, then spawn server.ts with
     FOUNDATIONOS_DATA=<fixture dir> FOUNDATIONOS_PORT=0>
exit code: 1
stdout: {"event":"store-refused","message":"FoundationOS 0.3 refuses to start: this store is
        schema 2; FoundationOS 0.3 only opens a fresh 0.3 store. Start with a new data folder
        (set FOUNDATIONOS_DATA) or use the matching FoundationOS version. The existing store
        was not changed."}
post-check: schema_meta still version 2; no 0.3 tables (opening created empty -wal/-shm files only)
```

## Defects and findings

No Sev-1 (release-blocking) defect was found.

| ID | Severity | Finding | Reproduction | Retest possible? |
|---|---|---|---|---|
| F-1 | **Sev-4** (UX/copy, misleads the user; no data risk) | **Join form shows "The username or password is not correct." when the invitation code is invalid, revoked or already used.** The server answers 401 with the actionable message "That invitation is not valid. Ask the owner for a new one.", but the client maps every 401 to the sign-in copy (`SessionContext.tsx` line 43: `if (error.failure.kind === 'unauthorized') return 'The username or password is not correct.'`), so the code-specific message never reaches the join screen. The plan explicitly asks for "actionable feedback for expired codes". Collision errors (409) do surface correctly. | 1. Owner creates an invitation, then revokes it. 2. Member opens Join by invitation, enters the revoked code and fresh credentials. 3. Observe the error text vs the API response. | Yes — with a fresh invite after the redemption rate-limit window; the fix is a one-line message mapping (route 401 from `/accounts/join` to the server's error body). |
| F-2 | Sev-5 (polish) | A **file** path opened under `/files/*` (e.g. `/files/member-note.txt`) shows "Asset not found" with no Back affordance; the reader lives at `/file/*`. Harmless (error state, no data leak) but a deep-link user gets a dead end. | Sign in, navigate to `/files/<existing file>.txt`. | Yes |
| F-3 | Sev-5 (a11y) | The SVAR File Explorer toolbar has **four buttons with no accessible name** (no `aria-label`, no `title` — the snapshot lists them as `button "button"`). Keyboard/AT users cannot tell what they do. | Open Files with a screen reader or inspect the toolbar buttons. | Yes |
| F-4 | Sev-5 (observation) | First load while fully offline shows the browser's native error page (no service worker); the in-app outage/Retry behaviour applies to the loaded app and was verified. Documented so the Manual promise stays scoped. | Load the client with the server stopped and the network emulated offline. | n/a (design note) |
| F-5 | Sev-5 (observation) | The "Server connection" popover reads "Expected v0.3 · found none" while offline — slightly confusing copy next to the accurate "Server is not reachable." | Emulate offline with the app loaded, open the connection popover. | Yes |

Investigated and **disproven** (for the record): an apparent hang of keyboard-Enter sign-in submissions turned out to be a test artifact — Enter submits correctly on both the success path (200 → Home) and the error path (401 → inline error) once the correct (post-rename) username was used; the network capture's own completion accounting was unreliable.

## What this review could not exercise

- **Real Edge** journeys — the browse relay in this environment only reaches Chrome, and the built-in browser namespace is empty here. All browser evidence is Chrome (jar 1 real profile, jars 2/3 disposable profiles).
- **Full browser-process close/reopen** for the persistent cookie (would have closed the concurrent tester session's tabs in the shared Chrome). Tab close/reopen was verified twice; the decisions' stricter variant remains for the final-head pass on a dedicated browser.
- **Console-R local owner recovery** (the server console belongs to the coordinator).
- **Restore of a retained Home before the 30-day deadline** (operator-assisted flow, no UI surface).
- **Invitation expiry / the expired state** (24 h) and the exact redemption rate-limit ladder behaviour beyond "Too many attempts. Try again later." (the rate limiter engaged during repeated join attempts).
- **"Switch accounts with a request in flight"** as a precise race (only offline/online transitions were exercised).
- **Real autofill population** and **animation suppression under reduced motion** (attributes and static probes only).
- The **hands-on tester's report** — `qa/tester-report.md` was absent from this working tree at review time (it exists on the remote PR head in commit `0cfd68d`), so no cross-check between the two browser reports was possible here.
- Everything after `9252141`: the six newer commits on the PR branch (including the tester report, a profile-menu transition fix and the evidence-table update) are outside this review and need fresh reviewer coverage on the final head.

## Verdict

**Pass with findings.**

The candidate `9252141` met every release-acceptance observation I could reach with three independent browser jars, an API jar set and the automated suites (21 server + 88 client + 16 host/launcher, all green, plus the controlled-clock 30-day purge test and both version-boundary directions). The six findings are Sev-4 or lower; F-1 (join error copy) is the only one I would want fixed and re-verified before the owner merges, and it is a small, contained change. Because the PR head has moved six commits past the reviewed candidate, the final head needs at least a delta pass covering those commits (the goal requires both browser reports to cover the final candidate) — this report does not by itself clear the PR for "ready".

**Update after the delta review:** that delta pass has now been performed at the final head `d0b74ac` (see the section below). F-1 and F-5 are verified fixed in the browser, the menu fix and the regression checks pass, and the suites are green at the final head (21 server / 90 client). The remaining findings are the Sev-5 notes F-2/F-3/F-4/F-5-remainder only. **The final head `d0b74ac` is acceptable for owner review.**

## Delta review at d0b74ac

Short delta pass on the final head, appended on 27 November 2026 (19:00–19:15 local). Scope: the commits after `9252141` — the hands-on tester report (`0cfd68d`), CodeSlots entry-state tests (`474a890`), client-host pairing (`a1351a1`), tester closure evidence (`a26e21c`), the profile-menu grow-transition fix (`96c2bd4`), the evidence-table update (`77ebcc2`), the tester sign-out retest (`f742ba2`), the F-1 join-message fix (`271f13d` WI-065) and the F-5 offline-popover fix (`953d261` WI-075), plus `d0b74ac` (this report under Git). The full journey was **not** repeated; the multi-jar session matrix was not re-run (per instructions).

| Item | Value |
|---|---|
| Reviewed head | `d0b74ac` (`d0b74ac4379b853b0ef5c51f17516d67ddf313e5`) — verified as the local working-tree HEAD **and** the remote PR head (`git ls-remote`) |
| Pair used | **The same review pair**, still running and untouched: client `http://127.0.0.1:63464/`, server `http://127.0.0.1:63462/` (same process PIDs as the full pass). The client `dist` was rebuilt and served by the host, as stated by the coordinator. Store state carried over: owner `reviewer-lead` (renamed from `reviewer`), closed member `otter` retained until 27/12/2026, prior invitations in used/revoked states. |
| Browser / jar | The browse-driven real Chrome (jar 1), signed in as `reviewer-lead` with the owner password from the earlier pass. |

### F-1 — join error copy (fixed) — ✅ PASS

1. Signed in as owner → Settings → Accounts → **Create invitation** (code shown; redacted in `d2-invite-created-REDACT.png`; invitation list `pending` at capture time).
2. Clicked **Revoke** → the invitation flips to `revoked` (`d3-invite-revoked.png`; API states `[revoked, revoked, used]`).
3. Signed out, opened **Join by invitation**, entered the revoked six digits (counter "6 of 6 digits entered") with fresh credentials (username `puma`, password set; the account was **not** created) and submitted.

Exact observed error at **`/join`**: `That invitation is not valid. Ask the owner for a new one.` — the invitation message, **not** "The username or password is not correct." The slot counter resets to "0 of 6 digits entered" and the join form stays usable. Evidence: `d4-join-revoked-code-error.png` (slots empty, no digits visible).

### F-5 — offline popover copy (fixed) — ✅ PASS

Loaded the app signed in, emulated offline: header button becomes "Server offline", status line "Server is not reachable." The Server connection popover now reads `Expected v0.3 · found not reachable` (previously `found none`) plus "Last check: 19:08:59" and a "Check connection" button. Evidence: `d5-offline-popover.png`. Restored online and clicked Check connection → status returns to "Server v0.3 is ready.".

### Menu delta — ✅ PASS

On `/settings/profile`, opened the header profile menu and clicked **Sign out** with the first click — signed out immediately (Sign in page reached), repeated three times across the delta pass (after the profile page and twice after the accounts page) with no missed click. Signed back in afterwards.

### No regression on the changed screens — ✅ PASS

- Reloaded `/join`, `/signin`, `/settings/profile`, `/settings/accounts`: all render correctly; the accounts page still lists `otter member closed … retained until 27/12/2026`, `reviewer-lead owner`, and pending/revoked/used invitation states.
- Browser console: the only error-type entries were the **expected** signed-out session probes (`GET /api/profile → 401` logged by the browser as failed resource loads while on public pages). Zero application errors or uncaught exceptions during the delta pass.
- Automated suites at the final head (run from the working tree at `d0b74ac`): server `node --test server.test.mjs account-extra.test.mjs` → **21/21 pass**; client `npm test` → **90/90 pass** (17 files; the +2 over the full pass are the new CodeSlots entry-state tests).

### Earlier-pass flows still behave — ✅ PASS

Home renders with the persisted server-side preferences (theme `dark`, surface `glass` — unchanged since the full pass, same account ID), the reader opens `owner-note.txt`, and Back returns to the previous workspace entry (`d6-reader-back.png`). The multi-jar session matrix was deliberately not repeated.

### New findings

None. One note, not a defect and not new to this head: while signed out, the app's session probes log 401 resource errors in the browser console; this is expected polling behaviour, handled by the app.

### Delta verdict

**The final head `d0b74ac` is acceptable for owner review.** F-1 and F-5 are fixed and verified in the browser; the menu first-click fix and the regression checks pass; both suites are green at this head. The open items from the full report remain the Sev-5 notes (F-2 `/files/<file>` dead end, F-3 unlabeled explorer toolbar buttons, F-4 no service worker on first offline load, plus the unexercised Edge journeys and the other scope limits listed above) — none blocks owner review.
