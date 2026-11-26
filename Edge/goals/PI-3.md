# Complete 📦 PI-3 (Accounts and connection) for FoundationOS v0.3

Edge, deliver all six sprints and 26 work items as one tested, review-ready v0.3 pull request. Own coordination, delegation, Scrum updates, fixes and verification while the owner is away. This goal authorizes scoped implementation, testing on disposable installations, pushing the PI branch and opening the PR. The owner handles merge and release tagging.

## Start or resume

1. From the Development checkout, read the [repository guide](../../AGENTS.md), [Edge guide](../AGENTS.md), [increment plan](../../scrumWorkspace/documents/PI-03/accounts-and-connection-plan.md), [sprint buckets](../../scrumWorkspace/documents/PI-03/sprint-buckets.md) and [v0.3 brief](../../versions/0.3%20FoundationOS/README.md). Use the relevant Edge skills, project knowledge and tools. Query PI-03, each bucket, its live work items, notes and linked requirements through `scrumWorkSpace`. Verify the target is 0.3 and both product folders are under `versions/0.3 FoundationOS/`.
2. Inspect the working tree, branches, PRs and baseline evidence. PI-2 owns PR #9. Preserve its in-flight changes and any local PI-3 planning records. Reuse an existing PI-3 checkout or isolate one for this increment, carrying across the scoped planning records and this goal if they have yet to land. Record the actual v0.2 client and v0.1 server revisions used for the baseline. If the parent PR is still in flight, label its candidate provisional, follow the [stacked-PR procedure](../skills/development/github-development-lifecycle/SKILL.md), advance independent work, and reconcile and rerun affected checks against the accepted baseline before declaring readiness.
3. Use one PI branch, such as `edge-opencode/pi-03-accounts-and-connection`, and one aggregate PR. Keep each implementation commit attributable to its work item. On resume, reconcile the PR head, last tested revision and live Scrum records, then pick up the first unmet requirement.

## Assign three independent roles

| Role | Model | Assignment |
|---|---|---|
| Developer | Muse Spark 1.3 Contributor | Implement the current item, add regression coverage, update documentation and fix reported defects. Delegate scoped work freely. Request Max reasoning when available, otherwise Xhigh, then the highest supported setting. |
| Hands-on tester | Muse Spark 1.3 Contributor, in a separate agent session | Drive the actual launchers and OpenCode’s built-in browser as a user. Design and execute a journey test, report expected and observed behaviour, and retest fixes. |
| Independent QA reviewer | GLM 5.3 Flash, in a third agent session | Derive checks from the plan and work-item criteria, operate the built-in browser firsthand, review regressions and CI, and issue an independent verdict for the candidate. |

Resolve model IDs and reasoning settings using OpenCode’s model inventory. Record actual model, role and effective setting. Give each agent the titled item, exact target, deliverable, constraints and evidence expected. Give both reviewers the candidate revision and version pair. Each owns their test design, browser actions and report. If they share one browser surface, schedule separate runs with clean fixtures. Reserve full GLM 5.3 for a persistent failure or a substantial architectural decision. Send it a bounded question and the evidence already collected.

## Deliver in the recorded order

| Sprint | Work items | Demonstration |
|---|---|---|
| 🏁 Sprint-1 (Establish the account foundation) | WI-054–057 | Record the baseline and session policies, rehearse migration and rollback on a copied store, then launch the local v0.3 pair. |
| 🏁 Sprint-2 (Create accounts and sign in) | WI-058–061 | Use the shared MUI forms to create exactly one owner, enroll existing accounts and sign in to a private file. |
| 🏁 Sprint-3 (Remember sessions and invite members) | WI-062–065 | Fully close and reopen the browser, restore an authorized route, invite a second member and demonstrate both sign-out modes with independent sessions. |
| 🏁 Sprint-4 (Recover access to the same account) | WI-066–069 | Change a known password and recover through a member reset, saved owner code and authorized maintenance on the server machine. Verify identity, files, settings and revocation. |
| 🏁 Sprint-5 (Manage my profile and close my account) | WI-070–074 | Rename to an available username, edit bio and optional email, and add, replace or remove a picture. Close a disposable member account, protect the last owner, restore a Home before its 30-day deadline and verify cleanup after expiry on a separate fixture. |
| 🏁 Sprint-6 (Polish the experience and verify the release) | WI-075–079 | Polish account interactions, document actual operations, perform both independent browser passes, fix findings and assemble final evidence. |

For each item, read its full acceptance and dependencies. Move the item and its parents through the Scrum lifecycle as work proceeds. Review the developer’s change, exercise the normal entry point and attach the result to the item. Advance directly when dependencies are satisfied. Answer routine questions using the plan and repository evidence. Record any assumption on the relevant item with its reason and how to verify it. Keep the current branch, last check and next action in Edge’s handoff notes so another session can resume.

## Test the candidate and deliver the PR

- Run the built client and server through their actual Windows launchers. Use explicit disposable data roots for both, track the processes started by the run and clean up only those resources. Exercise retention with a controlled test clock. Keep passwords, cookies, codes and personal files out of logs, screenshots and Git.
- Both reviewers use **OpenCode’s built-in browser** at the launcher-printed URL. Each tests a complete journey. Across their reports, cover every release acceptance row, including two browser profiles for one account and a third for another, browser close/reopen, recovery after interruption, username reuse and the 30-day boundary. Regress Home, Projects, Apps, SVAR File Explorer, the reader, Back and appearance. Check keyboard, autofill, reduced motion and actual desktop, 390 px and 320 × 600 viewports. Record which checks each reviewer actually performed.
- Route failures to the developer with reproduction steps. Have the reporting agent retest the fix, then have both reviewers verify the final candidate. Keep the two independently authored reports and their retests linked from their respective items. Resolve missing browser access or retry with a clean built-in session. An unexercised requirement remains open. Continue unaffected work while resolving the blocker.
- Open the v0.3 PR as a draft. Run the applicable server, contract, client, host, launcher, migration and regression suites, the release build, Scrum validation and required CI. Fix actionable failures and monitor checks through completion. Update version documentation, the interface inventory and the PR evidence table with one row per work item.
- Mark the PR ready for review when all 26 items have acceptance evidence, both independent browser reports cover the final candidate, required CI is green on the final head, and all release-blocking findings are resolved and retested. Keep owner acceptance distinct in Scrum. Report the PR URL, head SHA, tested version pair, CI, both report links and any remaining non-blocking limitations. If an external blocker survives recovery attempts, identify the exact outstanding check and leave the PR in draft.
