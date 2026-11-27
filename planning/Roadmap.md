# Roadmap to 1.0

Setup precedes PI 0.1. Preserve the planning baseline and establish a reviewable development workflow (W-32 and W-25). Version allocations describe intended delivery. Review original dependencies during sprint planning. The early embedded view can use a fixture before the worker supervisor exists.

| PI | Outcome | Imported queue |
| --- | --- | --- |
| 0.1 · FoundationOS Server | Delivered the loopback server with versioned persistence, admin provisioning, invitations, revocable sessions, private hierarchical homes, and a tested OpenAPI contract. | W-06a W-31a |
| 0.2 · Client foundation | Open the React client against representative data. Verify folder and app widgets, focus, loading, empty and unavailable states. | New client work |
| 0.3 · Accounts and connection | Complete first run, invitation, sign-in and sign-out against the real server. A second account can access only its authorised workspace. | W-31b W-31c W-31d W-31e W-34 W-40 |
| 0.4 · Everyday navigation | Enter a folder, inspect an app and return to the same card with focus restored. Test guidance visibility, shared appearance, keyboard and viewport fit. | New client work |
| 0.5 · Security and deployment | Verify backup and restoration, session revocation and origin boundaries. Demonstrate local and authorised remote access when the domain and deployment are approved. | W-16 W-28 W-41 |
| 0.6 · Edge inside FoundationOS | Navigate back to the originating folder with the model offline. When connected, chat and dictate using a visible recording lock. | W-01 W-10 W-11 W-17 W-18 W-30 |
| 0.7 · Apps and App Studio | Import Weather, run on an assigned port, expand, return, reopen the running instance and stop. Test the separate standalone widget integration. | W-04 W-09 W-20 |
| 0.8 · Workshops and Tasks | Prove a confined development worker, task notifications, restart, candidate review and safe retry. Check filesystem confinement before command execution. | W-02 W-03 W-05 W-06b W-07 W-08a W-08b W-12 W-13a W-13b W-14a W-14b W-14c W-14d W-15 W-19 W-21 W-24 W-26a W-26b W-27 |
| 0.9 · Shared projects | Verify membership, role ceilings, work records, chats, separate worktrees and access after removal with two accounts. | W-31f W-35 W-36 W-37 W-38 W-42 |
| 1.0 · Catalog and release | Publish, review, install and update an app copy. Exercise the v1 journeys on desktop and phone before publishing the verified Manual. | W-39 |

W-22 (second harness) is deferred pending evidence of a need. Map catalog review, copy installation and updates to 1.0; phone status and approvals to 0.8 and 1.0. Record the downloadable client decision at 1.0 after checking the web journeys. Project invitations, private membership, channel access and the one-writer model are acceptance journeys for 0.9. See the [original queue](harness-strategy/07-work-items.md) and the [original product stories](FoundationOS.md).
