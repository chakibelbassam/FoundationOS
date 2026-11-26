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

## Defaults and storage

Theme **System** · Surface **Glass** · Density **Comfortable** · Motion **On** · Cursor **Target**.

Each is a per-member choice. The host validates and stores all five atomically in `%LOCALAPPDATA%\FoundationOS\client\preferences.json`, keyed by the member id returned from `/profile`. Before connection the client uses the defaults. A failed write returns an error, leaves the file untouched and the client keeps the last saved values. Motion stays on when Windows requests reduced motion unless the member chooses **Off** or **Follow system**.

**Reset preferences:** stop the client, delete `%LOCALAPPDATA%\FoundationOS\client\preferences.json` (or point `--data-dir` at a new directory), and relaunch. The server store is separate and is not affected; delete the store only when you intend to lose accounts and files.

## QA test data

Use disposable stores through `FOUNDATIONOS_DATA` and `--data-dir`, never a real installation.

- `node tests/fixtures/seed.mjs --server <address> --admin-key <key> --out <outside the repo>` creates `alice` and `blair` with distinguishable homes, a Weather app folder and README, a malformed descriptor, an empty folder and a long name. `--large` adds 200 entries with 40 folders for the descriptor budget.
- The seeder writes member session tokens to the output file; keep it under `Edge/workspace` or outside the repository and delete it after QA.
- `node --test tests/host.test.mjs` and `node --test tests/fixtures/seed.test.mjs` exercise the host and the fixtures without a browser.

## Packages and tests

| Command (from `FoundationOS/`) | What it checks |
| --- | --- |
| `npm test` | Client unit and component tests (API mapping, return-focus state, defaults, card reveal) |
| `npm run build` | TypeScript and the Vite production build |
| `node --test tests/host.test.mjs` | SPA routes, asset 404, API proxy, readiness and version checks, preferences validation and atomic write |
| `node --test tests/fixtures/seed.test.mjs` | Seeder round trip against a disposable v0.1 store |

## Known limitations

- A fresh build is required after code changes; the host serves `dist/` and reports `Build missing` otherwise.
- The client accepts a session token, not an account key. Account sign-in, invitations and account switching belong to later increments.
- Running an app is not implemented; **Run** explains the limitation and points to **Open**.
- Binary or oversized files have no reader and no download in v0.2.
- The 390 px and 320 × 600 layouts were verified inside a width-constrained preview of the built client, not on a physical phone or with a touch screen. Stylus hover and controller input were not available as hardware; keyboard proves the directional model.
- The Target Cursor brackets are visual only and never receive input.

## Evidence

- QA evidence: `qa/`
- Contributor artifacts: `agents/{role}/{WI-ID}/`
- Component inventory and the motion token table: [`Product Information/Interface/Components/README.md`](../../Product%20Information/Interface/Components/README.md)

The [PI-2 plan](../../scrumWorkspace/documents/PI-02/client-increment-plan.md) defines the sprint buckets, settings defaults, motion work and release bar. [Owner decisions](../../scrumWorkspace/documents/PI-02/owner-decisions.md) record the 26 November choices, and the [prototype replay](../../scrumWorkspace/documents/PI-02/prototype-replay.md) records the adoption decisions.
