---
revision: 1
---
# PI-3 baseline · accepted v0.2 client and v0.1 server

Recorded 27 November 2026 for **WI-054**. This is observational only. v0.3 does not migrate this store.

## Accepted revisions

| Item | Value |
|---|---|
| Base branch | codex/development-workspace |
| Base commit | 74dc456, the merge of PR #10 after PR #9 |
| Client baseline | versions/0.2 FoundationOS/FoundationOS |
| Server baseline | versions/0.1 FoundationOS/FoundationOS Server |
| Server version and schema | 0.1, schema 2 |
| Client version | 0.2 |

## Launch

1. Start versions/0.1 FoundationOS/Start.cmd. The console prints the loopback status URL and, on a fresh store, one admin key.
2. Start versions/0.2 FoundationOS/Start.cmd with the server URL. The host prints the client URL and opens the browser.
3. Paste an existing session token at Connect.

## Observed baseline

| Area | Observation |
|---|---|
| Account model | One admin created at first boot; members created by invitation; one-time account keys exchanged for session tokens |
| Store | %LOCALAPPDATA%\FoundationOS\store\foundationos.sqlite, schema 2 |
| Homes | store/homes/account-id/profile.json plus files/ |
| Preferences | %LOCALAPPDATA%\FoundationOS\client\preferences.json, keyed by member id |
| Workspace | Bento Home, Projects, Apps, SVAR File Explorer, reader, Back and appearance settings |
| Session | Token held in memory only; refresh returns to Connect |
| Proof | The PI-2 close records in Scrum and the v0.2 host, launcher and build checks on the base commit |

## What v0.3 changes

- Client and server both move to 0.3 under versions/0.3 FoundationOS.
- The account store is a fresh schema 3 store; a 0.1 or 0.2 store is refused and left untouched.
- Username and password replace the pasted token.
- profile.json is removed; SQLite is authoritative.
- Preferences move to the server with a client cache.
- Sessions persist through browser close, device restart and client-host restart.

The v0.1 and v0.2 folders stay as released snapshots.
