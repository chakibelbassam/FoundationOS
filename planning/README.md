# FoundationOS plan

Three places, one product:

| Where | What | Start here when |
| --- | --- | --- |
| [`FoundationOS.md`](FoundationOS.md) | **Product source of truth**: what it is, who it is for, the user story, the features | You need the definition |
| [`foundationos/`](foundationos/README.md) | Architecture and UX: the tree, the store, identity, projects, agents, every screen | You need to know how it works |
| [`harness-strategy/`](harness-strategy/README.md) | Delivery: PRDs, the ordered queue, triage rules, protocols, infrastructure | You need to know what gets built first |

The decision log is the single record of what was chosen:
[`harness-strategy/01-decision-log.md`](harness-strategy/01-decision-log.md)
(D1–D24).

## The short version

FoundationOS is a **folder structure** and an **interface** over it. The tree is
the truth; the UI, the index, the board and the inbox are derived. Edge is an
optional participant in the tree, not the server's brain.

One server on your PC, a handful of accounts, projects shared per person, agents
working in separate worktrees, and a catalog of reviewed app snapshots.

## Current baseline

[FoundationOS Development](../README.md) is the entry point and [0.1 FoundationOS](../versions/0.1%20FoundationOS/README.md) contains the current brief. D24 records the folder and version decisions. Earlier plans, including W-32, need reconciliation with this baseline before implementation.

## Status

Draft, 25 November 2026. Nothing here is built yet beyond the existing server,
explorer, Edge chat and the OpenCode ACP provider. The earlier queue proposed W-32 to move the workspace. The current baseline creates a new planning home and retains the existing checkout as a reference.


