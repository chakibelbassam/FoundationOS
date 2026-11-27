# Brief · WI-040 Run independent release-journey QA

Role: GLM 5.3 Flash · model `opencode-go/glm-5.3-flash` at `max` (highest supported).
You are the independent tester, not the implementer. Do not run Git and do not edit product source, tests, docs or Scrum records. Write only under `versions/0.2 FoundationOS/agents/qa/WI-040/`.

## Candidate

- Branch `edge-opencode/pi-02-client-foundation`, candidate revision `b8459c6` (plus this evidence commit).
- Client 0.2 at `versions/0.2 FoundationOS/FoundationOS/`; released server 0.1 at `versions/0.1 FoundationOS/FoundationOS Server/`.
- Acceptance: `scrumWorkspace/work-items/WI-040.json`; owner decisions: `scrumWorkspace/documents/PI-02/owner-decisions.md`; plan: `scrumWorkspace/documents/PI-02/client-increment-plan.md`.
- Edge has already run the interactive journey in the built-in browser; you own the independent, derived checks and a critical review of the evidence in `versions/0.2 FoundationOS/qa/`.

## Environment rules

- Use disposable data only: `FOUNDATIONOS_DATA` for the server and `--data-dir` for the client host, both under `%TEMP%\wi040-*`. Never touch `%LOCALAPPDATA%\FoundationOS` or the running QA ports 54544/64617.
- Create members with `versions/0.2 FoundationOS/FoundationOS/tests/fixtures/seed.mjs` into a temp `--out` file. Never print tokens; redact them in the report.
- Do not drive the built-in browser; Edge owns those tabs. You may start your own server/host on free ports and use HTTP.
- No Git commands. No changes outside your report folder.

## Checks to derive and run

1. **Automated suites.** Run and record exact commands and counts: root `npm test`; `node Edge/tools/scrumWorkSpace.mjs validate`; the v0.1 server/contract tests; in `FoundationOS/`: `npm test`, `node --test tests/host.test.mjs`, `node --test tests/fixtures/seed.test.mjs`, `npm run build`.
2. **Server-first startup.** Start a disposable v0.1 server, then the built host with its URL. Confirm the host prints the ready line and `/client-config` reports `ok:true`, version 0.1 and a schema.
3. **Wrong or missing server.** Host pointed at a dead loopback port: `/client-config` should report unreachable and `/api/files` should return 502. A stub server returning `version: "0.2"` should be reported incompatible with expected/found. A non-loopback address should be rejected.
4. **Session revocation.** Create a member session, use it for `GET /profile`, revoke it with an admin session, and confirm the same token now returns 401. Note which client code path reacts (see `src/api/client.ts` and `src/app/SessionContext.tsx`).
5. **Stale responses and member change.** Inspect `src/workspace/useDirectory.ts`, `useApps.ts`, `focusReturn.ts` and `src/app/App.tsx`. State whether an old member's response or a late descriptor can render after the member changes; cite lines.
6. **Preferences.** Exercise `/preferences/load` and `/preferences/save` with two member ids, missing entries, invalid values, and a failed write (read-only file). Confirm the last good file is preserved and the response codes match the brief.
7. **Different-port restart.** Stop the host, start it again on another port with the same data dir, and confirm both members' preferences are returned by member id.
8. **Evidence review.** Read `versions/0.2 FoundationOS/qa/release/README.md` and the sprint notes. List every claim that lacks evidence or conflicts with the code.

## Report

Write `versions/0.2 FoundationOS/agents/qa/WI-040/report.md` with:
- candidate and environment (OS, Node, browser, viewports, data dirs),
- one row per scenario: PASS / FAIL / SKIP, exact command or request, observed output,
- for each FAIL: severity (Sev-1 blocks the release; only a failure of a stated PI acceptance criterion is Sev-1), reproduction, expected, actual,
- a short list of untested areas and why.

Finish your reply with the counts (PASS/FAIL/SKIP) and any Sev-1.
