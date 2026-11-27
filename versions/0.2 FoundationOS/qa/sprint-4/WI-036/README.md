# WI-036 · Per-member preferences

Candidate `b8459c6`. Disposable client data directory `Edge/workspace/qa/client-data`.

- Alice saved `light / glass / comfortable / on / target`; Blair saved `dark / glass / compact / off / system`.
- `preferences.json` held two entries keyed by the member ids returned from `/profile`; it contained no tokens or file content.
- The client host was stopped and relaunched on a different port (55296 → 61686 → 64617). Reconnecting as each member restored that member's choices and private home. Alice had `Projects`; Blair had `Journal`, `Photos` and `Weather desk`.
- A member with no entry (alexandra-montgomery) received the recorded defaults.
- Invalid values are rejected by the host with 400 and leave the file untouched (`tests/host.test.mjs`).
- A read-only `preferences.json` made the save fail; the client showed the error, kept the preview, and the file still contained the last good settings.
- Missing preferences (`{preferences:null}`) fall back to defaults.

The preferences file lives under `%LOCALAPPDATA%\FoundationOS\client` by default and is separate from the server store.
