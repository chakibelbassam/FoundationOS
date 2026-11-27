# Complete 📦 PI-3 (Accounts and connection) for FoundationOS v0.3

Edge, deliver all six sprints and their work items as a tested, review-ready v0.3 in **two pull requests**. Own coordination, delegation, Scrum updates, fixes and verification while the owner is away. This goal authorizes scoped implementation, testing on disposable installations, pushing the PI branches and opening both PRs. The owner handles merge and release tagging.

## Decisions that override the plan

Read the [PI-3 owner decisions](../../scrumWorkspace/documents/PI-03/owner-decisions.md) before anything else. Where the [increment plan](../../scrumWorkspace/documents/PI-03/accounts-and-connection-plan.md) or [sprint buckets](../../scrumWorkspace/documents/PI-03/sprint-buckets.md) still describe legacy enrollment or an upgrade, the decisions document and this goal win until the records are revised.

- **No legacy.** v0.3 opens only a fresh v0.3 store. A v0.1 or v0.2 store is refused with a clear message and left untouched. There is no enrollment, key sign-in or older-schema path. Retire that scope from the plan.
- **Both products in the version folder.** Copy the accepted v0.2 client and the v0.1 server into `versions/0.3 FoundationOS/`, bump both to 0.3, and work only there. The supported pair is client 0.3 with server 0.3.
- **Sessions.** The HttpOnly cookie carries the server session token. The client host proxies it; the server owns verification, expiry and revocation. Bind the cookie to the installation so two loopback ports never share a session. Remember me is a checkbox, checked by default. A valid session survives browser close, device restart and client-host restart.
- **Control and pairing.** The server console is the control surface: `O` opens the paired client, `R` recovers the owner, `Q` quits. The client pairs once and the server remembers its address.
- **Profile.** SQLite is authoritative and `profile.json` is deleted. Username, role, optional unverified email, introduction and avatar reference live in the store; the avatar file sits outside `files/`.
- **Retention.** On closure, reserve the username and Home for exactly 30 days, then hard delete everything and release the name. Local restore only inside the window, same account ID, fresh credentials. The 30 days is a v0.3 constant structured for a later server setting.
- **Preferences.** Server-authoritative with a client cache, last write wins, local file imported on first sign-in. Confirm the design before building it.
- **Credentials.** Six-character minimum with a small denylist; scrypt; the 5/1/3/5/15-minute rate ladder; six-digit invite and member-reset codes; 16-character owner recovery code; a 15-minute setup claim.
- **Two PRs.** Open PR 1 after Sprint 3 and keep working immediately. Open PR 2 for Sprints 4–6 on a branch stacked on PR 1, retargeted when PR 1 merges. Never wait for approval between them and never merge.

## Start or resume

1. From the Development checkout, read the [repository guide](../../AGENTS.md), [Edge guide](../AGENTS.md), [decisions](../../scrumWorkspace/documents/PI-03/owner-decisions.md), [increment plan](../../scrumWorkspace/documents/PI-03/accounts-and-connection-plan.md), [sprint buckets](../../scrumWorkspace/documents/PI-03/sprint-buckets.md) and [v0.3 brief](../../versions/0.3%20FoundationOS/README.md). Query PI-03, each sprint, its live work items, notes and links through `scrumWorkSpace`.
2. Verify the target is 0.3, both products are staged under `versions/0.3 FoundationOS/`, the supported pair is 0.3/0.3, and an older store is refused.
3. Inspect the working tree, branches, PRs and baseline evidence. PI-2 owns PR #9; preserve its in-flight changes and the local PI-3 planning records. Record the actual v0.2 client and v0.1 server revisions used for the behavioural baseline only. Older stores are not migrated.
4. Use one PI branch for PR 1, such as `edge-opencode/pi-03-accounts-and-connection`, based on `codex/development-workspace`. Keep each implementation commit attributable to its work item. Create the PR 2 branch stacked on PR 1 for Sprints 4–6. On resume, reconcile the PR heads, last tested revision and live Scrum records, then pick up the first unmet requirement.

## Assign three independent roles

| Role | Model | Assignment |
|---|---|---|
| Developer | Muse Spark 1.3 Contributor | Implement the current item, add regression coverage, update documentation and fix reported defects. Delegate scoped work freely. Request Max reasoning when available, otherwise Xhigh, then the highest supported setting. |
| Hands-on tester | Muse Spark 1.3 Contributor, in a separate agent session | Drive the actual launchers and the **real Chrome** plus OpenCode's built-in browser as a user. Design and execute a journey test, report expected and observed behaviour, and retest fixes. |
| Independent QA reviewer | GLM 5.3 Flash, in a third agent session | Derive checks from the plan and item criteria, operate **real Edge** plus the built-in browser firsthand, review regressions and CI, and issue an independent verdict for the candidate. |

