# WI-040 · Independent release-journey QA report

Tester: GLM 5.3 Flash (`opencode-go/glm-5.3-flash`), independent of the implementer. Written 26 November 2026.

## Candidate and environment

| Item | Value |
| --- | --- |
| Candidate | branch `edge-opencode/pi-02-client-foundation`, revision `b8459c6` (identity taken from the brief; not independently verifiable because Git was forbidden) |
| Pair | client 0.2 (`versions/0.2 FoundationOS/FoundationOS/`) · released v0.1 server (`versions/0.1 FoundationOS/FoundationOS Server/`) |
| OS | Windows 11, `Microsoft Windows NT 10.0.26300.0`, AMD64 |
| Node / npm | v24.18.0 / 11.16.0 |
| Browser / viewports | not driven — the brief forbids browser automation; HTTP-only checks against the built host, and the release screenshots were reviewed as image files |
| Server store | `%TEMP%\wi040\server-store` (`FOUNDATIONOS_DATA`), port assigned `http://127.0.0.1:50419` |
| Client data dir | `%TEMP%\wi040\client-data` (`--data-dir`), host ports assigned per run (54991, 54729, 59471, 58216, 63495) |
| Fixtures | `seed.mjs --server … --out %TEMP%\wi040\fixtures.json` — members `alice`, `blair` (+ `carol` created during revocation checks); tokens stayed in that temp file and are redacted here |
| Out-of-bounds ports | 54544 / 64617 never used (verified free before and during the run) |

`Start.cmd` SHA-256 `3B4747CB…85F927F`; `host/serve.mjs` SHA-256 `BB3A7807…6FF196BF15D1` (identity of the files as tested).

## Scenario results

