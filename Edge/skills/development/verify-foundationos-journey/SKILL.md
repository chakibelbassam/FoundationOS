---
name: verify-foundationos-journey
description: Run scoped server and browser QA, optionally delegate an independent replay, and preserve evidence tied to the version.
---

# verify foundationos journey

Name one journey and its observable result. Resolve the actual version launcher and use a temporary data directory. For 0.1 run the version's FoundationOS Server/verify.py from Edge with `.\tools\Run-EdgeTool.ps1 qa 0.1`, which invokes the real Windows launcher and checks profile isolation and restart. Exercise the 0.1 status page with `.\tools\Run-EdgeTool.ps1 browser 0.1` from Edge. The browser runner owns the temporary server and waits for the launcher's actual URL. Record the client click journey as pending until a runnable client exists.

For a client version start its server and client together. Open the URL printed by that run, use accessible role/name selectors or a fresh accessibility snapshot, and click the controls a user would. For Weather: Run, wait for ready, Expand, return via Edge, check focus on the originating card, reopen, then Stop. Check the server state alongside the UI and again after restart. For folder browsing, check long-press, keyboard and short viewports separately.

Use the available browser tool or Microsoft Playwright CLI. Save minimal screenshots and a short action log in your ignored workspace. If using a QA subagent, give it the version, authorised scope, data directory and acceptance without the intended fix. Let it independently report observations. Stop only processes created by the test. Report pass, fail, and untested surfaces separately; submit defects through the triage workflow.