Resolve model IDs and reasoning settings using OpenCode's model inventory. Record actual model, role and effective setting. Give each agent the titled item, exact target, deliverable, constraints and evidence expected. Give both reviewers the candidate revision and version pair. Each owns their test design, browser actions and report. Use disposable browser profiles, never the owner's everyday Chrome or Edge profile. Reserve full GLM 5.3 for a persistent failure or a substantial architectural decision.

## Deliver in the recorded order

| Sprint | Work items | Demonstration |
|---|---|---|
| 🏁 Sprint-1 (Establish the account foundation) | WI-054–057 and WI-060 | Record the v0.2/v0.1 behavioural baseline, settle the session and retention policy, create the fresh v0.3 store, refuse an older store, then launch the paired v0.3 client and server. |
| 🏁 Sprint-2 (Create accounts and sign in) | WI-058, 059, 061 and 080 | Use the shared MUI forms to create exactly one owner, sign in to a private file, and load the member's preferences from the server. |
| 🏁 Sprint-3 (Remember sessions and invite members) | WI-062–065 | Fully close and reopen the browser, restore an authorized route, invite a second member and demonstrate both sign-out modes with independent sessions. |
| 🏁 Sprint-4 (Recover access to the same account) | WI-066–069 | Change a known password and recover through a member reset, saved owner code and authorized maintenance on the server machine. Verify identity, files, settings and revocation. |
| 🏁 Sprint-5 (Manage my profile and close my account) | WI-070–074 | Rename to an available username, edit bio and optional email, add, replace or remove a picture. Close a disposable member account, prove the username stays reserved, protect the sole owner, restore a Home before its 30-day deadline and verify hard deletion after expiry on a separate fixture. |
| 🏁 Sprint-6 (Polish the experience and verify the release) | WI-075–079 | Polish account interactions, document actual operations, perform both independent browser passes, fix findings and assemble final evidence. |

For each item, read its full acceptance and dependencies. Move the item and its parents through the Scrum lifecycle as work proceeds. Review the developer's change, exercise the normal entry point and attach the result to the item. Advance directly when dependencies are satisfied. Answer routine questions using the decisions, plan and repository evidence. Record any assumption on the relevant item with its reason and how to verify it. Keep the current branch, last check and next action in Edge's handoff notes so another session can resume.

## Test the candidate and deliver the PRs

- Run the built client and server through their actual Windows launchers. Use explicit disposable data roots for both, track the processes started by the run and clean up only those resources. Exercise retention with the documented QA-only test clock. Keep passwords, cookies, codes and personal files out of logs, screenshots and Git.
- Both reviewers use independent cookie jars: **Chrome**, **Edge** and the built-in browser. Each tests a complete journey. Across their reports, cover every release acceptance row, including two independent sessions for one account and a third for another member, browser close/reopen on the jar holding the persistent session, recovery after interruption, username reuse only after purge, and the 30-day boundary on a separate fixture. Regress Home, Projects, Apps, SVAR File Explorer, the reader, Back and appearance. Check keyboard, autofill, reduced motion and actual desktop, 390 px and 320 × 600 viewports. Record which checks each reviewer actually performed.
- If a browser is unavailable during an unattended run, fall back to the built-in browser and record the limitation. Do not claim a check that was not performed.
- Route failures to the developer with reproduction steps. Have the reporting agent retest the fix, then have both reviewers verify the final candidate. Keep the two independently authored reports and their retests linked from their respective items. An unexercised requirement remains open. Continue unaffected work while resolving the blocker.
- Open PR 1 as a draft after Sprints 1–3. Run the applicable server, contract, client, host, launcher, refusal and regression suites, the release build, Scrum validation and required CI. Fix actionable failures and monitor checks through completion. Mark it ready when its items have acceptance evidence and its required CI is green. Then continue on the stacked PR 2 branch without waiting.
- Open PR 2 as a draft after Sprint 6, with one evidence row per work item, the supported version pair, both independent browser reports and any remaining limitations. Retarget it to `codex/development-workspace` when PR 1 merges.
- Update version documentation and the interface inventory with each PR. Update the Manual only after owner acceptance.
- Mark a PR ready only when every item in it has acceptance evidence, both independent browser reports cover the final candidate, required CI is green on the final head, and all release-blocking findings are resolved and retested. Keep owner acceptance distinct in Scrum.
- Report each PR URL, head SHA, tested version pair, CI, both report links and any remaining non-blocking limitations. If an external blocker survives recovery attempts, identify the exact outstanding check and leave that PR in draft.
