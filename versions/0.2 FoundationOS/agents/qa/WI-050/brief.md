# Brief · WI-050 independent QA (GLM 5.3 Flash)

You are the **independent QA reviewer**, separate from Edge, the developer and the Muse hands-on tester. Derive your own checks from the work items; do not reuse the tester's report as your own run. No Git, no product edits, no Scrum edits. Write only under `versions/0.2 FoundationOS/agents/qa/WI-050/`.

Candidate: the latest PR #9 head given in the message that starts your run.

## Set up your own disposable run

Use `%TEMP%\wi050-qa\` only; never the owner's installation or another agent's ports. Start the released v0.1 server, seed two homes and the nested Weather fixture with `seed.mjs` and `seed-sprint6.mjs`, then start the client with `Start.cmd <server-url> --no-open --data-dir "%TEMP%\wi050-qa\client"`. Track the PIDs you start, stop only those, verify exit, and delete the temp trees (they contain tokens).

## Browser rules

Drive the **OpenCode built-in browser only** (`browser.*`). Do not launch Chrome. Do not count Edge's or the tester's browser runs as yours.

- **Access check first.** Call `browser.tabs.list`. If the tool is absent, record the browser pass as **BLOCKED** with the exact error and the upstream limitation (child sessions do not receive the desktop attachment), do not substitute another browser, and complete every non-browser check you can. Edge keeps WI-050 open until real interactive passes exist.
- Desktop: the tab at the launcher-printed URL.
- Actual narrow viewports: `<launcher URL>/qa/viewport.html?w=390&h=600&url=/` and `...?w=320&h=600&url=/`; inspect the iframe through `browser.frames` and record `innerWidth`/`innerHeight`.

## Independent coverage

Read WI-045 … WI-053 and derive checks. Cover at least:
- the primary Home → explorer → nested Weather → actions → overview → README → refresh → reconnect → Back journey;
- member switch and preference isolation across a port-changing restart;
- nested descriptors and the scroll-cancelled hover;
- SVAR unsupported actions and deep links;
- Bento destinations, pin/unpin, recent apps, Activity truthfulness;
- Topography first-run default, all five backgrounds, fallback with Motion Off/Follow system, resource release, Solid/Glass contrast and layering;
- keyboard, Target Cursor, 320×600 stacking, no horizontal scrolling;
- revoked session, unavailable server, missing file, malformed descriptor.

Run the automated suites and `scrumWorkSpace validate` yourself, and check the PR's required CI jobs at the candidate SHA. Record exact commands and observed output.

## Report

Write `versions/0.2 FoundationOS/agents/qa/WI-050/report.md` with: candidate and environment, per-check PASS/FAIL/BLOCKED with steps and evidence, findings with severity/reproduction, CI status, and gaps (hardware, tooling). Reply with PASS/FAIL/BLOCKED counts and the Sev-1 list.
