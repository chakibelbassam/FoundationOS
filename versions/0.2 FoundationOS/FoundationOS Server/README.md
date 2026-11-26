# FoundationOS Server 0.2

Use Node 24 or later. Double-click Start.cmd in the version folder. Its console prints a loopback status URL with the assigned port. Leave it open while using the server. Ctrl+C ends it.

On a fresh store the console prints one JSON line with the admin identity and its one-time key, for example `{"event":"admin-created","id":"...","key":"..."}`. Keep that key private. It never prints again: restarting against the same store signs in with the same key and keeps every account and file.

Sign in by sending the account key as a Bearer token to POST /sessions. The response holds a session id and token. Use the session token as the Bearer token for every other call. Sign out with DELETE on /sessions/{id}; an admin session can revoke any session id, and a revoked token stops working at once.

Admins invite members with POST /invitations, which returns a one-time invitation id and token. Creating the member is a POST to /accounts with the invitation as the Bearer token and a JSON body like `{"name":"blair"}`. The response holds the member id, name and one-time account key. A used or unknown invitation fails, and names stay lowercase. GET /profile returns the caller's identity. GET /accounts lists every account without secret material for admins only.

Files live in your own home. GET /files lists the root as names with their type. GET on /files/{path} returns a file as `{"text":"..."}` or a folder as its entry list. PUT on /files/{path} writes up to 64 KiB of UTF-8 text; the parent folder must already exist. DELETE removes a file or an empty folder. POST /folder with `{"path":"docs"}` creates one folder. Paths are relative, at most 16 segments and 240 characters, and traversal, encoded traversal, hard links and junctions are refused. You can never address another member's home.

The shared store lives under %LOCALAPPDATA%/FoundationOS/store. Set FOUNDATIONOS_DATA to an operator-owned directory for a separate test installation. Stopping the server and copying the store directory backs it up. The store carries a schema version: a newer server migrates it on boot, and this copy refuses to start against a store that a newer copy already moved ahead.

This increment does NOT include a browser client, remote access, running imported code, sharing between members, or move and rename. The console, the API beside this file in openapi.yaml, and verify.py are the interface, on purpose.
