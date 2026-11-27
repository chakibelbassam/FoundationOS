# PI-3 v0.3 release closeout

- Implementation PR: #12, `PI-03 Add accounts and connection to v0.3`.
- Branch: `edge-opencode/pi-03-accounts-and-connection`.
- Final implementation head: `3d7550c`.
- Version pair: client 0.3 with server 0.3; store schema 3.
- Date: 27 November 2026.

## Outcome

FoundationOS 0.3 has local accounts and connection: first-owner setup from the server console, username and password sign-in with a persistent session, member invitations by six-digit code, profile management, owner and member recovery, server-held preferences, and member self-deletion with a 30-day retained Home. A v0.1 or v0.2 store is refused with a clear message and left untouched.

## Automated evidence

| Check | Result |
|---|---|
| Server suite (`server.test.mjs`, `account-extra.test.mjs`) | 21/21 pass |
| Client suite (`npm test`) | 90/90 pass |
| Host and launcher (`tests/host.test.mjs`, `tests/launcher.test.mjs`) | 16/16 pass |
| Production build | pass |
| Scrum store validation | ok, 0 errors, 0 warnings |
| CI | client, client-03 and test pass on the implementation head |

## Independent reports

| Role | Model | Verdict | Report |
|---|---|---|---|
| Hands-on tester | Muse Spark 1.3 Contributor | Pass with findings, no Sev-1. The sign-out first-click finding was fixed and retested 4/4. | `qa/tester/tester-report.md` |
| Independent reviewer | GLM 5.3 Flash | Pass with findings, no Sev-1. F-1 and F-5 fixed; delta review calls the final head acceptable for owner review. | `qa/reviewer-report.md` |

The tester used real Chrome plus a PowerShell cookie jar; the reviewer used the browse-driven real Chrome and two disposable-profile CDP Chrome jars. Real Edge was not reachable from the browse relay, and the built-in browser namespace was empty in the reviewer session; both reports record that limitation.

## Release acceptance

| Row | Result |
|---|---|
| Fresh installation and older-store refusal | Pass. One owner from the console claim, competing tabs refused, older store refused and unchanged. |
| Remembered sign-in | Pass. Refresh, tab close/reopen and revoked-session boundaries verified. Full browser-process close was not exercised on the shared browser; tab close/reopen was. |
| Session boundaries | Pass. Three real browser jars: ordinary sign-out, cancel and confirm account-wide sign-out, another member unaffected, dropped confirmation. |
| Invitations and recovery | Pass. Invite redemption, collision, revocation, single use; member reset with clipboard paste into CodeSlots; owner recovery with the saved code; local console recovery covered separately by the coordinator. Invite 24-hour expiry was not waited out. |
| Profile and account closure | Pass. Rename, introduction, email, picture replace/remove, closure, exact 30-day deadline, reserved username, owner and other member access. Restore before the deadline is operator-only and was not exercised; hard deletion is covered by the controlled-clock test. |
| Workspace regression and polish | Pass with the recorded limits. Home, Projects, Apps, SVAR, reader, Back, appearance, narrow layouts, keyboard, paste, reduced motion and console were checked for both roles; real autofill population and a precise in-flight account switch were not reproduced. |

## Remaining non-blocking limitations

- Real Edge was not available through the browser relay; all browser evidence is Chrome.
- F-2: a `/files/<file>` deep link is a dead end; the reader lives at `/file/*`.
- F-3: four SVAR toolbar buttons have no accessible name; a known library limitation.
- F-4: a first load while the host is fully offline shows the browser error page; the in-app Retry covers the loaded app.
- Invite expiry, the full 24-hour window, restore-before-deadline, real autofill population and a precise in-flight account switch remain for a later pass.

## Owner action

The implementation PR #12 is ready for review. This closeout PR is stacked on it and retargets to `codex/development-workspace` after #12 merges. Edge does not merge either PR.
