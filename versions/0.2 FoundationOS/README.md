# 0.2 FoundationOS — Client foundation

PI-02 is the increment that builds this folder; its live state is in Scrum. The released backend is [v0.1](../0.1%20FoundationOS/README.md), started separately.

## Release pair

- **Server:** `0.1 FoundationOS Server`, started first from its own launcher. Its console prints the loopback status URL.
- **Client:** this folder. React 18, TypeScript, Vite and React Router; the built output is served on a free loopback port by a small Node host.

Supported pair: client 0.2 with server 0.1, schema 1 or newer. The host requires `/status` to answer `version: "0.1"` and `status: "ready"`; it prints the expected and found values when the server is incompatible.

## Start

1. **Start the server.** Double-click `versions/0.1 FoundationOS/Start.cmd`. Keep its console open. A fresh store prints a one-time admin key.
2. **Build the client once** (after a code change): in `versions/0.2 FoundationOS/FoundationOS`, run `npm install` then `npm run build`.
3. **Start the client** with the server's address: `versions/0.2 FoundationOS/Start.cmd http://127.0.0.1:<server-port>`. The console prints `FoundationOS 0.2 client ready at http://127.0.0.1:<client-port>/` and opens the browser.
   - `--no-open` keeps the browser closed.
   - `--port <n>` pins the client port; the default picks a free one each launch.
   - `--data-dir <dir>` overrides the client data directory (QA and tests).
   - `FOUNDATIONOS_SERVER` may supply the address instead of the first argument.
4. **Stop** the client with Ctrl+C. The server keeps running. Stopping and restarting the client can assign a new client port; member preferences are keyed by member id, not by port.

## Connect with an existing session

v0.2 uses one active member and an existing session token held in memory only. Refresh returns to Connect at the same route.

1. Start the server. On a fresh store its console prints the admin identity and one-time key.
2. Exchange the admin key at `POST /sessions` for an admin session token.
3. Call `POST /invitations` with the admin token for each member.
4. Call `POST /accounts` with the invitation token and `{"name":"<member>"}`; the response holds the member's one-time account key.
5. Exchange each member key at `POST /sessions` for a session token.
6. Paste one member's session token at Connect.

`node scripts/session.mjs --server <address>` reads an account key without echo, prints only the session id and token, and writes nothing. `--key-stdin` reads one line for scripted runs. Account keys, invitation tokens and session tokens never belong in this repository, notes, logs, screenshots or preferences. Revoke a leaked session with `DELETE /sessions/{id}`.

## Workspace

- **Home** is a composed four-tile Magic Bento: a small 1×1 Files app square, a wide Projects tile (pinned folders), a wide Recent apps tile (apps whose overview you opened) and a tall Activity panel (idle until a real source exists). Up to three rows show on each list tile; **Show all** opens the full list.
- **File Explorer** at `/files` and `/files/<path>` uses SVAR File Manager in read-only mode with vivid file-type icons, a folder tree, breadcrumbs, a Name table and an info/preview pane. It loads each folder on demand, supports loaded-directory search and sorting, deep links and Back. Download and editing operations are removed from menus and intercepted. Size and Date columns are hidden because v0.1 exposes neither. Files open the text reader at `/file/<path>`. Below roughly 640 px the list, search and toolbar stay primary, a **Show details** control opens the info pane, a single tap previews and a double tap opens the reader.
- **Projects** are folders you pin from the File Explorer header; **Recent apps** are recorded only when an app overview is deliberately opened. Both are per-member and stored with the other preferences.
- **Apps** at `/apps` lists recognised apps from the root folders and pinned projects and states that scope; it is not a workspace-wide search.
- **Appearance** offers Standard, Topography, Magic Rings, Lightfall and Ghost Fibers with live preview. Topography is the default when no background is saved. Motion Off, Follow-system reduced motion or unavailable graphics fall back to a static, readable background; only the selected effect is mounted.

## Defaults and storage

Theme **System** · Surface **Glass** · Density **Comfortable** · Motion **On** · Cursor **Target** · Background **Topography**.

