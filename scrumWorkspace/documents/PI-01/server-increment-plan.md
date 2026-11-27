---
revision: 9
---
# PI-01 FoundationOS Server plan

PI-01 delivers the server in versions/0.1 FoundationOS. Sprints 1–4 cover the initial loopback slice. Sprints 5–9 cover the extended server and review fixes. PI-02 is the proposed v0.2 client foundation.

## Story

One computer hosts FoundationOS. The operator double-clicks the launcher in the version folder. The server finds its shared store, migrates it when needed, and on a truly empty store creates the admin and prints a one-time key in the console. The admin invites members; each member receives a private home and a credential. Members sign in, work with folders and files by relative path, and sign out. Every operation is scoped to the signed-in member, and traversal, links and other homes are refused. The admin can revoke any session. Restarting keeps everything, because accounts and homes live in one store. Backup is stopping the server and copying the store directory. The OpenAPI contract beside the server copy tells the 0.2 client and every agent what the server promises, and CI calls every documented operation and validates every documented response status against it.

The launcher console, API and acceptance script provide the v0.1 interface.

## Naming

Stored record IDs keep the canonical padded form the tool requires: PI-01, S-01-5, WI-010. In conversation follow Edge’s present-scrum-workspace skill. For branches, commit trailers and pull requests follow the GitHub development lifecycle skill. Sprint numbers 1 to 4 inside PI 1 are already used by the delivered 0.1 slice, so the five planned sprints are S5 to S9. Machine-facing fields such as trailers and receipts keep the stored IDs.

## Decisions by the owner, 26 November 2026

| Decision | Choice |
| --- | --- |
| Increment shape | Both server slices belong to PI-01 and ship as v0.1 |
| Source layout | A frozen server copy per versions folder |
| Data | One shared store with cumulative migrations and a schema guard |
| Sign-in | Sessions with revocation, first-run admin, invitations; keys remain member credentials |
| Contracts | OpenAPI-first, one file per server copy, endpoint tests in CI |
| Packaging | Folder plus launcher; a single executable is revisited at 1.0 |
| Parallel tooling | The OpenCode configuration, plugins and tooling research from the wiring session are accepted into this increment as WI-22 |

Upgrade rule: each version copy carries every migration up to its release, and only the newest copy migrates the store. An older copy that meets a newer schema refuses to start.

## Acceptance review fixes, 26 November 2026

The owner's independent review held acceptance on three gaps: empty folders could not be deleted, a failed home setup consumed the invitation and stranded the account, and verify.py never read openapi.yaml. WI-23 (Close the server acceptance gaps) fixes them with regression tests for empty-folder deletion, member retry after a failed home setup, first-boot retry, and a contract suite that reads the published file, calls every documented operation and validates every documented response status. The increment stays in review until the owner accepts.

## The server can do this after this increment

| Capability | Work items |
| --- | --- |
| Boot from the launcher against one versioned store with migrations and a schema guard | WI-10, WI-11 |
| First-run admin with a printed one-time key | WI-12 |
| Sessions: sign in, sign out, admin revocation | WI-13 |
| Invitations create members with private homes | WI-14 |
| Admin and member roles enforced per route | WI-15 |
| Folders and files by relative path: create, list, read, write, delete | WI-16 |
| Every 0.1 boundary refusal still holds | WI-17 |
| OpenAPI contract, uniform errors, status and logging | WI-18, WI-19, WI-20 |
| Acceptance script, Manual and launcher evidence | WI-21 |

## Deferred beyond this increment

| Deferred capability | Home | Reason |
| --- | --- | --- |
| Browser client and any UI | 0.2 | Built against this contract |
| Sign-in screens, first-run wizard, passwords, passkeys | 0.3 | The primitives ship now; human flows belong to accounts |
| Move and rename | 0.4 | Navigation needs them first |
| Backup and restore commands, remote access, TLS, origin rules | 0.5 | Security and deployment |
| Running imported code, process confinement, task workers | 0.7 and 0.8 | The server does not execute user code here |
| Shared projects, collaboration, channels | 0.9 | Homes stay private |
| Catalog, install and update, phone checks, single executable | 1.0 | End of roadmap |

Multi-host and networked databases stay off the roadmap.

## Sprints

| Sprint | Items | Acceptance |
| --- | --- | --- |
| S5 Storage spine | WI-10, WI-11, WI-22 | One store, ordered migrations, schema guard, tooling recorded |
| S6 Identity and sessions | WI-12 to WI-15 | Admin, invitations, sessions, roles |
| S7 Hierarchical workspaces | WI-16, WI-17 | Folder operations and boundary refusals |
| S8 Contracts and operations | WI-18 to WI-20 | OpenAPI, uniform errors, status, logging |
| S9 Acceptance | WI-21, WI-23 | Verify script, Manual, launcher evidence, review fixes |

S1 to S4 delivered the 0.1 slice and their items are in review.


## Verification

Run the v0.1 Windows launcher acceptance and the v0.1 Node server and OpenAPI suites. See the Manual for the delivered operator workflow.
