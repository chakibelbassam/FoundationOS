# Brief · WI-027 QA fixtures and operator session helper

Role: Muse Spark 1.3 Contributor · model `opencode-go/muse-spark-1.3-contributor` at `xhigh`.
Target: `versions/0.2 FoundationOS/FoundationOS/tests/fixtures/` and `versions/0.2 FoundationOS/FoundationOS/scripts/`. Do not run Git. Do not edit `src/`, `host/`, or `version README`.

## Context

- Released v0.1 server: `versions/0.1 FoundationOS/FoundationOS Server/server.ts` (Node 24). Start it with `node "versions/0.1 FoundationOS/FoundationOS Server/server.ts"` and `FOUNDATIONOS_DATA` pointing at a disposable directory. Its console prints a one-time admin JSON line and `FoundationOS 0.1 ready at http://127.0.0.1:<port>/status`.
- Contract: `versions/0.1 FoundationOS/FoundationOS Server/openapi.yaml`. Account creation sequence: admin key → `POST /sessions` (admin session) → `POST /invitations` (admin) → `POST /accounts` with the invitation token as Bearer and `{"name":"alice"}` → returns the member id/name/key → `POST /sessions` with the member key → session `{id, token}`.
- Files API: `PUT /files/{path}` with `content-type: text/plain`, `POST /folder` with `{"path":"Weather/data"}`, `GET /files`, `GET /files/{path}`.
- QA must use a disposable store and never the owner's installation (`%LOCALAPPDATA%\FoundationOS\store` is off limits).

## Deliverable

1. `FoundationOS/tests/fixtures/seed.mjs`
   - Arguments: `--server <url>` (optional; when omitted it starts its own server with `FOUNDATIONOS_DATA` = `--data <dir>`, default under `%TEMP%\foundationos-qa/store`), `--data <dir>`, `--out <file>` (default `../../../../Edge/workspace/qa/fixtures.json` resolved from the repo root — compute the repo root robustly from `import.meta.url`), `--large`.
   - Creates two members, `alice` and `blair`, with distinguishable homes:
     - alice: `Weather/app.json` `{"name":"Weather","brief":"Forecasts, radar and the week ahead for your saved places."}`, `Weather/README.md` (a few lines of real text ending with `Weather 0.2`), `Weather/data/today.txt`, `Projects/alpha/notes.txt`, `Empty/` (folder), `Broken/app.json` `{"name":""}` (malformed, must stay a folder), `Long name folder for a narrow shelf/readme.txt`, `loose-note.txt`.
     - blair: `Weather/app.json` with a different name (`Weather desk`) and brief, `Weather/README.md` starting with `Blair's weather desk`, `Journal/entry.md`, `Photos/` folder with `captions.txt`, no `Projects` folder.
   - `--large` adds 200 root entries for alice: 40 folders named `Bulk 01`..`Bulk 40` each with `app.json` (name `Bulk NN`), plus 160 files `note-001.txt`..`note-160.txt`. Keep each request sequential or at most 3 concurrent to respect the server.
   - Writes `{ server, dataDir, members: { alice: { id, name, sessionToken }, blair: {...} }, notes }` to the output file with mode 0600. Tokens are secrets: the file must live outside the repository or under the ignored `Edge/workspace`; never print tokens to stdout beyond a redacted summary (`alice <uuid> token ****last4`).
   - Prints the admin key only as `****` redacted, the server URL, and the two member ids so QA can connect. Stop the server it started on exit (and on SIGINT).
2. `FoundationOS/scripts/session.mjs` — operator helper. `node scripts/session.mjs --server <url>` prompts for an account key without echoing (Node `readline` with `terminal: true`, hide input), calls `POST /sessions`, prints only the session token and id to stdout, and writes nothing to disk. `--key-stdin` reads one line from stdin for automation. Never log the key.
3. `FoundationOS/tests/fixtures/README.md` — how to seed, the two homes, the large fixture, where the secret file goes, and the cleanup step.
4. A `node --test` smoke test `FoundationOS/tests/fixtures/seed.test.mjs` that starts a server on a disposable store, runs the seeder against it, and asserts both homes list the expected entries via `GET /files` (read the token from the generated file); it must stop the server and delete the temp store.

## Constraints

- No dependencies beyond Node 24 built-ins; `fetch` is available.
- Never write account keys, invitation tokens or session tokens into the repository: assert the output path is outside the tracked tree or under `Edge/workspace`.
- Windows paths; use `pathToFileURL` for spawning the server.
- Report: files, the exact commands run, observed test counts, and the redacted seeder summary.
