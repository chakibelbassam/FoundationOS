# WI-043 · v0.2 acceptance evidence

## Tested pair

- **Server:** FoundationOS 0.1, schema 2, started first from `versions/0.1 FoundationOS/Start.cmd`.
- **Client:** FoundationOS 0.2, built from `versions/0.2 FoundationOS/FoundationOS`, launched with `Start.cmd http://127.0.0.1:<server-port>`.
- **Final run:** started through the real launcher, `Start.cmd http://127.0.0.1:52093 --no-open`, which printed `FoundationOS 0.2 client ready at http://127.0.0.1:61052/`. Earlier runs used 49674/55296, 54544/61686 and 52662/60553 to prove the different-port restart and per-member settings.
- **Candidate:** branch `edge-opencode/pi-02-client-foundation`, commit recorded on PR #9 after the QA retest.
- **Browser:** OpenCode built-in Chromium; Windows 11; desktop, 390 px and 320 × 600 container previews.
- **Input hardware:** mouse and keyboard. No pen, controller, touch screen or physical phone.

## Sprint outcomes

| Sprint | Outcome |
| --- | --- |
| Sprint-1 Prove the client and inspect the prototype | Built client launched separately, read a real private file, prototype replay recorded with the absent-source gap. |
| Sprint-2 Browse a private home | Connection, identity, server state, nested folders, return focus, empty/missing/offline/expired states, arrow model and cursor targeting. |
| Sprint-3 Recognize an app and inspect its files | Weather → action face → Open → README → refresh → reconnect → Back, descriptor budget, Run feedback, More, malformed descriptors, turn frames and motion. |
| Sprint-4 Refine and document the workspace | Three Settings pages, previews, two-member persistence across a different-port restart, failed save, cursor across inputs, launcher and component documentation. |
| Sprint-5 Fix visual defects and verify the release | Independent QA (WI-040, WI-041), the Sev-1 boundary fix and retest (WI-042), and this evidence set. |

## All 21 items

| Item | Title | State | Evidence |
| --- | --- | --- | --- |
| WI-024 | Reproduce the prototype interactions | review | `scrumWorkspace/documents/PI-02/prototype-replay.md` |
| WI-025 | Build and serve the versioned client | review | `qa/release/`, host tests |
| WI-026 | Connect the launcher to the v0.1 server | review | `qa/release/`, host tests |
| WI-027 | Read one private file through the built client | review | `qa/sprint-1/WI-027/` |
| WI-028 | Restore the current route after reconnect | review | `qa/release/README.md` |
| WI-029 | Browse Home and nested folders | review | `qa/sprint-2/WI-029/` |
| WI-030 | Make shelf navigation and cursor targets predictable | review | `qa/sprint-2/WI-030/` |
| WI-031 | Show the active member and server in the header | review | `qa/sprint-2/WI-031/` |
| WI-032 | Recognize apps without disturbing the shelf | review | `qa/sprint-3/WI-032/` |
| WI-033 | Open the app overview and text reader | review | `qa/sprint-3/WI-033/` |
| WI-034 | Reveal and operate the app card actions | review | `qa/sprint-3/WI-034/`, `AppCard.test.tsx` |
| WI-035 | Polish the flip and cursor handoff | review | `qa/sprint-3/WI-035/`, turn frames |
| WI-036 | Persist workspace preferences per member | review | `qa/sprint-4/WI-036/` |
| WI-037 | Preview and apply settings on real widgets | review | `qa/sprint-4/WI-037/` |
| WI-038 | Refine cursor behaviour across inputs and pages | review | `qa/sprint-4/WI-038/` |
| WI-039 | Document the launcher and adopted components | review | version README, component inventory |
| WI-040 | Run independent release-journey QA | review | `agents/qa/WI-040/report.md` |
| WI-041 | Review visual and input behaviour independently | review | `agents/qa/WI-041/report.md` |
| WI-042 | Resolve release-blocking findings | review | `qa/sprint-5/WI-042/` |
| WI-043 | Assemble the v0.2 acceptance evidence | review | this folder |
| WI-044 | Define and verify the motion system | review | `qa/sprint-3/WI-044/`, component inventory |

## Independent QA

- **WI-040 journey QA:** 15 PASS, 2 FAIL initially. The Sev-1 was the shipped `Start.cmd` rejecting the positional server URL (unescaped parentheses broke cmd block parsing); fixed, covered by `tests/launcher.test.mjs`, and the full journey then ran through the launcher-printed URL. The Sev-2 Scrum-validation failure was the two missing document revision headers, now fixed. Retest appended to `agents/qa/WI-040/report.md`.
- **WI-041 visual review:** one Sev-1 (interface boundaries below 3:1). Fixed with the solid `#5f7088` boundary token; independent retest revised the verdict to **PASS**, 0 Sev-1, with the thinnest physically achievable ratio at 3.17:1 (dark Glass page side) recorded as a watch item.
- **WI-042 retest:** numbers in `../WI-042/README.md` (3.22–5.05:1 for the boundary across light/dark, Solid/Glass).

## CI

- `test` job: pass (Edge tools, Scrum validation, v0.1 server and contract).
- `client` job: pass (install, unit tests, build, host tests, fixture tests) on the pre-fix commit; re-run requested on the final commit.

## Assumptions

Recorded in `scrumWorkspace/documents/PI-02/assumptions.md`: prototype absent, reserved descriptor slot, container-preview narrow layouts, no pen/controller/touch hardware, session-token connection, client-owned preferences, first-run System resolves to the Windows theme, machine-local motion numbers, non-text files unreachable through v0.1, solid interface boundaries.

## Remaining limitations and owner actions

- Owner merges PR #9; Scrum items stay in review until then.
- Physical pen, controller, touch and phone evidence remain outstanding.
- Text jitter during the turn is not measured.
- Folder and app graphics remain accent tints (Sev-4, recorded).
- A menu-item bracket can lag while the MUI menu animates (Sev-4, recorded).
