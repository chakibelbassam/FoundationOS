---
revision: 1
---
# 📦 PI-3 (Accounts and connection) · v0.3 sprint buckets

**Planning baseline** · Six sprints in delivery order. Each item links to its live Scrum record with prerequisites and verification steps. The grades express priority and relative effort. Use the Scrum records for current status. [Increment plan](accounts-and-connection-plan.md)

## 🏁 Sprint-1 (Establish the account foundation)

**Target v0.3** · 💭 Proposed · [Sprint record](../../sprints/S-03-1.json)

Record the accepted baseline and policy choices, exercise rollback on a copied store, and launch the v0.3 pair independently on loopback.

| Work item | Type | Status | Priority | Effort |
|---|---|---|---|---|
| ☐ [WorkItem-54 (Capture the accepted workspace baseline)](../../work-items/WI-054.json) | ⚙️ Enabler | 💭 Proposed | 🔴 P-1 | 🟡 Ef-2 |
| ☐ [WorkItem-55 (Set the session and account lifecycle policies)](../../work-items/WI-055.json) | ⚙️ Enabler | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |
| ☐ [WorkItem-56 (Migrate a copy of the account store)](../../work-items/WI-056.json) | ⚙️ Enabler | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |
| ☐ [WorkItem-57 (Launch the paired v0.3 client and server)](../../work-items/WI-057.json) | ⚙️ Enabler | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |

0 of 4 completed at planning.

## 🏁 Sprint-2 (Create accounts and sign in)

**Target v0.3** · 💭 Proposed · [Sprint record](../../sprints/S-03-2.json)

Create one owner on an empty store, enroll legacy users and sign in to an authorized private file through the MUI account screens.

| Work item | Type | Status | Priority | Effort |
|---|---|---|---|---|
| ☐ [WorkItem-58 (Build the shared MUI account forms)](../../work-items/WI-058.json) | ⚙️ Enabler | 💭 Proposed | 🔴 P-1 | 🟡 Ef-2 |
| ☐ [WorkItem-59 (Create the first owner from the server link)](../../work-items/WI-059.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |
| ☐ [WorkItem-60 (Enroll existing accounts with a password)](../../work-items/WI-060.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |
| ☐ [WorkItem-61 (Sign in and open a private file)](../../work-items/WI-061.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |

0 of 4 completed at planning.

## 🏁 Sprint-3 (Remember sessions and invite members)

**Target v0.3** · 💭 Proposed · [Sprint record](../../sprints/S-03-3.json)

Restore a valid browser session, prove account isolation across tabs and browser profiles, and invite a new member to a private Home.

| Work item | Type | Status | Priority | Effort |
|---|---|---|---|---|
| ☐ [WorkItem-62 (Remember a valid session after browser close)](../../work-items/WI-062.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |
| ☐ [WorkItem-63 (Restore authorized routes on reconnect)](../../work-items/WI-063.json) | 🔧 Enhancement | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |
| ☐ [WorkItem-64 (End one session or all my sessions)](../../work-items/WI-064.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |
| ☐ [WorkItem-65 (Invite and enroll a member)](../../work-items/WI-065.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |

0 of 4 completed at planning.

## 🏁 Sprint-4 (Recover access to the same account)

**Target v0.3** · 💭 Proposed · [Sprint record](../../sprints/S-03-4.json)

Prove password change and the distinct member, owner-code and local operator recovery paths preserve account identity and revoke old sessions.

| Work item | Type | Status | Priority | Effort |
|---|---|---|---|---|
| ☐ [WorkItem-66 (Change my password from Profile)](../../work-items/WI-066.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟡 Ef-2 |
| ☐ [WorkItem-67 (Reset a member password by one-use code)](../../work-items/WI-067.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |
| ☐ [WorkItem-68 (Recover the owner using the saved code)](../../work-items/WI-068.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |
| ☐ [WorkItem-69 (Recover the owner on the server machine)](../../work-items/WI-069.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |

0 of 4 completed at planning.

## 🏁 Sprint-5 (Manage my profile and close my account)

**Target v0.3** · 💭 Proposed · [Sprint record](../../sprints/S-03-5.json)

Rename the current account, edit its introduction and photo, and exercise self-deletion with an offline, 30-day private Home and last-owner protection.

| Work item | Type | Status | Priority | Effort |
|---|---|---|---|---|
| ☐ [WorkItem-70 (Rename my account without moving my workspace)](../../work-items/WI-070.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |
| ☐ [WorkItem-71 (Close my account and take its Home offline)](../../work-items/WI-071.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |
| ☐ [WorkItem-72 (Recover or expire a retained private Home)](../../work-items/WI-072.json) | ✨ Feature | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |
| ☐ [WorkItem-73 (Edit my introduction and optional email)](../../work-items/WI-073.json) | ✨ Feature | 💭 Proposed | 🟠 P-2 | 🟡 Ef-2 |
| ☐ [WorkItem-74 (Add, replace or remove my profile picture)](../../work-items/WI-074.json) | ✨ Feature | 💭 Proposed | 🟠 P-2 | 🟠 Ef-3 |

0 of 5 completed at planning.

## 🏁 Sprint-6 (Polish the experience and verify the release)

**Target v0.3** · 💭 Proposed · [Sprint record](../../sprints/S-03-6.json)

Deliver a reproducible final candidate with polished account and profile screens, documented operations and two independent browser reports with fixes retested.

| Work item | Type | Status | Priority | Effort |
|---|---|---|---|---|
| ☐ [WorkItem-75 (Polish account and profile interactions)](../../work-items/WI-075.json) | 🔧 Enhancement | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |
| ☐ [WorkItem-76 (Document launch, upgrade and account operations)](../../work-items/WI-076.json) | 🛠️ Task | 💭 Proposed | 🔴 P-1 | 🟡 Ef-2 |
| ☐ [WorkItem-77 (Test the release journeys in the built-in browser)](../../work-items/WI-077.json) | 🛠️ Task | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |
| ☐ [WorkItem-78 (Independently review the release in the browser)](../../work-items/WI-078.json) | 🛠️ Task | 💭 Proposed | 🔴 P-1 | 🟠 Ef-4 |
| ☐ [WorkItem-79 (Fix findings and assemble release evidence)](../../work-items/WI-079.json) | 🛠️ Task | 💭 Proposed | 🔴 P-1 | 🟠 Ef-3 |

0 of 5 completed at planning.
