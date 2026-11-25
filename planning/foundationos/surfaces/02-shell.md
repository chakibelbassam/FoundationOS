# 02 — Shell and home

**Status:** DECIDED shape (D16, D20) · 25 November 2026

## 1. Layout

```
┌──────────────────────────────────────────────────────────────┐
│  FoundationOS · <server name>      search   inbox(3)  avatar │
├──────────┬───────────────────────────────────────────────────┤
│ Home     │  My projects                    [New project]     │
│ Inbox    │  ┌────────┐ ┌────────┐ ┌────────┐                │
│ Agents   │  │ Weather│ │ Budget │ │ Photos │                │
│ Catalog  │  └────────┘ └────────┘ └────────┘                │
│ Settings │                                                   │
│          │  Shared with me                                    │
│ (Admin)  │  ┌────────┐                                       │
│          │  │ Trip   │                                       │
└──────────┴───────────────────────────────────────────────────┘
```

- The rail stays visible on desktop (≥ 900 px) — the current lean; `06` §10
  still lists it as an open layout question — and collapses to a bottom bar on
  phones. It is the only navigation; no nested sidebars.
- The header holds global actions only: search, inbox, account.
- Content scrolls; the rail and header do not.

## 2. Home

Two sections, never mixed:

| Section | Query | Empty state |
| --- | --- | --- |
| **My projects** | `ownerUserId == me` | "Create your first project" + three kind cards |
| **Shared with me** | grant exists, owner ≠ me | "Nothing shared with you yet. A teammate can share a project, or you can join with a link." |

A project card shows:

- kind icon (`app` / `folder` / `board`);
- name and one-line description;
- **your role** as a chip (`owner`, `admin`, `member`, `viewer`);
- member count (people + agents, shown as `4 · 1 agent`);
- last activity, relative;
- a **job status pill** when something is running: `working`, `waiting`,
  `review`, `failed`.

The card is a link to the project's board. The pill is a status, not a button;
clicking it opens the job, not the workshop.

## 3. Creating a project

One dialog, three choices, then a name:

```
[ App ]      code, workshop, App Studio
[ Folder ]   documents and files
[ Board ]    work items only
```

- App: creates the folder, `git init`, one commit, a manifest, a board and a
  channel.
- Folder: creates `files/`, a board and a channel.
- Board: creates a board and a channel.
- The creator becomes `owner`. The channel is created with them in it (D18).
- No template gallery in v1; that is the catalog's job later.

## 4. Rail

| Item | Shows | Badge |
| --- | --- | --- |
| Home | Projects | — |
| Inbox | Notifications, grouped by project | unread count |
| Agents | Registry: your agents, their grants, their jobs | running count |
| Catalog | Approved apps, submit, review (admin) | review count for admins |
| Settings | Profile, security, notifications, appearance | — |
| Admin | Accounts, invites, quotas, audit (admins only) | — |

The badge is a count, not a colour-only signal. It is announced when it
changes, politely, and never steals focus.

## 5. Search

- **Exact-match username** lookup (`@bob`) — no directory, no suggestions.
- Project search by name, scoped to what you can access.
- Item search by id, title, status.
- Results are grouped by type; `Enter` opens the first result; `Esc` closes.

## 6. Empty, loading and unavailable

| State | Design |
| --- | --- |
| Loading | Skeleton cards matching the real card size; no spinner-only screen |
| Empty | One sentence of what belongs here + one primary action |
| No results | "No projects match \u201cweather\u201d" + clear search |
| Server unreachable | Full-page "Can't reach the server" with retry and the last successful sync time; no cached write is offered |
| Degraded (Edge offline) | A quiet banner: "Edge is offline. You can still browse, file and triage." Never a modal |

## 7. Mobile

- Rail becomes a bottom bar with five items; Admin lives under Settings.
- Cards stack full-width; the role chip and job pill stay visible.
- The header collapses search into an icon; inbox stays.
- No horizontal scroll at 320 px; tap targets ≥ 44 px.
- A phone can read the inbox, approve, file an item and see job status without
  opening a workshop.

## 8. Standards

- Selected tile keeps its slot; opening a project does not reflow the grid
  (§1.2).
- Detail opens in its own space, not on top of the list (§1.3).
- Focus returns to the card that opened a project when you come back (§2.1).
- State is readable as text, not colour alone (§2.2).
- Settings changes preview before saving (§2.3).

## 9. Acceptance

1. A new account sees two empty sections with distinct actions.
2. A shared project appears under "Shared with me" with the correct role chip.
3. Removing a grant makes the card disappear without a reload.
4. A running job shows `working` on the card; closing the tab does not change
   it.
5. Keyboard: rail → content → card → project, with visible focus throughout.
6. 320 px wide: no horizontal scroll, all actions reachable.

## 10. Open questions

1. Should "Shared with me" include projects where you are `viewer`? (Lean: yes,
   with the chip.)
2. Do archived projects get a separate section, or a filter? (Lean: filter.)
3. Is the job pill per project or per user? (Lean: per project — it is the
   project's work, not yours.)
