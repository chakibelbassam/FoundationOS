# PRD — server, social and catalog

**Status:** DRAFT v0.1 · 25 November 2026
**Relationship to `06-prd-draft.md`:** `06` covers the harness, the workshop and
the work store. This PRD covers the **second product layer**: the server as a
shared machine, the people on it, and the catalog. Requirements here use `L`
(server/admin), `M` (social) and `N` (catalog); identity requirements stay in
`06` group `K` and are referenced, not duplicated.

## 1. Goal

Make one FoundationOS server usable by a handful of real people:

- an owner/admin can run the server without reading private work;
- members can find each other, become friends, message, and share a project;
- a project channel is the membership lobby, so collaboration does not need a
  second permission system;
- a reviewed catalog lets a good app reach everyone, as a copy, not a window
  into someone else's project.

## 2. Personas

| Persona | Needs | Must not |
| --- | --- | --- |
| **Owner** | Set up once, manage accounts, restore backups, keep the server alive | Read private projects or DMs by default |
| **Admin** | Create/suspend accounts, invite, review the catalog, read the audit | Act as a member of every project |
| **Member** | Build, file work, befriend, share, publish | Grant above their own role |
| **Viewer** | Read a shared project and its channel | Write anything |
| **Agent** | Act inside a grant, report evidence, draft messages | Impersonate a human, exceed its owner |

## 3. Scope

**In v1:** server roles, admin console, server invites, audit, friends, DMs,
project channels, agent messaging (both modes), blocking/mute, catalog submit /
review / install as a copy, static-only apps.

**Out of v1:** E2E encryption, group DMs, threads, reactions, a global
marketplace, server-side catalog apps without a sandbox, multi-server
federation, billing, SSO, custom roles.

## 4. Requirements — L. Server and admin

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| L1 | Server roles owner/admin/member enforced on every admin route; no client-side-only checks | Must | K1 |
| L2 | Admin console: account list, create, invite, suspend, reset password, last seen | Must | L1 |
| L3 | Admin can generate, list, revoke and audit server invites (link + QR) | Must | K4 |
| L4 | Audit log: every admin and identity action, append-only; the affected user can see rows naming them | Must | L1 |
| L5 | Admin cannot open a project, read a channel/DM or browse a repo; no "view as user" in v1 | Must | L1 |
| L6 | Open registration off by default; owner-only switch with a warning | Must | L1 |
| L7 | Server settings: name, time zone, quiet hours, retention, backup schedule | Should | L1 |
| L8 | Quotas: per-account storage and project count; a clear refusal, not a crash | Should | L2 |
| L9 | Suspend: sessions revoked, agents stopped, data kept; restore is one action | Should | L2 |

## 5. Requirements — M. Social

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| M1 | Friend request by **exact** `@username`; accept, decline, cancel, block. No directory or suggestions | Must | K1 |
| M2 | DMs only between friends; a non-friend composer is disabled with a reason | Must | M1 |
| M3 | Project channel created with the project; member list = grants; add/remove is a grant/revoke with a confirm | Must | K11 |
| M4 | Message kinds: human, agent (always tagged "via Edge"), system (card, not bubble) | Must | M3 |
| M5 | Agent messaging: draft/approve default; auto-send only for trusted contacts and events/templates; system events always | Must | M4 |
| M6 | Blocking a person hides their messages and stops their agents; mute a channel without losing the inbox count | Must | M2 |
| M7 | Unread counts per user per conversation; inbox groups by project | Should | M3 |
| M8 | Privacy statement on every conversation: server-stored, admin cannot read by default, filesystem caveat | Must | M3 |
| M9 | Quiet hours per user (default 22:00–08:00); Sev-1 and job failures break through | Should | M7 |

## 6. Requirements — N. Catalog

| ID | Requirement | Pri | Depends on |
| --- | --- | --- | --- |
| N1 | Submit an app snapshot: manifest, version, permissions, license, screenshots; secrets blocked | Must | W-26b |
| N2 | Review queue with a checklist; approve, reject (reason), request changes | Must | N1 |
| N3 | Install as a new project with its own git history and an upstream link | Must | N2 |
| N4 | Re-review required when permissions change; an installed copy is never silently replaced | Must | N3 |
| N5 | Static-only in v1; a server-side entry point is refused until a sandbox exists | Must | N2 |
| N6 | Unlist without deleting installed copies | Should | N3 |
| N7 | An admin cannot approve their own submission without a second admin or an audited owner override | Should | N2 |

## 7. Phases

| Phase | Contents | Outcome |
| --- | --- | --- |
| **0 — Identity** | K1-K3, K10, K12, L1, L5 | Setup, login, one project, one grant, 404 proven |
| **1 — People** | K4, K11, L2-L4, L6, L7, M1-M3, M7, M8 | Two members, friends, a shared project, a working channel |
| **2 — Conversation** | M4-M6, M9, N1-N5 | Agent messages, blocking, a reviewed and installed app |
| **3 — Polish** | L8, L9, N6, N7 | Quotas, suspension, unlisting, review integrity |

## 8. Success criteria

- A fresh server: setup → owner → two invited members → a shared project,
  without editing a file by hand.
- A member cannot grant above their role; the server refuses even if the UI is
  bypassed.
- An admin cannot open a project or read a DM; the attempt is audited.
- A friend request, a DM and a project share are visibly three different acts.
- Removing someone from a channel revokes their access to the board, files and
  workshop, after a confirm that names the loss.
- An agent message is always tagged; it cannot be sent untagged.
- A catalog app installs as an independent copy; a permission change forces
  re-review.
- A suspended account cannot sign in, and its agents stop.

## 9. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Channel-as-lobby surprises people | Removing from chat removes access | Confirm names the loss; system card in the channel |
| Admin privacy is policy, not crypto | A determined admin reads files | State it plainly; audit admin actions; E2E is a later, explicit trade |
| Exact-match lookup is unusable at scale | People cannot find each other | This is a small server; add a directory only with a privacy decision |
| Catalog approval mistaken for a security audit | Malicious app installed | Static-only in v1; checklist says "governance, not audit" |
| Messaging scope creep | Threads, reactions, groups delay v1 | Explicitly out; quote-reply is enough |
| Social layer built before the workshop works | Nothing to collaborate on | Phase order: identity → workshop → social |

## 10. Open questions

1. Does an admin see project names, or only counts? (Lean: counts.)
2. Is a suspended user's data readable by them after restore? (Lean: yes,
   unchanged.)
3. Can a member delete their own account? (Lean: later; an admin can suspend.)
4. Do we need a report/abuse flow in v1? (Lean: a button that opens a DM to the
   admin, no automated moderation.)
5. Catalog: static-only forever, or a sandbox in Phase 3? (Lean: static in v1,
   decide with a real use case.)

## 11. Traceability

| Group | Decisions |
| --- | --- |
| K (identity, first run, lobby) | D15, D16, D18, D21 |
| L (server/admin) | D15, D17, D21 |
| M (social) | D18, D19 |
| N (catalog) | D16, D17 |
| Store and tree assumptions | D22, D23 |
