# WI-027 · First private file through the built client

Candidate `b8459c6`. Server v0.1 on port 54544, client 0.2 on 64617 through `Start.cmd`.

- Seeded `alice` and `blair` with `tests/fixtures/seed.mjs` against a disposable store; tokens stayed in `Edge/workspace/qa/fixtures.json` (ignored).
- Connected alice, read `/file/Weather/README.md`; the text is alice's (`Weather 0.2`).
- Blair's matching path (`/file/Weather/README.md`) reads `Blair's weather desk`, proving member scoping.
- Fixture smoke test: `node --test tests/fixtures/seed.test.mjs` → 3/3 pass.

No token appears in this folder or in the repository.
