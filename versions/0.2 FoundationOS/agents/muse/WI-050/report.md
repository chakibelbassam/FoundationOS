# Interim tester report · WI-050 (functional only — visual pass superseded)

## Retest at e1cfa29

Candidate: PR #9 head `e1cfa29` ("WI-049 Rebuild the Home and explorer to the owner's design
bar"). Fresh disposable stack `%TEMP%\wi050-retest\` (server :62567, client :53391,
reseeded alice + blair). Dist rebuilt 01:19 contains the new design (`wxi` present).
No tokens recorded. Raw `shots/` folder removed; curated secret-free PNGs sit directly
in this folder (`r-*.png`).

Browser: built-in `tools.browser.*` first and primary (6 tabs: desktop + 4 viewport
frames + blair), plus the connected `browse.*` Chrome integration for the Follow-system
live test and true 1307×800 / 1024×700 viewports (viewport.html clamps width at 900,
so 1307/1024 were done via `browse.emulate`).

### Prior FAILs / observation — all resolved except sort

- F10 Back overview→/apps focus: FIXED. Back #2 from `/app/Projects/Weather` now lands
  focus on the originating Weather Lab card front button (collapsed). Verified built-in.
- F17 Name-sort toggle: STILL FAILS (unchanged). First click sorts descending; further
  clicks and Enter keep descending in the rebuilt Name-only table. No app sort code —
  SVAR-internal (v2.6.0). Sev-3, dev decision needed.
- F24 Follow-system live change: FIXED. `PreferencesContext` now subscribes to the
  media query. Verified live in Chrome: emulate reduce → `change:true` → static
  backdrop, canvas 1→0; reset → canvas back to 1. Both directions, no reload.

### Retest rows (all e1cfa29 unless noted)

| # | Item | Result | Viewport / surface |
|---|---|---|---|
| R1 | New Home composition (1x1 Files square, wide Projects, tall Activity, wide Recent) | PASS | 1905 desktop built-in; 1307/1024 Chrome (`r1307-home`, `r1024-home`); 390/320 frames (`r-home-390`, `r-home-320`) |
| R2 | Three projects / three recents, no clipping, Show all visible, Activity honest | PASS (by inspection, empty states + 1 recent) | desktop + 390/320, no h-overflow (sw==cw: 375/375, 305/305) |
| R3 | Explorer: vivid icons, info/preview pane, Name-only table, wxi toolbar font, no tree h-scrollbar | PASS | desktop built-in (`r-explorer-preview`); tree shows full names, preview shows icon + Type/Date |
| R4 | Explorer deep link + Back | PASS | `/files/Projects/Weather` direct + reconnect lands; Back to parent works |
| R5 | Pin/unpin | PASS | Unpin flips header, Home tile empties, recents entry still opens overview directly |
| R6 | F10 focus return | PASS (fixed) | desktop built-in, see above |
| R7 | Sort toggle | FAIL (unchanged) | desktop built-in, 3 clicks + Enter stay descending |
| R8 | Follow-system live | PASS (fixed) | Chrome emulate, both directions |
| R9 | Backgrounds first-run Topography + one-effect switching | PASS | blair first run canvas=1 Topography; Magic Rings/Lightfall/Ghost Fibers 1 canvas each; Standard static |
| R10 | Keyboard focus rings + Enter activation | PASS | 4xTab → visible ring on Open/Show-all (`r-home-focus`); Enter → /apps |
| R11 | Explorer at real 390x600 | FAIL — NEW Sev-1 | 390 frame: only the "Select file or folder" info placeholder renders; no tree/table/search/toolbar roles in DOM (`wx-info-narrow`, `wx-no-info-panel`); × click is a no-op. File browsing impossible at 390 wide. 320 same by construction (not separately loaded). Desktop unaffected. |
| R12 | Primary journey end-to-end on rebuild | PASS | Home → Files → Projects → nested Weather → pin → Apps (2 distinct cards) → Open → overview → README → reload/reconnect → Back → Back + focus |

Revised counts (retest scope): 10 PASS, 2 FAIL (1 carried Sev-3 sort, 1 new Sev-1 mobile
explorer), 0 BLOCKED. No new Sev-1 besides R11. Sev-1 list: R11 explorer unusable at
390×600 (mobile file browsing completely blocked).

### Cleanup — confirmed

