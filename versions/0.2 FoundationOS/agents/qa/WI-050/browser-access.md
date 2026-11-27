# Built-in browser recheck for the GLM QA session

Recorded by Edge on 27 November 2026 at PR #9 head `d73e407` (code `b34bc25`).

## Attempts

| Attempt | Session | Result |
| --- | --- | --- |
| 1 | `ses_de511deb9ffevPHhHeaGkMjBse` (the independent QA session) | **BLOCKED** — calling `browser.tabs.list` returned `Unknown tool 'browser.tabs.list'.`; the tool catalog contained only `tools.browse.*`, no `browser.*` namespace |
| 2 | `ses_de4bace3cffepkt4qxQrTahNMe` (a fresh GLM 5.3 Flash child session) | **BLOCKED** — the same exact error |

Both probes were run with a browser tab open in Edge's own session and again after opening a fresh tab, so the desktop browser was active in the parent session.

## Why retrying a child session does not change it

`opencode-cli api get /api/session/<id>` returns the session permissions:

- `ses_de5ae0ebaffeECvkN5aCcWmiH6` (Muse tester, which had the built-in browser):
  `[{"action":"browser","resource":"*","effect":"allow"},{"action":"skill","resource":"browser","effect":"allow"}]`
- `ses_de511deb9ffevPHhHeaGkMjBse` (GLM QA): no permissions.
- `ses_de4bace3cffepkt4qxQrTahNMe` (fresh GLM probe): no permissions.

OpenCode's browser plugin (`packages/plugin-browser/src/connection.ts`) explains this:

> A child copies its parent's permissions, browser grant included, but not the attachment. The grant is revoked while the child's prompt is admitted, so no step of the child lists browser tools.

A child only keeps the browser when it has its **own** desktop attachment. The desktop creates that attachment through the `experimental.browser/attach` RPC with a live browser connection; the server forwards each tool command to that desktop connection (`rpc.ts`, `command`/`result`). A session cannot attach itself, and the fallback Chrome connection cannot stand in for the desktop attachment.

## What remains blocked

- The GLM 5.3 Flash independent pass did **not** run in OpenCode's built-in browser. Its 20-scenario pass ran on the labelled Chrome `browse.*` integration with real 390×600 and 320×600 emulation.
- Until the built-in pass runs, WI-050 and Sprint-6 do not satisfy the “both reviewers drive OpenCode’s built-in browser” acceptance.

## The manual step

In OpenCode Desktop, open the child session **“WI-050 Flash independent QA”** (`ses_de511deb9ffevPHhHeaGkMjBse`) and open its browser pane, as was done for the Muse tester session. Then prompt that session to retry the built-in pass at `d73e407`. The QA session still holds the full disposable-run instructions and its report.

If the desktop cannot attach a browser to a child session in this build, the alternative is a top-level GLM session with its own browser pane; the same brief and candidate apply.
