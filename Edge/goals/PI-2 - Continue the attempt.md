# Continue PI-2 (Client foundation) and finish v0.2

Edge, finish **Sprint-6 (Stabilize and polish the v0.2 workspace)** on the existing [PR #9](https://github.com/chakibelbassam/FoundationOS/pull/9). Start from the current v0.2 client and the separate v0.1 server. Verify the PR head and reconcile the local Scrum records before editing. The [Sprint-6 follow-up](../../scrumWorkspace/documents/PI-02/pr-9-acceptance-follow-up.md) is the current scope and supersedes the older PI-2 handoff for the final sprint.

## Deliver the sprint

1. Review the existing client through the real launchers. Fix member preference ownership and concurrent saves, stale requests across session changes, nested app recognition and app-card hover that survives scrolling. Use WI-045 through WI-048 as the acceptance criteria.
2. Wire **SVAR React File Manager** into the private workspace for WI-051. Keep the existing session, member-relative routes, text reader and v0.1 API. Hide unsupported operations and exercise deep links, reconnect and Back. Use normal file explorer conventions.
3. Build the **React Bits Magic Bento** Home for WI-052. Include Projects, Recent Apps, File Explorer and Activity in the agreed layout. Link to working destinations and use real member data. Keep the initial Projects and Apps explorers small and make the Apps inventory scope clear. Activity reflects actual source availability.
4. Add **Topography as the default** and Standard, Magic Rings, Lightfall and Ghost Fibers as appearance choices for WI-053. Use the existing preview and apply workflow, preserve member settings and cover reduced motion and graphics fallback.
5. Use WI-049 to polish the integrated client and resolve visible defects in this scope. Review the current candidate and the agreed Home design. The owner retired the OneDrive replay requirement and chose conventional workspace navigation. Keep the broader UI component pass for a later update and leave account onboarding and real sign-in to v0.3.
6. Run WI-050 independently on the final PR head. Route findings back to the developer, have both reviewers retest their own affected checks, and repeat the combined release gates before returning the PR to review.

## Assign three separate agents

| Assignment | Model | Responsibility |
|---|---|---|
| Developer | Muse Spark 1.3 Contributor | Implement scoped work, add regression coverage where needed and fix findings. |
| Hands-on tester | Muse Spark 1.3 Contributor | Use a separate agent session from the developer. Run user journeys through the real launchers and the built-in browser, probe usability and edge cases, and submit reproducible findings and retests. |
| Independent QA | GLM 5.3 Flash | Derive acceptance tests from the work items, independently operate the built-in browser, check regressions, and record the release verdict and CI evidence. |

Check the available model IDs before delegation. Give each reviewer the acceptance criteria and candidate SHA. Each prepares and runs their own checks and records their own results. Edge coordinates and the developer fixes product code. Reserve full GLM 5.3 for a persistent architectural problem that needs a separate investigation.

The earlier QA briefs reserved browser control for Edge. One review ran HTTP checks while the other reviewed source, screenshots and contrast. Both contributed evidence, and full independent browser coverage remained outstanding. The earlier narrow screenshots used desktop containers. This sprint requires both reviewers to operate **OpenCode's built-in browser** through the launcher-printed URL and cover real browser viewport sizes. Provide separate browser contexts and disposable fixtures, or schedule clean runs sequentially if they need the same browser surface. If a reviewer lacks browser control, resolve access or record their run as blocked. Keep WI-050 open until both interactive passes exist.

## Evidence and handoff

- Use explicit disposable server and client data roots. Clean up only the processes started by your own run and verify their exit. The prior QA run created a default store and stopped unrelated Node processes. Verify the Windows launcher in a Windows environment.
- Have both reviewers run the primary Home, explorer, Weather, reconnect and Back journey. Divide additional coverage across each background and fallback, keyboard and cursor, responsive layout, member switching and settings persistence, stale results and scroll during hover. Record actual viewport, input, candidate revision and observed result. State device and tool gaps separately.
- Use the repository's Edge and Scrum procedures, record progress and assumptions, and keep changes identifiable by work item. Keep implementation and evidence on PR #9. Refresh the version notes, component inventory, Scrum evidence and PR summary. The owner retains merge and tag.
- Finish with the final PR head, CI outcome, links to both browser reports, retests and any remaining evidence gaps. Bring the sprint back to owner review once the nine items have evidence. Fix or report blocking acceptance issues before recommending v0.2 for release.