Each is a per-member choice. The host validates and stores them atomically in `%LOCALAPPDATA%\FoundationOS\client\preferences.json`, keyed by the member id returned from the v0.1 `/profile` behind the caller's token. Pinned projects and recent apps are stored in the same file. Before connection the client uses the defaults. A failed write returns an error, leaves the file untouched and the client keeps the last saved values. Motion stays on when Windows requests reduced motion unless the member chooses **Off** or **Follow system**.

**Reset preferences:** stop the client, delete `%LOCALAPPDATA%\FoundationOS\client\preferences.json` (or point `--data-dir` at a new directory), and relaunch. The server store is separate and is not affected; delete the store only when you intend to lose accounts and files.

## QA test data

Use disposable stores through `FOUNDATIONOS_DATA` and `--data-dir`, never a real installation.

- `node tests/fixtures/seed.mjs --server <address> --admin-key <key> --out <outside the repo>` creates `alice` and `blair` with distinguishable homes, a Weather app folder and README, a malformed descriptor, an empty folder and a long name. `--large` adds 200 entries with 40 folders for the descriptor budget.
- `node tests/fixtures/seed-sprint6.mjs --server <address> --member alice|blair` adds the nested Weather folders (Projects/Weather, Archive/Weather, and Journal/Weather for Blair) plus second project folders used by the Bento and explorer tests. Set `FOUNDATIONOS_SESSION` to that member's session token.
- `public/qa/viewport.html?w=390&h=600&url=/` (served by the built host) renders the client in an iframe with that exact layout viewport for real-width visual checks.
- The seeder writes member session tokens to the output file; keep it under `Edge/workspace` or outside the repository and delete it after QA.
- `node --test tests/host.test.mjs` and `node --test tests/fixtures/seed.test.mjs` exercise the host and the fixtures without a browser.

## Packages and tests

| Command (from `FoundationOS/`) | What it checks |
| --- | --- |
| `npm test` | Client unit and component tests (API/session mapping, return focus, preferences and defaults, card reveal, SVAR id mapping and explorer data, inventory, backgrounds) |
| `npm run build` | TypeScript and the Vite production build |
| `node --test tests/host.test.mjs tests/launcher.test.mjs` | SPA routes, asset 404, API proxy, readiness and version checks, token-bound preferences with concurrent writes, and the Windows launcher |
| `node --test tests/fixtures/seed.test.mjs` | Seeder round trip against a disposable v0.1 store |

## Known limitations

- A fresh build is required after code changes; the host serves `dist/` and reports `Build missing` otherwise.
- The client accepts a session token, not an account key. Account onboarding and real sign-in belong to v0.3.
- Running an app is not implemented; **Run** explains the limitation and points to **Open**.
- The file explorer is read-only: download, upload, rename, delete, copy and move are removed and intercepted. Binary or oversized files have no reader and no download.
- SVAR's card view has no thumbnail content because only names and types are available from v0.1; the explorer opens in table view. Some SVAR toolbar controls are library-internal and may not expose accessible names; record them as a library limitation rather than a product decision.
- Activity stays idle because no activity source is connected yet.
- The 390 px and 320 × 600 layouts are checked through `public/qa/viewport.html`, which gives the client a real layout viewport of that size in the built-in browser. They were not tested on a physical phone or with a touch screen; stylus and controller hardware were unavailable.
- The Target Cursor brackets are visual only and never receive input.

## Evidence

- QA evidence: `qa/`
- Contributor artifacts: `agents/{role}/{WI-ID}/`
- Component inventory and the motion token table: [`Product Information/Interface/Components/README.md`](../../Product%20Information/Interface/Components/README.md)

The [PI-2 plan](../../scrumWorkspace/documents/PI-02/client-increment-plan.md) defines the sprint buckets, settings defaults, motion work and release bar. [Owner decisions](../../scrumWorkspace/documents/PI-02/owner-decisions.md) record the 26 November choices, and the [prototype replay](../../scrumWorkspace/documents/PI-02/prototype-replay.md) records the adoption decisions.