| # | Scenario | Result | Exact command / request | Observed |
| --- | --- | --- | --- | --- |
| 1 | Root tool suite | PASS | `npm test` (repo root) | `tests 28, pass 28, fail 0` |
| 2 | Scrum store validation | **FAIL** | `node Edge/tools/scrumWorkSpace.mjs validate` | `ok: false` — `documents/PI-02/assumptions.md` and `documents/PI-02/prototype-replay.md` each "missing a positive revision header"; counts: 70 records, 20 notes, 43 links, 8 documents |
| 3 | v0.1 server + contract tests | PASS | `node --test server.test.mjs openapi.test.mjs` (server folder) | `contract: 12 operations, 40 documented responses exercised`; `tests 14, pass 14, fail 0` |
| 4 | Client unit suite | PASS | `npm test` (FoundationOS/) | vitest: 4 files, `Tests 14 passed (14)` |
| 5 | Host tests | PASS | `node --test tests/host.test.mjs` | `tests 10, pass 10, fail 0` (incl. unreachable→502, invalid→400, failed write keeps previous file) |
| 6 | Seeder tests | PASS | `node --test tests/fixtures/seed.test.mjs` | `tests 3, pass 3, fail 0` |
| 7 | Client build | PASS | `npm run build` | `tsc -b` clean; vite: 966 modules, `dist/assets/index-C5MWUIDc.js 432.92 kB` |
| 8 | Server-first startup | PASS | `node host\serve.mjs --server http://127.0.0.1:50419 --data-dir …\client-data --no-open --port 0`; `GET /client-config` | Printed `Server ready: version 0.1 schema 2 at http://127.0.0.1:50419` then `FoundationOS 0.2 client ready at http://127.0.0.1:54991/`; `/client-config` → `{"clientVersion":"0.2","expectedServerVersion":"0.1","check":{"ok":true,"status":"ready","version":"0.1","schema":2,…}}` |
| 9 | Built launcher with a positional URL | **FAIL** | `cmd /c "…\Start.cmd" http://127.0.0.1:50419 --no-open --data-dir …` (two invocation styles) | `Unknown argument: http://127.0.0.1:50419` + serve.mjs usage, exit code 2, "Press any key" — **Sev-1, details below** |
| 10 | Launcher env-var path | PASS (workaround) | `set FOUNDATIONOS_SERVER=http://127.0.0.1:50419&& Start.cmd --data-dir …` | Ready lines printed, host served, `/client-config` ok (host stopped by exact PID afterwards) |
| 11 | Dead server port | PASS | host `--server http://127.0.0.1:64885` (nothing listening); `GET /client-config`; `GET /api/files` | Ready line `Server unreachable at http://127.0.0.1:64885: Server unreachable: fetch failed`; `/client-config` → `check.ok:false, status:"unreachable"`; `/api/files` → `502 {"error":"Server unreachable"}` |
| 12 | Wrong server version | PASS | stub on `:64894` returning `{"version":"0.2","status":"ready","schema":2}`; host against it | Ready line `Server incompatible at …: expected version 0.1, found version "0.2" status "ready" schema 2`; `/client-config` → `ok:false, status:"incompatible"` with expected and found |
| 13 | Non-loopback rejection | PASS | `node serve.mjs --server http://10.0.0.5:8787` | `Server URL must be a loopback http URL (got "http://10.0.0.5:8787"). Use http://127.0.0.1:<port>.`, exit code 2 |
| 14 | Session revocation | PASS | admin sign-in → invitation → account `carol` → session (all through the host proxy); `GET /api/profile`; `DELETE /api/sessions/{id}` (admin); repeat `GET /api/profile` | 9/9 sub-checks: profile 200 `{name:"carol"}` → revoke 200 → same token `401 {"error":"Sign in with a session token"}`; alice's token unaffected (200); admin session signed out |
| 15 | Stale responses and member change (code review) | PASS | inspection of `useDirectory.ts`, `useApps.ts`, `focusReturn.ts`, `App.tsx` (+ `FileReader.tsx`, `FolderView.tsx`) | No stale-render path found — details below |
| 16 | Preferences matrix | PASS | `POST /preferences/load`, `POST /preferences/save` via host | 7/7 sub-checks — details below |
| 17 | Different-port restart | PASS | stop host PID 7384 (port 54729); relaunch same `--data-dir` → port 59471; load both members | alice → 200 `{light, glass, comfortable, on, target}`; blair → 200 `{dark, glass, compact, "Follow system", system}` (blair's motion was last saved as "Follow system" in 16); both member sessions still valid; alice's home lists Weather + Projects through the restarted host |
| 18 | Evidence review | PASS (findings logged) | read `qa/release/README.md`, `qa/README.md`, all sprint-1…4 notes; screenshots spot-checked | 6 findings — details below |

Totals: **16 PASS · 2 FAIL · 0 SKIP** (rows 1–18; row 18 counted as PASS because the review completed with findings recorded). *Corrected during the retest: the original text said "15 PASS", an arithmetic slip — the table has always held 16 PASS rows. The retest section below supersedes the two FAILs.*

## FAIL details

### Row 9 · Built launcher rejects the documented positional URL — **Sev-1**

- **Expected** (release README line 5, and the increment plan's operator story): `Start.cmd http://127.0.0.1:54544` starts the host and prints the ready line.
- **Actual**: `Unknown argument: http://127.0.0.1:50419`, serve.mjs usage text, exit code 2, then "Press any key". Reproduced 4×: via PowerShell-wrapped `cmd /c`, via a pure-cmd wrapper (`call "…\Start.cmd" <url> --no-open --data-dir …`), and via a CRLF-converted copy — all identical.
- **Root cause (verified by controlled probes)**: `Start.cmd` line 13 —
  `echo   (or set FOUNDATIONOS_SERVER and pass only host options)`
  The unquoted parentheses in echo text inside the nested `if` block break cmd's block parsing: the `if "%~1"==""` guard is skipped and the no-argument branch (`node "%~dp0…\serve.mjs" %*`) runs unconditionally, so the URL reaches serve.mjs unprefixed. A probe identical to Start.cmd but without that one line parses correctly (`--server "http://127.0.0.1:50419"` expands as intended), and a copy with the line removed **started the host end-to-end** from a mirrored temp layout (ready line + `/client-config` ok:true, version 0.1, schema 2). The file's LF-only line endings (25 LF, 0 CRLF) are not the cause — the corrected probe has the same endings and works.
- **Why Sev-1**: the built launcher is the release entry point named in the release evidence and in WI-040's acceptance ("Use two homes and the built launcher"); as shipped, the documented invocation cannot start the client. The defect is confined to the `.cmd` wrapper — `host/serve.mjs` itself is fully functional (rows 8–17).
- **Suggested fix (owner/WI-042 to apply)**: escape or quote the parens, e.g. `echo   ^(or set FOUNDATIONOS_SERVER and pass only host options^)`, or drop the line. One line; no other change needed.
- **Consequence for the evidence**: release README line 5 cannot be reproduced against the shipped `Start.cmd` (SHA `3B4747CB…`); either the file changed after that capture or the run used another path. The claim needs re-recording after the fix.

### Row 2 · Scrum store validation fails — Sev-2

- **Expected**: `validate` returns `ok: true`.
- **Actual**: `ok: false`; `documents/PI-02/assumptions.md` and `documents/PI-02/prototype-replay.md` are "missing a positive revision header" (every other document carries `revision:`; these two were missed).
- **Why not Sev-1**: records hygiene, not a stated PI acceptance criterion about product behaviour; the fix is adding the two headers, which I could not apply (forbidden from editing Scrum records).

## Row 15 · Stale responses and member change — what the code does

- **Directory listing** (`useDirectory.ts`): a per-effect ticket (`requestRef`, line 19) discards late responses after a path change (`if (ticket !== requestRef.current) return;` lines 25 and 32). An old member's listing therefore cannot render after the member changes — and the workspace views unmount entirely whenever the session drops (SessionContext status `none` → ConnectView).
- **Descriptors** (`useApps.ts`): workers check `cancelled` before `setApps` (lines 94, 100–102); the module cache is keyed `memberId:path` (line 25); `App.tsx` lines 105–107 clear the cache whenever `profile?.id` changes. A late descriptor from the old member cannot render. Theoretical only: the per-view probe budget (line 91) is not keyed by member, but reaching it would require the same folder signature across members without an unmount — connecting always unmounts the views, so it is unreachable through the UI.
- **Reader** (`FileReader.tsx`): same pattern — `cancelled` checked at lines 39 and 44, cleanup at 51–53.
- **Return focus** (`focusReturn.ts`): `resumeFocus` rides the history entry's own state (`replaceState`, lines 6–11), so no cross-entry race exists; a different-member connect goes through `SwitchHome` (`App.tsx` lines 32–38) which replaces the route and discards the stale value.
- **Observation (not a defect)**: `useDirectory.ts` creates an `AbortController` (lines 20, 43–45) but never passes it to the fetch (`api.list` takes no signal, `client.ts` line 70) — superseded requests are discarded on arrival, not cancelled on the wire. Harmless; consider wiring the signal in a later increment.
- **Revocation reaction path**: `client.ts` lines 37–40 turn any 401 into `notifyUnauthorized()` + `ApiError{kind:'unauthorized'}`; the listener registered in `SessionContext.tsx` lines 92–99 clears token/profile, sets status `none` and the error "Your session expired. Connect again to continue." — Connect is shown at the unchanged URL.

## Row 16 · Preferences matrix (all via the host on :54729)

| Check | Result |
| --- | --- |
| Missing entry → `POST /preferences/load` | 200 `{"preferences":null}` → client falls back to defaults |
| alice `{light, glass, comfortable, on, target}` / blair `{dark, glass, compact, off, system}` | both 200; loads return each member's own values by UUID key |
| Invalid value `theme:"banana"` | 400 `Invalid value for "theme"` |
| Unknown key `flavour` | 400 `Unknown preference "flavour"` |
| Non-UUID memberId / non-object preferences | 400 / 400 `preferences must be an object` |
| `motion:"Follow system"` (owner vocabulary, capitalised) | 200 — case-insensitive matching per `serve.mjs` lines 33–44 |
| `GET /preferences/load` | 405 `Use POST` |
| Read-only `preferences.json` (`attrib +R`) → save | 500 `{"error":"The settings could not be saved."}`; file bytes unchanged (last good file preserved; atomic tmp+rename in `writePrefsMap`, `serve.mjs` lines 386–396); after `attrib -R` saving works again |

## Row 18 · Evidence review — findings

1. **Sev-1 conflict** — release README line 5: `Start.cmd http://127.0.0.1:54544` → ready line. Cannot be reproduced against the shipped launcher (row 9). Re-record after the fix.
2. **Sev-2 gap** — release README lines 43–44 and sprint-2 WI-029 line 15 point to `../sprint-5/` for revoked-session, unavailable-server and the post-fix journey retest. `qa/sprint-5/` does not exist. WI-043 must capture or restore this before owner acceptance (my rows 11 and 14 cover the behaviour itself).
3. **Sev-3** — journey-table steps 5–8 cite "run log" as evidence, but no run-log artifact exists in `qa/release/` (only the 12 JPGs and the README).
4. **Sev-3** — release README line 40 describes frames "of a 1600 ms turn", but the shipped flip is 520 ms (`styles.css` line 5 `--fo-dur-flip: 520ms`; `AppCard.tsx` line 40). Either the duration is wrong or the capture re-timed the animation without saying so.
5. **Sev-4** — `qa/README.md` says release folders are "named with the candidate revision"; the folder is plain `release/` with the revision only in prose.
6. **Sev-4** — `08-missing-file.jpg` exists but no note references it.

Positive verifications: schema 2 everywhere; Weather is item 5 in alice's root with the seeded brief (screenshot `01-home-desktop.jpg` is genuine and shows Connected + alice); the "11 initial probes" claim matches `useApps.ts` (MAX_PROBES 12, viewCap 11 without priority, lines 6–7 and 71–76); WI-036/037's preference claims independently reproduced (row 16–17); every note I read keeps tokens redacted.

## QA process incidents (mine, not the candidate's)

1. **Accidental first boot against the default store.** My first server launch omitted `FOUNDATIONOS_DATA`, so `server.ts` (line 11) created `%LOCALAPPDATA%\FoundationOS\store` — which did not exist before (all files in it were created at 21:07 today by my boots; it contains exactly one stray admin account and one empty home; the one-time admin key was lost with a temp log, and no member data was ever written there). I stopped the processes and did not touch the tree further, per the brief. **Recommendation to the owner**: that store is an unusable orphan (nobody holds its admin key); delete `%LOCALAPPDATA%\FoundationOS\store` before any real default-store installation, or ignore it if the default location is never used.
2. **Over-broad process kill.** While cleaning up a stray host I ran `Get-Process node | Stop-Process -Force` filtered only on "not my server PID", killing ~80 node processes on the machine (MCP servers and older dev tooling, some days old). The OpenCode harness survived; affected tools need restarting. All later cleanups used exact recorded PIDs only.

Neither incident involved product code, the repository, or the owner's data beyond the store described above; both are recorded here for transparency.

## Untested areas and why

- **Interactive browser journey** — the brief forbids me driving the browser; Edge owns those tabs. The built client's UI journey is covered by the release evidence plus my HTTP-level checks of the same endpoints.
- **Visual, motion and cursor behaviour** (flip frames, bracket geometry, 60 fps, contrast) — WI-041's scope; my brief owns the journeys, suites and backend behaviour. The frames and measurements in the evidence were reviewed for consistency only (finding 4).
- **Physical devices** — no stylus, touch screen, controller or phone was available to this session either; the narrow layouts (`?w=390`, `?w=320&h=600`) were not re-exercised outside the existing evidence.
- **Candidate revision identity** — Git was forbidden; `b8459c6` is taken from the brief and the evidence notes.
- **Large-fixture journey end-to-end** (`--large`, 200 entries) — covered by `seed.test.mjs` and the WI-032 evidence; I verified the probe-budget math in code rather than re-running the full 206-card journey.

## Retest (26 November 2026, later the same day)

The implementer changed the working tree: the launcher parenthesis fix, the two Scrum document revision headers, `qa/sprint-5/` evidence, corrected turn-frame notes and a replaced long-username image. Same machine and model; fresh disposable dirs under `%TEMP%\opencode\wi040r\` (stub server + client data dir); tokens never printed. All four requested checks run and recorded.

| # | Finding under retest | Result | Exact command / request | Observed |
| --- | --- | --- | --- | --- |
| R1 | Sev-1 · launcher positional URL | **PASS — resolved** | stub v0.1 on `http://127.0.0.1:60876`; pure-cmd wrapper `call "…\Start.cmd" http://127.0.0.1:60876 --no-open --port 0 --data-dir …` | Output: `Server ready: version 0.1 schema 2 at http://127.0.0.1:60876` + `FoundationOS 0.2 client ready at http://127.0.0.1:56343/`. `Unknown argument` gone. `GET /client-config` → `ok=true, version=0.1, schema=2, clientVersion=0.2` (all `--no-open`/`--port 0`/`--data-dir` options honoured through `%2…%9`). Stop behaviour: host node killed by exact PID (17708) from the listening port; the wrapper then sat at `Press any key to continue . . .` (observed in the log) because the force-kill left a non-zero errorlevel and line 24 pauses by design on failure — stopped the wrapper by exact PID (29740). `Start.cmd` line 13 confirmed as `echo   ^(or set FOUNDATIONOS_SERVER and pass only host options^)` |
| R2 | Sev-2 · Scrum validate | **PASS — resolved** | `node Edge/tools/scrumWorkSpace.mjs validate '{}'` | `ok: true, errors: [], warnings: []` — counts 70 records, 20 notes, 43 links, **10 documents** (the two revised PI-02 documents now counted), 0 receipts |
| R3 | New launcher regression test | **PASS** | `node --test tests/launcher.test.mjs` (in `FoundationOS/`) | `✔ Start.cmd passes a positional server URL to the host (176.6301ms)` — `tests 1, pass 1, fail 0`. Platform: **Windows** (win32, Windows 11 26300) — the skip path for non-Windows was not exercised |
| R4 | Evidence citations | **PASS — resolved** | read `qa/release/README.md`, `qa/sprint-5/WI-040|WI-042|WI-043/README.md`; viewed the restored/replaced images | `qa/sprint-5/` exists: `WI-040/revoked-session.jpg` (genuine: Connect view, `Reconnect` chip, "Your session expired. Connect again to continue.", `Last member on this browser: frank`, requested location `/folder/Visible` preserved) and `server-offline.jpg` (genuine: `Server offline` chip, "The client cannot reach its server…" with Check server) — the two states remain distinct, matching the WI-031 claim; the turn-frames note now states the capture overrode `--fo-dur-flip` to 1600 ms with the shipped turn 520 ms (consistent with `styles.css`/`AppCard.tsx`); `08-missing-file.jpg` is now cited; `320-long-username-final.jpg` (20:55) shows `alexandr…` truncated in the 320 px container with no overflow |

### Retest observations (non-blocking, Sev-4)

- `qa/release/README.md` line 5 still cites the historical `Start.cmd http://127.0.0.1:54544` run, which pre-dates the fix; the load-bearing claim now lives in the new "Final candidate run" section (lines 41–49), whose launcher run I independently reproduced in R1. Acceptable as history; consider trimming.
- `qa/sprint-5/WI-040/` holds the two screenshots but no per-folder note naming viewport/browser/candidate revision (the `qa/README.md` rule); that context lives in `qa/sprint-5/WI-043/README.md` instead.

### Revised totals

- Original rows 1–18: both FAILs resolved → **18 PASS**, 0 FAIL, 0 SKIP.
- Retest rows R1–R4: **4 PASS**, 0 FAIL, 0 SKIP.
- **Combined: 22 PASS · 0 FAIL · 0 SKIP.**
- **Sev-1 count: 0.** No stated PI acceptance criterion fails. Remaining items are the Sev-4 observations above and the process incidents recorded in the original report.
