# 0.1 FoundationOS — FoundationOS Server

Status: released. This is the backend the v0.2 client starts separately.

Run Start.cmd with Node.js 24 or later. The console displays the loopback status URL, and on a fresh store the one-time admin key. Follow the [server guide](FoundationOS%20Server/README.md) to invite members and use the API.

Run the acceptance with Python 3 on Windows using `FoundationOS Server/verify.py`; it uses a temporary store and stops its instances. The server and contract tests run with `node --test "FoundationOS Server/server.test.mjs" "FoundationOS Server/openapi.test.mjs"`.

This increment delivers the server only: one shared store with migrations, a first-run admin, invitations, sessions with revocation, admin and member roles, hierarchical private homes, an OpenAPI contract, uniform errors and logging. The web client is the [0.2](../0.2%20FoundationOS/README.md) increment. See the [Manual](../../Product%20Information/FoundationOS%20Manual.md) and [roadmap](../../planning/Roadmap.md).
