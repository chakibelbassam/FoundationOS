# Working on the FoundationOS client and server

Use this guide when changing the browser client, the FoundationOS Server API, or the launcher that connects them. The [version index](../versions/README.md) identifies shipped and proposed increments. The [PI-2 client draft](../scrumWorkspace/documents/drafts/pi-02-client-foundation.md) records v0.2 design choices under discussion.

## Choose the release and entry point

1. Resolve the item, its sprint and its PI through scrumWorkSpace. Match the PI's targetVersion to the exact folder under `versions/` and read its brief. Record the target, the dependency versions and the journey you will check. Resolve any mismatch with the owner before editing release files.
2. Put release-specific client work in that version's `FoundationOS/` package. Put changes to a server release in its `FoundationOS Server/` folder. A client may depend on an earlier server. For v0.2, build the client against the [v0.1 API contract](../versions/0.1%20FoundationOS/FoundationOS%20Server/openapi.yaml). If the contract cannot support a journey, record the missing capability and agree its server target before implementing it.
3. Keep the version brief and user launcher at the version root. Document prerequisites, commands, supported client/server pairing, how to recognize readiness, and how to stop the processes in the relevant README. Follow the [delivery procedure](README.md) for implementation and acceptance.

## Client and server responsibilities

| Owner | Working rule |
|---|---|
| Browser client | Own routes, connection prompts, loading and error states, focus, and presentation. Read private data through the documented API. Keep session tokens in memory and out of links, persistent browser storage, logs and evidence. Clear private views and pending results when the session changes. |
| FoundationOS Server | Own identity, authorization, home boundaries, persistence and response shapes. For a contract change, update the target server's implementation, OpenAPI description, contract tests and README together. Run store and account checks against isolated data. |
| Launcher and client host | Own the supported server selection, compatibility check, built assets, browser entry point and process lifetime. Keep the server API independently usable. Give a user-visible recovery action when startup fails. Document which processes the launcher starts and stops. |

## Adopting interface components

Reproduce the interaction in the OneDrive prototype and compare it with the version's user story. Record whether to reuse, adapt or replace it and why. Compose controls with MUI or React Bits and use Material Icons. Keep API calls and navigation decisions in the owning client feature. A card exposes an activation action and gives each secondary action its own labelled control.

Document adopted controls in the [interface component inventory](../Product%20Information/Interface/Components/README.md). Include where the control appears, what click and keyboard activation do, where focus returns, and how it behaves with long labels, reduced motion and a narrow viewport. Link a reproducible defect to its Scrum item.

## Verify and hand off

Exercise the changed journey through the version launcher with a built client and the identified server. Use focused component or contract checks for the part that changed. For a change across the client/server boundary, also run one real round trip and one relevant failure or recovery. A navigation change, for example, should show what the user sees on direct entry, Back and reconnect.

Attach the version pair, entry point, observed result and outstanding limitations to the work item. Keep design questions in the PI draft, startup instructions beside the release, and verified user behaviour in the [Manual](../Product%20Information/FoundationOS%20Manual.md).
