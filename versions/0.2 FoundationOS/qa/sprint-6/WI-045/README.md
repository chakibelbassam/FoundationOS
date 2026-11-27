# WI-045 · Preferences bound to the verified member

- The host no longer trusts a body `memberId`. `POST /preferences/load|save` read the bearer token, call the configured v0.1 `/profile` and key the file by the returned id; missing/invalid/expired tokens return 401 and an unreachable server 502.
- Saves take a `preferences.lock` directory (atomic mkdir, short retries, 5 s stale lock) around read-merge-write and temp+rename, so two hosts saving different members both persist and a failed write keeps the last good file.
- Live check at 58842/51796: unauthenticated save → 401; a save with Alice's token and Blair's id in the body wrote Alice's entry and Blair still loaded `null`. Alice's entry then contained `background`, `projects` and `recentApps` alongside the five original keys.
- `tests/host.test.mjs` adds auth-required, spoofed-id, invalid/expired, concurrent two-host and failed-write cases: 16/16 host + launcher pass.
- Existing settings remained readable; older five-key files still validate.