Killed and verified exited: server node 10472, client node 30148 (wrappers 21940,
15860 exit with them). Ports 62567/53391 free. `%TEMP%\wi050-retest` deleted in full.
All 6 built-in tabs and the Chrome `re098` tab closed.

## Interim tester report · WI-050 (functional only — visual pass superseded)

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

## Retest at f3de003 (targeted: narrow explorer + sort)

Candidate: PR #9 head `f3de003` ("WI-049 Make the explorer usable at narrow widths").
Fresh disposable stack `%TEMP%\wi050-r2\` (server :64368, client :57433, reseeded
alice + blair). Dist rebuilt 02:47. Built-in `tools.browser.*` only (desktop tab +
390 and 320 `viewport.html` frames). No tokens recorded. Curated PNGs `f-*.png`.

| # | Item | Result | Evidence |
|---|---|---|---|
| T1 | /files at real 390x600: list + search + toolbar on load, no h-scroll | PASS | All 8 entries, full names, search + 3 view toggles visible; sw==cw==375 (`f-390-list`) |
| T2 | /files at real 320x600: same | PASS | List renders, sw==cw==305 |
| T3 | Single tap file → details pane | PASS | loose-note.txt → icon + miniature + Information/Type; "Hide details" in a11y tree |
| T4 | Hide details and × return to list | PASS | Both restore the list; × is a mouse-only `<i>` (no tabindex/role) but the Hide button is keyboard-accessible — Sev-3 note |
| T5 | Double tap file → reader /file/… | PASS | `/file/loose-note.txt` with content |
| T6 | Back → /files | PASS | Route returns (focus BODY, same pre-existing behaviour as before — not a regression) |
| T7 | Desktop unchanged: tree + side-by-side preview + eye | PASS | Tree with expanders, vivid icons, preview pane, eye toggles it off/on (`f-desktop-explorer`) |
| T8 | Name sort mouse toggle | PASS (fixed) | Clicks cycle desc → asc → desc |
| T9 | Name sort keyboard toggle | PASS (fixed) | Enter and Space toggle with focus kept on the columnheader |

Retest counts: 9 PASS, 0 FAIL, 0 BLOCKED. Prior FAILs F10/F17/F24 stay fixed (sort
verified here both mouse and keyboard). No new Sev-1. Sev-3 notes carried: toolbar
glyph buttons and the pane × expose no accessible names (SVAR-library pattern; the
Hide-details button covers keyboard users).

### Cleanup — confirmed


## Retest at b34bc25 (targeted: wrapped narrow toolbar + token message)

Candidate: PR #9 head `b34bc25` ("WI-046 Correct the invalid-token message and live
server status"). Fresh disposable stack `%TEMP%\wi050-r3\` (server :53837, client
:65132, reseeded alice + blair). Dist rebuilt 04:14. Built-in `tools.browser.*` only
(desktop tab + 390/320 `viewport.html` frames + invalid-token tab). No tokens recorded.
Curated PNGs `b-*.png` (2 files, no raw).

| # | Item | Result | Evidence |
|---|---|---|---|
| B1 | /files at real 390x600: wrapped toolbar (Search full first row, view modes below), placeholder readable | PASS | "Search" placeholder, toggles second row, full names, sw==cw==375 (`b-390-wrap`) |
| B2 | Search filters at 390 | PASS | "Weath" → Weather only, no overflow |
| B3 | Show/Hide details + × | PASS | File tap → details pane; Hide button and × both restore the list |
| B4 | Single tap previews, double tap opens reader, Back returns | PASS | `/file/loose-note.txt` with content; Back → /files, sw==cw |
| B5 | /files at real 320x600 | PASS | Wrapped toolbar, list, sw==cw==305 (long name ellipsized, no overflow) |
| B6 | Desktop unchanged: tree + side-by-side preview + eye | PASS | Tree, vivid icons, preview pane; eye toggles it off/on (`b-desktop`) |
| B7 | Name sort still toggles | PASS | Mouse desc→asc; Enter asc→desc, focus kept on header |
| B8 | Unknown token message | PASS | "That session token is not valid or has been revoked." — no "Superseded" |

Retest counts: 8 PASS, 0 FAIL, 0 BLOCKED. No new Sev-1. R11 stays fixed; F17 sort
stays fixed. Carried Sev-3 note: toolbar glyph buttons and pane × still expose no
accessible names (SVAR pattern; Hide-details button covers keyboard users).

### Cleanup — confirmed

