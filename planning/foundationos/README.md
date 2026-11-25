# FoundationOS — organized notes

**Status:** living document · 25 November 2026
**Scope:** what FoundationOS **is** — the product, the tree, the rules, the
screens. The build plan (PRDs, work items, triage, protocols) stays in
`../harness-strategy/`.

This folder exists because the plan had grown sideways: product definition,
architecture, UX and delivery were mixed across twenty files. The split is now:

| Folder | Answers | Authority |
| --- | --- | --- |
| `../FoundationOS.md` | What is it, who is it for, what does it do | **Product source of truth** |
| `foundationos/` (here) | How is it built, what is on disk, who may do what, what each screen does | Architecture + UX |
| `../harness-strategy/` | What gets built first, how it is typed and tested | Delivery |

## The one rule

> **The tree is the truth. Everything else — the index, the board, the inbox,
> the UI, Edge's memory — is a derived view that can be deleted and rebuilt.**

Every design question gets the same test: *if the interface vanished, would
the work still be there?* If the answer is no, the design is wrong.

## Read in this order

| # | File | Answers |
| --- | --- | --- |
| 1 | [`../FoundationOS.md`](../FoundationOS.md) | What FoundationOS is, the user story, the cast, the layers, the features |
| 2 | [`glossary.md`](glossary.md) | Every noun, one line each |
| 3 | [`architecture/01-tree.md`](architecture/01-tree.md) | What is on disk, and why the tree wins |
| 4 | [`architecture/02-store.md`](architecture/02-store.md) | How writes stay safe with no database transactions |
| 5 | [`architecture/03-identity.md`](architecture/03-identity.md) | Accounts, sessions, roles, grants, invites, the 404 rule |
| 6 | [`architecture/04-projects.md`](architecture/04-projects.md) | The project umbrella, the channel-as-lobby, sharing, catalog |
| 7 | [`architecture/05-agents.md`](architecture/05-agents.md) | Principals, worktrees, delegation, Edge, agent messaging |
| 8 | [`surfaces/01-first-run.md`](surfaces/01-first-run.md) | Setup, login, join-by-invite |
| 9 | [`surfaces/02-shell.md`](surfaces/02-shell.md) | Home, rail, cards, empty states |
| 10 | [`surfaces/03-workshop.md`](surfaces/03-workshop.md) | The embedded harness pane |
| 11 | [`surfaces/04-intake.md`](surfaces/04-intake.md) | The three doors and triage |
| 12 | [`surfaces/05-channels.md`](surfaces/05-channels.md) | DMs, project channels, agent messages |
| 13 | [`surfaces/06-catalog.md`](surfaces/06-catalog.md) | Submit, review, install |
| 14 | [`../harness-strategy/07-work-items.md`](../harness-strategy/07-work-items.md) | The ordered queue |
| 15 | [`../harness-strategy/01-decision-log.md`](../harness-strategy/01-decision-log.md) | Why each choice was made |

## The shape, in one diagram

```
Server (one PC, one origin)
├── Accounts          owner / admin / member
│   ├── Personal workspace      a filter, not a folder
│   │   └── Projects            kind: app | folder | board
│   │       ├── Members + roles owner / admin / member / viewer
│   │       ├── Channel         the lobby; membership = access
│   │       ├── Board           typed work items
│   │       └── Resources       repo | files | workshop
│   ├── Friendships             social only; grants nothing
│   └── Conversations           DM | project channel
├── Agents            principals bounded by their owner's role
└── Catalog           approved app snapshots, installed as copies
```

## Status vocabulary

| Word | Means |
| --- | --- |
| **DECIDED** | Written in the decision log with a date. Build against it. |
| **LEAN** | A direction we prefer, not locked. Say so in the UI or docs. |
| **EXPLORING** | A real option under discussion. Do not build on it yet. |
| **LATER** | Deliberately after v1. |

## What changed on 25 November 2026

Eight decisions landed after the first draft of the product file:

- **D16** — the project umbrella: `Project { kind: app | folder | board }`.
- **D17** — admin privacy is policy + audit, not E2E.
- **D18** — the channel is the lobby: channel membership *is* project access,
  and a member may invite at or below their own role.
- **D19** — messaging ships both modes: draft/approve and trusted auto-send.
- **D20** — one PC origin, two clients (web shell, downloadable interface).
- **D21** — first-run: setup, login, join-by-invite.
- **D22** — the tree is the truth; the index is a rebuildable cache.
- **D23** — Edge is an optional principal, not a dependency.

`FoundationOS.md` was rewritten to v0.2 to match. The decision log is still the
single record; this folder never restates a decision without linking it.

## Conventions

- Every file opens with a **status line** and ends with **open questions**.
- Decisions are cited as `D16`, never re-argued in place.
- Anything visual cites the Interface Standards by section
  (`§1.1` fixed viewport, `§2.1` input in use, `§2.2` readable state).
- If a doc and `FoundationOS.md` disagree about *what the product is*, the
  product file wins and the doc gets fixed.
- If a doc and the decision log disagree about *what was chosen*, the log wins.

## Where the old detail lives

`../harness-strategy/` keeps the deep material: the harness decision (`16`),
memory (`11`), the agent protocol (`10`), notifications (`18`), versioning
(`14`), Cloudflare (`15`), the triage guide (`09`) and the effort rubric
(`12`). Those files are still authoritative for their subjects; this folder
does not duplicate them.
