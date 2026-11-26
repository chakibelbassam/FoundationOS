# 0.2 FoundationOS — FoundationOS Server

Status: acceptance passed, pending owner review.

This folder carries the server copy that the client foundation will use. The server is product increment PI-01: one shared store with migrations, a first-run admin, invitations, sessions with revocation, admin and member roles, hierarchical private homes, an OpenAPI contract, uniform errors and logging.

Run `Start.cmd` with Node.js 24 or later. The console prints the loopback status URL and, on a fresh store, the one-time admin key. Follow the [server guide](FoundationOS%20Server/README.md) to invite members and use the API.

Run the acceptance with Python 3 on Windows using `FoundationOS Server/verify.py`; it uses a temporary store and stops its instances. The server and contract tests run with `node --test "FoundationOS Server/server.test.mjs"`.

The client foundation starts after this server increment. See the [Manual](../../Product%20Information/FoundationOS%20Manual.md) and the [roadmap](../../planning/Roadmap.md).
