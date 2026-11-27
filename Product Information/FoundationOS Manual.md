# FoundationOS Manual

**Version 0.1 · FoundationOS Server · 26 November 2026**

## Start the server

Install Node.js 24 or later on Windows. Open versions, then 0.1 FoundationOS, and double-click Start.cmd. The console prints a local address ending in /status. On a fresh store it also prints one JSON line with the admin identity and its one-time key. Keep the console open while you use the server. Press Ctrl+C to stop it.

## Sign in

Send the account key as a Bearer token to POST /sessions. The response holds a session id and a session token. Use the session token for every other call; a raw account key is not a session. Sign out with DELETE on /sessions/{id}. An admin session can revoke any session, and a revoked token stops working at once.

## Invite a member

Sign in as admin and send POST /invitations. The response holds a one-time invitation id and token. Create the member with POST /accounts, the invitation as the Bearer token, and a JSON body like `{"name":"maya"}`. The response holds the member id, name and one-time account key. Names are lowercase and 2 to 39 characters. A used or unknown invitation fails. Each member receives a private home that no other member can read, including the admin.

## Work with folders and files

GET /files lists the root of your home as entries with a type. POST /folder with `{"path":"docs"}` creates one folder; its parent must exist. PUT on /files/{path} writes up to 64 KiB of UTF-8 text, GET returns it as text, and DELETE removes a file or an empty folder. Paths are relative, at most 16 segments and 240 characters, and the server refuses traversal, encoded traversal, hard links and junctions. You can only address your own home.

## Where the data lives

The shared store lives under %LOCALAPPDATA%/FoundationOS/store. Set FOUNDATIONOS_DATA to an operator-owned directory for a separate installation. Stopping the server and copying the store directory backs it up. The store carries a schema version: a newer server migrates it on boot, and an older copy refuses to start against a store that a newer copy already moved ahead.

## What this version does not include

This version does not include a browser client, remote access, running imported code, sharing between members, or move and rename. The console, the API contract in openapi.yaml beside the server, and verify.py are the interface on purpose.

## Acceptance

The 0.1 acceptance exercised the Windows launcher, the first-run admin key, invitations, member creation, sessions, folder and file work, cross-member isolation, traversal, hard links, junctions, revocation and restart. Run it from a terminal in the version folder with `python "FoundationOS Server/verify.py"`; it uses a temporary store and stops its instances.
