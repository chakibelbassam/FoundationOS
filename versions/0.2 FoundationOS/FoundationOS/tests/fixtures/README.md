# QA fixtures (WI-027)

Seed two distinguishable member homes against the released v0.1 server, using a
**disposable store only**. Secrets live in one ignored file; they never belong in
the repository, notes, logs or screenshots.

## Files

- `seed.mjs` — creates `alice` + `blair` and their homes, writes the secret
  fixtures file (mode `0600`), prints a redacted summary. Starts its own v0.1
  server unless `--server` is given.
- `seed.test.mjs` — `node --test` smoke test: starts a server on a temp store,
  runs the seeder against it, checks both homes via `GET /files`, then stops the
  server and deletes the temp store.
- `../scripts/session.mjs` — operator helper: prompts for an account key without
  echoing, prints only the session id + token, writes nothing.

## Seed

```powershell
# Self-started server on a disposable store (default out: <repo>/Edge/workspace/qa/fixtures.json)
node "versions/0.2 FoundationOS/FoundationOS/tests/fixtures/seed.mjs"

# Explicit disposable store + output (outside the repo also works)
node "versions/0.2 FoundationOS/FoundationOS/tests/fixtures/seed.mjs" --data "$env:TEMP\foundationos-qa\store" --out "$env:TEMP\foundationos-qa\fixtures.json"

# Large fixture: +40 Bulk folders and +160 notes for alice
node "versions/0.2 FoundationOS/FoundationOS/tests/fixtures/seed.mjs" --large

# Against an already-running server (admin key via flag or FOUNDATIONOS_ADMIN_KEY env)
node "versions/0.2 FoundationOS/FoundationOS/tests/fixtures/seed.mjs" --server http://127.0.0.1:<port> --admin-key <admin-key> --data <that-server-store> --out <secret-file>
```

Redacted stdout (ids are safe, tokens show `****last4`, admin key stays `****`):

```text
Server: http://127.0.0.1:<port>
Data: <disposable dir>
Out: <repo>/Edge/workspace/qa/fixtures.json
Admin key: **** (redacted)
alice <uuid> token ****abcd
blair <uuid> token ****efgh
```

## The two homes

`alice` (full width + edge cases):

- `Weather/app.json` — `{"name":"Weather","brief":"Forecasts, radar and the week ahead for your saved places."}`
- `Weather/README.md` — a few lines of real text, last line `Weather 0.2`
- `Weather/data/today.txt`, `Projects/alpha/notes.txt`
- `Empty/` — empty folder
- `Broken/app.json` — `{"name":""}` (malformed: stays a folder, never an app card)
- `Long-name-folder-for-a-narrow-shelf/readme.txt` — 38-char dashed name (the brief
  asks for spaces, but the v0.1 server rejects spaces in path segments, so dashes;
  still wraps on a narrow shelf)
- `loose-note.txt`

`blair` (contrast: no `Projects`, different Weather):

- `Weather/app.json` — name `Weather desk`, different brief
- `Weather/README.md` — starts with `Blair's weather desk`
- `Journal/entry.md`, `Photos/` folder with `captions.txt`

`--large` adds 200 root entries for `alice`: 40 folders `Bulk-01`…`Bulk-40`
(each with `app.json` display name `Bulk NN`) plus 160 files `note-001.txt`…`note-160.txt`,
seeded sequentially to respect the server. (Dashes, not spaces: the v0.1 server
rejects spaces in path segments; the `app.json` display names keep the spaced form.)

## Secret file

Default: `<repo>/Edge/workspace/qa/fixtures.json` (ignored via
`Edge/workspace/.gitignore`), shape:

```json
{
  "server": "http://127.0.0.1:<port>",
  "dataDir": "<disposable store>",
  "members": {
    "alice": { "id": "<uuid>", "name": "alice", "sessionToken": "<secret>" },
    "blair": { "id": "<uuid>", "name": "blair", "sessionToken": "<secret>" }
  },
  "notes": { "large": false, "seededAt": "<iso>", "serverVersion": "0.1" }
}
```

The seeder refuses any `--out` inside the tracked tree except under
`Edge/workspace/`. Any path outside the repository is also accepted.

## Smoke test

```powershell
node --test "versions/0.2 FoundationOS/FoundationOS/tests/fixtures/seed.test.mjs"
```

Starts a v0.1 server on a temp store, seeds via `--server`, asserts both root
listings plus key file contents (`Weather/app.json` names, alice README tail,
`Broken/app.json`, blair README head, `Photos/captions.txt`), then stops the
server and deletes the temp store and output file.

## Cleanup

- Self-started seeding: the server is stopped automatically (also on SIGINT).
- Temp stores/outputs from the smoke test are deleted automatically.
- Manual runs: delete the disposable `--data` dir and rotate any exposed keys
  (`DELETE /sessions/{id}` revokes a session). Never commit `fixtures.json`.
- `%LOCALAPPDATA%\FoundationOS\store` (the owner installation) is off limits:
  the seeder refuses it.
