# WI-050 · Two independent browser passes on PR #9

Both reviewers ran their own disposable stack, fixtures, browser tabs and cleanup. They did not reuse Edge's or each other's results.

## Muse Spark 1.3 hands-on tester

- Report: `../../agents/muse/WI-050/report.md`.
- First integrated pass at `8eb1a9c`: 27 PASS / 2 FAIL / 8 not tested.
- Redesign retest at `e1cfa29`: 10 PASS / 2 FAIL (Back focus and live Follow-system fixed; narrow explorer and sort failed).
- Targeted retest at `f3de003`: 9 PASS / 0 FAIL, including 390×600 and 320×600 list, Show/Hide details, reader, sort and the desktop layout.
- Retest at `b34bc25`: 8 PASS / 0 FAIL — wrapped narrow toolbar at 390/320, desktop, sort and the invalid-token message.
- Surface: OpenCode built-in browser; the Chrome `browse.*` integration was used where the built-in attachment was absent mid-run.

## GLM 5.3 Flash independent QA

- Report: `../../agents/qa/WI-050/report.md` with screenshots in `../../agents/qa/WI-050/screens/`.
- Built-in browser at `e2e8995`/`b34bc25`: **BLOCKED** in the child session (`Unknown tool 'browser.tabs.list'`); those passes ran on the connected Chrome `browse.*` integration and are labelled as such. The desktop pane was later attached to this session.
- **Built-in pass at `6397d26`: 20 PASS / 0 FAIL / 0 BLOCKED, no Sev-1** — Topography first run, Home, explorer desktop + real 390/320 viewports, nested Weather, malformed descriptor, reader/Back, Run, backgrounds and fallback, member switch, restart, revoked session, server death/recovery, keyboard. Rows 9, 10 and 19 were re-driven on the built-in surface in the follow-up. F1–F3 re-confirmed; F4 and F5 remain recorded.
- Recheck evidence: `../../agents/qa/WI-050/browser-access.md`.
- Product scenarios: **20 PASS / 0 FAIL / 0 BLOCKED** at `e2e8995`, desktop plus real 390×600 and 320×600 emulated viewports; no Sev-1.
- Findings at `e2e8995`: F1 Sev-3 (invalid token message), F2 Sev-4 (320 search clip), F3 Sev-4 (stale server announcement), F4 Sev-4 (recent rows show the leaf), F5 tooling gap (scroll-cancel not stageable). No Sev-1.
- F1–F3 were fixed at `b34bc25` and all three retested PASS (unknown and revoked tokens, search 239 px at 320 / 309 px at 390, server-death announcement and recovery). F4 and F5 remain recorded.
