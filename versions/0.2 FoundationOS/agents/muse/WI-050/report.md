# Interim tester report · WI-050 (functional only — visual pass superseded)

Candidate: PR #9 head `8eb1a9c` as instructed (local HEAD observed `8eb1a9c`).
Pair tested: built client 0.2 (`dist` 27 Nov) against released v0.1 server, both started
disposable: `%TEMP%\wi050-tester\` (store + client data-dir + logs). Seeded alice + blair
via `seed.mjs` + `seed-sprint6.mjs`. No tokens are recorded here; all redacted.

## Browser access and surfaces

- Built-in browser: AVAILABLE. `tools.browser.tabs.list` worked (empty list, no
  `browser.not-attached` error). The BLOCKED case in the brief did not occur.
- Surfaces actually used: (1) the approved `browse.*` Chrome integration for the first
  pass, labelled as such; (2) the built-in browser (`tools.browser.*`) for the second
  pass after it became available mid-run — one desktop tab plus two
  `qa/viewport.html` frame tabs (~390 px wide, heights 600/300). No product edits, no Git.
- Viewports used: desktop ~1905×889 and ~1920×889, plus 390-wide real-layout iframe
  frames. 320×600 was NOT reached before the stop instruction.
- Owner direction 27 Nov: visual/UI judgement of Home Bento sizing and the SVAR explorer
  is STOPPED and superseded by a design-led rebuild. This report covers function only.

## Functional results

PASS = reproduced working. FAIL = reproducible functional defect. NT = not tested (stopped).

| # | Check | Result | Notes |
|---|---|---|---|
| F1 | Connect as alice (desktop, built-in) | PASS | Server v0.1 ready, Home renders |
| F2 | Home tiles reflect data (pinned project, recents, idle Activity) | PASS | Projects/Weather pinned; recents list both opened apps |
| F3 | Explorer double-click root → Projects → nested Weather | PASS | Routes /files, /files/Projects, /files/Projects/Weather; breadcrumb + Unpin state |
| F4 | Card reveal on hover dwell | PASS | Measured dwell ≈1 s (code `DWELL_MS=1000`; brief says ~0.6 s — minor doc delta) |
| F5 | Run explains unavailability | PASS | Note names the app; tap/click reveals; Close+hover-away collapses |
| F6 | Open → overview for nested app | PASS | /app/Projects/Weather, "App · Projects/Weather", distinct brief |
| F7 | Nested README content distinct | PASS | Weather Lab text, separate from root README |
| F8 | Refresh → Connect → reconnect → same route + file | PASS | Requested-location retention; "Last member" shown |
| F9 | Back file → overview restores focus | PASS | Focus lands on Open README |
| F10 | Back overview → /apps focus | FAIL | Focus lands on BODY, cards collapsed; reproduced in both surfaces (Sev-2) |
| F11 | Deep link + reconnect into nested folder | PASS | /files/Projects/Weather retained across reconnect |
| F12 | Pin nested project → Apps shows second card | PASS | Weather Lab card with distinct descriptor; 8 folders checked |
| F13 | Nested descriptors distinct (API) | PASS | Weather / Weather Lab / Weather Archive / Desk weather READMEs all distinct |
| F14 | Malformed descriptor (Broken) | PASS | Folder browsable, correctly excluded from Apps |
| F15 | Missing folder route | PASS | "Not available … Go Home", no crash |
| F16 | Empty folder | PASS | "Back to parent folder", no entries |
| F17 | Loaded-dir search + sort | PARTIAL | Search filters (PASS); sort goes descending but will not toggle back via click or Enter (FAIL, Sev-3; SVAR-internal, explorer is being rebuilt) |
| F18 | Unsupported ops absent | PASS | No download/upload/delete/rename/copy/move in UI text, toolbar, menus |
| F19 | Disconnect → Connect context | PASS | Requested location + last member shown |
| F20 | Blair isolation | PASS | Own home/settings/recents; no Alice content; member-id keyed prefs |
| F21 | Cross-member requested location | PASS | Lands on Home (safe default), no leakage |
| F22 | All five backgrounds mount exactly one effect; Standard static | PASS | 1 canvas each; Standard 0; switching releases previous |
| F23 | Motion Off → static; Follow-system + no OS reduce → animated | PASS | 0 vs 1 canvas as specified |
| F24 | Follow-system + OS reduce from load | NT | Stopped. Mid-session media change is NOT picked up (no media listener; `motionIsReduced` evaluates per render) — Sev-3 observation |
| F25 | Apply / Reset to defaults | NT | Cancel restores saved settings (PASS); Apply/Reset unclicked |
| F26 | Solid vs Glass readability | NT | Stopped with visual pass |
| F27 | Settings persistence | PASS | `preferences.json` holds alice pin+recents+defaults under member UUID, no tokens; blair defaults until Apply |
| F28 | Server restart (same port) | PASS | Sessions survive (sqlite); client-config returns to ready; pre-restart token still 200 |
| F29 | Session revoke | PASS | DELETE own session → 200; later calls 401; admin untouched |
| F30 | Offline server | PASS | Banner "cannot reach its server", client-config `unreachable` |
| F31 | Scroll cancels pending hover dwell | CODE/UNIT | `AppCard.test.tsx` 5/5 pass incl. nested-surface scroll; live E2E inconclusive (automation round-trip exceeds dwell — methodology note, not product evidence) |
| F32 | Keyboard card activation / Escape | PARTIAL | Escape closes server dialog (PASS); card-level Escape-with-focus and full keyboard-only pass NT |
| F33 | Run double-activation guard | CODE/UNIT | `unlockAt` guard + unit test; consistent with observed behaviour |
| F34 | ~390 px frame (Apps/README) | PASS | Breadcrumb wraps, reader readable, no horizontal scroll seen |
| F35 | Show-all routes Home → Apps | PASS | In-app navigation keeps session |
| F36 | Unpin, 3-project/3-recent caps, 320×600, touch/pen/phone | NT | Stopped; touch/pen/controller/real phone unavailable regardless |

Severity: no Sev-1 (no functional acceptance criterion failed; F10 is an a11y gap in a
surface under redesign). Sev-2: F10. Sev-3: F17 sort toggle, F24 media listener,
dwell 1000 ms vs brief "~0.6 s". Transient (not filed): one "Superseded by a newer
connection" on a rapid double Connect in a frame; not reproduced deliberately.
Stale-request discard is code-verified (`AbortController` + ticket/member guards in
`useDirectory`/`useApps`/`useAppInventory`/`FileReader`/`AppOverview`); no live E2E.

Evidence: `shots/` in this folder (Chrome-pass PNGs 01–18; built-in screenshots were
returned inline; one 390-px frame capture exported via browser files).

## Cleanup — confirmed

- Killed and verified exited: server node 18036, server node 5512 (restart), client node
  16760. Wrappers exited with their nodes. No other PIDs touched (other agents' node
  processes left running).
- Ports 54574/63976 free (only TIME_WAIT remnants, no owners). `%TEMP%\wi050-tester`
  deleted in full (store, client data, fixtures/tokens, logs). `blair.tok` gone with it.
- Closed all 3 built-in tabs and the Chrome `wi050` tab group.
