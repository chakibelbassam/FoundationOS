# PI-3 release evidence · v0.3

Candidate: PR #12, branch `edge-opencode/pi-03-accounts-and-connection`, head `a1351a1`.
Version pair: client 0.3 with server 0.3. Store schema 3.
Date: 27 November 2026.

## Automated checks

| Check | Command | Result |
|---|---|---|
| Server | `node --test "versions/0.3 FoundationOS/FoundationOS Server/server.test.mjs" "versions/0.3 FoundationOS/FoundationOS Server/account-extra.test.mjs"` | 21/21 pass |
| Client | `npm test` in `versions/0.3 FoundationOS/FoundationOS` | 83/83 pass |
| Host and launcher | `node --test tests/host.test.mjs tests/launcher.test.mjs` | 16/16 pass |
| Production build | `npm run build` | pass |
| Scrum store | `scrumWorkSpace validate` | ok, 0 errors, 0 warnings |
| CI | GitHub Actions run on the PR head | client, client-03 and test pass |

## Browser reports

- Hands-on tester: `qa/tester/tester-report.md` (Muse Spark 1.3 Contributor, separate session).
- Independent reviewer: `qa/reviewer/reviewer-report.md` (GLM 5.3 Flash, separate session, separate browser jar and fresh store).

## Work items

| Item | Outcome | Evidence |
|---|---|---|
| WI-054 Capture the accepted workspace baseline | Accepted v0.2 client and v0.1 server recorded at base 74dc456 | `scrumWorkspace/documents/PI-03/baseline.md` |
| WI-055 Set the session and account lifecycle policies | Decision table for sessions, credentials, retention and purge | `scrumWorkspace/documents/PI-03/session-and-retention-policy.md`; server tests |
| WI-056 Create the versioned v0.3 account store | Schema 3 store with owner, sessions, invitations, preferences, profile and retained state | `server.ts`; 21 server tests |
| WI-057 Launch the paired v0.3 client and server | Console O spawned the client and printed the setup link; R recovered the owner; host tests 16/16 | Terminal capture in this session; `tests/host.test.mjs`; CI |
| WI-058 Build the shared MUI account forms | Setup, sign-in, join, recovery and account screens; CodeSlots; 83 client tests and build | `src/account/`, `src/api/`, `src/app/`, `src/settings/` |
| WI-059 Create the first owner from the server link | Setup claim created one owner and showed the recovery code; mixed-case claim covered | Browser; `server.test.mjs` |
| WI-060 Refuse an older store with a clear message | Schema 2 store refused with exit 1 and an untouched store | `server.test.mjs` |
| WI-061 Sign in and open a private file | Cookie sign-in opened the private Home; generic invalid-credential copy; scrypt | Browser; `server.test.mjs` |
| WI-062 Remember a valid session after browser close | Tab close and reopen restored the member without a password | Browser |
| WI-063 Restore authorized routes on reconnect | Signed-out `/settings/profile` returned there after sign-in | Browser |
| WI-064 End one session or all my sessions | Current sign-out kept another session; account-wide sign-out ended both and left another member working | `server.test.mjs`; browser dialog |
| WI-065 Invite and create a member account | Six-digit invite, CodeSlots join, private Home, collision handled | Browser; `server.test.mjs` |
| WI-066 Change my password from Profile | Password change revoked sessions and rejected the old credential | `account-extra.test.mjs`; browser |
| WI-067 Reset a member password by one-use code | Owner code, CodeSlots reset, new password, old sessions revoked | Browser; `server.test.mjs` |
| WI-068 Recover the owner using the saved code | Saved code reset the password, rotated the code and revoked sessions | Browser; `server.test.mjs` |
| WI-069 Recover the owner on the server machine | Console R reset the owner, printed a new code, old password 401 and new 200 | Terminal capture |
| WI-070 Rename my account without moving my workspace | Rename kept the Home and preferences; old name failed and new name signed in | `server.test.mjs`; browser |
| WI-071 Close my account and take its Home offline | Member closure revoked access, retained the Home and reserved the username | `server.test.mjs`; browser pass in the tester report |
| WI-072 Recover or expire a retained private Home | Restart after the 30-day deadline deleted the Home and row and released the username | `account-extra.test.mjs` |
| WI-073 Edit my introduction and optional email | Profile form and PATCH validate and persist both fields | Browser; `server.test.mjs` |
| WI-074 Add, replace or remove my profile picture | PNG upload validated, served and removable; SVG and oversize refused | `account-extra.test.mjs`; browser |
| WI-075 Polish account and profile interactions | Headings, notices, duplicate chip, focus and destructive dialogs corrected | Browser screenshots; 390/320 checks in the reports |
| WI-076 Document launch, store and account operations | Operator and member guide written from the built candidate | `versions/0.3 FoundationOS/README.md` |
| WI-077 Test the release journeys in real browsers | Tester journey report | `qa/tester/tester-report.md` |
| WI-078 Independently review the release in real browsers | Independent reviewer report | `qa/reviewer/reviewer-report.md` |
| WI-079 Fix findings and assemble release evidence | This table, the two reports and the retests | This file; PR #12 and PR 2 |
| WI-080 Sync member preferences through the server | Server stores preferences; the client caches and reloads them | Browser; `server.test.mjs` |

## Known limitations

- No remote access, HTTPS, email delivery, social sign-in or ownership transfer. Remote access is v0.5.
- Backups are outside the 30-day purge; a restored backup can contain a retained Home.
- The 30-day value is a constant in v0.3, structured for a later server setting.
- The client host keeps the v0.2 preferences endpoints as dead code while the server owns preferences; removing them is follow-up cleanup.

The owner merges. Edge does not merge.
