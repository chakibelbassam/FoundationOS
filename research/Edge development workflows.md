# Edge development workflows

## What the existing sessions showed

The folder explorer discussions distinguished selecting an app from running it or opening its source. Checks on nested folder rows found clipped papers at viewport boundaries and inconsistent focus on return. The widget skill now asks for both edges of a row, a short viewport and the originating focus target. The QA skill names the input actually exercised so desktop emulation is distinguishable from a physical phone test.

The development setup sessions used a fresh OpenCode conversation to retrieve persisted work and publish a Manual. The new sprint skill exercises that entry point directly. It treats the setup PI separately from the first product PI. Stories and implementation evidence can disagree with parent status; the agent reports that discrepancy without changing records in response to a read question.

## Tools and skills examined

| Source | Fit and trial |
| --- | --- |
| [Microsoft Playwright CLI](https://github.com/microsoft/playwright-cli) and [Playwright locators](https://playwright.dev/docs/locators) | The CLI provides an upstream browser skill for exploratory QA. The local regression runner uses the installed Playwright library, a version-owned journey and a fresh browser. Version 0.1 exercises its live status view. The Weather controls become testable when a client ships. |
| [OpenCode skill discovery](https://opencode.ai/docs/skills/) | Reuse grouped local skill sources. Keep company procedures in the project, versioned with the product. Test discovery from the actual launch folder, including Edge. |
| Original SynapsAi Scrum extension | Reuse separate operations for planning, document revisions, note append and reference discovery. FoundationOS calls these through a project-scoped MCP service. |
| Original TriageSCR guidance | Ask about context, supported type, impact and workarounds. Keep a working interpretation visible when evidence is incomplete. |

## Review findings

The earlier adapter exposed complete-record saves and a flat file listing. Grouped storage and scoped queries make the operational data easier to navigate. Notes preserve observations as work progresses; documents can change by revision. Edge's scratchpad is local to a checkout. Distinguish human acceptance from tool success and from model-generated recommendations.

## Migration and verification (2026-11-25)

The development records moved from flat `scrum/` JSON to `scrumWorkspace/increments`, `sprints` and `work-items`. The tool is `scrumWorkSpace`; `scrum.mjs` remains a compatibility entry point. Documents, notes and knowledge links use separate sidecars under the same root. A query for PI-01 sprint 1 returned S-01-1, WI-002 and WI-003 after the migration.

The 0.1 server fixture passed through `Run-EdgeTool.ps1 qa 0.1`, including launcher, two profiles, scoped reads and writes, links and restart. The browser fixture passed through `browser-qa.cjs 0.1` when `NODE_PATH` pointed at the Codex runtime. `publish.py --changed` passed with the Codex runtime Python, and all six PDFs were newer than their sources.

Runtime discovery was the remaining environment defect. The launcher originally located the Codex runtime only by finding `pdftoppm`, which is not on PATH on this machine. Publishing and browser QA therefore failed from a clean shell until `NODE_PATH` or `FOUNDATIONOS_PYTHON` was set manually. The runtime itself is present at `%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies`, with Python 3.12 plus `python-docx` and Playwright. `py -3` is Python 3.14 without `python-docx`, and the `python` command is a Windows Store shim. The launcher now detects the runtime directory directly, adds its `node_modules` to `NODE_PATH` for browser QA, and keeps the manual overrides as fallbacks. After the fix, server QA, browser QA and `publish.py --changed` passed from a clean shell.

Automated coverage is still missing for record revisions, lifecycle guards, document paths, note idempotency, knowledge revisions and lock recovery. The next increment adds those tests alongside the `manual`, `validate` and `receipt` operations. The future FoundationOS interface to `scrumWorkSpace` remains a product decision; planning and control operations are deferred until that interface is designed.
