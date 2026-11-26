# Brief · WI-025/026 Build and serve the versioned client, connect to the v0.1 server

Role: Muse Spark 1.3 Contributor · model `opencode-go/muse-spark-1.3-contributor` at `xhigh`.
Target: `versions/0.2 FoundationOS/FoundationOS/host/` and the version root launcher. Do not run Git. Do not edit `src/` (Edge owns the React app) or `tests/fixtures/` (another contributor owns fixtures).

## Context

- v0.2 client = React+TS+Vite package at `versions/0.2 FoundationOS/FoundationOS/` (package.json already created; run `npm install` there).
- v0.1 server is started separately; its console prints `FoundationOS 0.1 ready at http://127.0.0.1:<port>/status`.
- Server contract: `versions/0.1 FoundationOS/FoundationOS Server/openapi.yaml`. Read-only operations used by the client: `GET /status`, `GET /profile`, `GET /files`, `GET /files/{path}`.
- Owner decisions: `scrumWorkspace/documents/PI-02/owner-decisions.md`.

## Deliverable

1. `FoundationOS/host/serve.mjs` — dependency-free Node 24 host, arguments:
   - `--server <loopback http URL>` (required; also accept env `FOUNDATIONOS_SERVER`)
   - `--port <n>` (default 0 = free port)
   - `--no-open`
   - `--data-dir <dir>` (client data directory override; default `%LOCALAPPDATA%\FoundationOS\client`)
   - `--build <dir>` (default `../dist` relative to the host file)
   Behaviour:
   - Reject non-loopback server URLs with a clear message and exit code 2.
   - Probe `${server}/status` (3 s timeout). Print a line with readiness: ready / unreachable / incompatible. Require `version === '0.1'`, `status === 'ready'` and integer `schema` >= 1; show expected 0.1 and the found value when incompatible.
   - Serve built static files from the build dir. `GET /` and any path without a file extension fall back to `index.html` (SPA routes such as `/app/Weather` and `/file/Weather/README.md` must load directly). A request for a missing file with an extension returns 404 with body `Asset not found` and `content-type: text/plain`.
   - Proxy `/api/*` to `${server}` preserving method, headers needed for JSON/text (`authorization`, `content-type`, `accept`), request body and response status/body. On transport failure answer 502 with JSON `{"error":"Server unreachable"}`. Do not log authorization headers or bodies.
   - `GET /client-config` → JSON `{ clientVersion: '0.2', expectedServerVersion: '0.1', serverUrl, check: { ok, status: 'ready'|'unreachable'|'incompatible', version?, schema?, error?, checkedAt } }` (re-probe on each request).
   - `POST /preferences/load` `{memberId}` → `{ preferences: object|null }`; `POST /preferences/save` `{memberId, preferences}` → `{ preferences }`. Store `preferences.json` under the data dir keyed by member id. Validate member id (UUID shape) and each preference key/value against the allowed sets from the owner decisions; reject unknown or invalid values with 400 JSON `{error}` without touching the file. Write atomically (temp file + rename) and keep the last good file when a write fails (return 500 `{error}`).
   - Print `FoundationOS 0.2 client ready at http://127.0.0.1:<port>/` and open the default browser via `cmd /c start "" <url>` unless `--no-open`. Handle Ctrl+C by closing cleanly.
   - If `index.html` is missing from the build dir: print `Build missing. Run "npm run build" in <package dir>.` and exit 1.
2. `versions/0.2 FoundationOS/Start.cmd` — pass its first argument as `--server`, forward remaining arguments, pause on failure. Print usage when no argument and `FOUNDATIONOS_SERVER` is unset.
3. `FoundationOS/tests/host.test.mjs` — `node --test` suite that starts a stub server (Node http, returns status 0.1/schema 2, echoes a JSON file listing) and the host on port 0, then asserts: direct SPA route returns index.html, `/api/files` proxied with status and body preserved, missing `/assets/nope.js` returns 404 `Asset not found`, incompatible server reports `ok:false` with expected/found, unreachable server gives 502 JSON, preferences save/load roundtrip, invalid preference rejected 400, and a failed write keeps the previous file (point `--data-dir` at a file-as-directory or make the file read-only). Stop all processes in `finally`.
4. Add `"test:host": "node --test tests/host.test.mjs"` to package.json scripts (do not remove existing scripts).

## Constraints

- No new runtime dependencies for the host.
- Node 24, Windows. Use `node:http`, `node:fs/promises`, `node:path`, `node:url`.
- Accessibility/exact paths in this brief are the contract with the React app.
- Report: files changed, the exact test command and its observed pass/fail counts, and the printed startup lines for ready and incompatible servers.
