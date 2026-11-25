# 03 — Identity and access

**Status:** DECIDED (D15, D17, D18, D21) · 25 November 2026

Two role systems, one ceiling rule, one refusal shape. Everything else is
detail.

## 1. Two role systems

**Server roles** govern the machine. **Project roles** govern shared work.
They never substitute for each other.

| Server role | Can | Cannot |
| --- | --- | --- |
| **Owner** (exactly one) | Everything: promote admins, restore backups, kill the server, transfer ownership | — |
| **Admin** | Create/suspend accounts, server invites, quotas, catalog review, see audit | Open a private project, read a DM, act as a project member |
| **Member** | Create projects, befriend people, share work, submit to the catalog | Manage accounts or the server |

| Project role | Can | Cannot |
| --- | --- | --- |
| **Owner** | Everything, including delete and transfer | — |
| **Admin** | Confirm triage, mark Ready/Done, publish, delete items, invite, manage members | Delete or transfer the project |
| **Member** | Create/propose items, claim, work, comment, invite at **or below** their role | Confirm triage, publish, delete |
| **Viewer** | Read everything in the project | Write anything |

## 2. The ceiling rule

> **Nobody can grant a role higher than their own, and no agent can exceed its
> owner.**

- A member may invite a member or a viewer.
- An admin may invite an admin, member or viewer.
- An owner may grant anything.
- An agent's grant is computed as `min(owner's role, requested permission)` at
  creation time and re-checked on every request.
- A role change lowers existing agents' effective authority immediately; it
  does not wait for their grant to expire.

This is what makes D18's "the channel is the lobby" safe: adding someone to the
channel is a grant, so it obeys the same ceiling.

## 3. The 404 rule

> **No access returns 404, not 403.**

For a project, its items, its channel, its workshop and its repo. A stranger
learns that *something* exists only if they are allowed to see it. The one
exception is a signed-in user with a valid grant but an insufficient role —
that is a real `403`, because they already know the project exists.

## 4. Sessions

| Property | Value |
| --- | --- |
| Cookie | `fos_session`, `HttpOnly`, `Secure`, `SameSite=Lax` |
| Lifetime | 30 days, sliding; absolute cap 90 days |
| Rotation | new id on sign-in and on privilege change |
| Revocation | `sessions/<id>.json` gets `revokedAt`; checked on every request |
| Multiple sessions | allowed; the settings page lists device, last seen, revoke |
| API clients | `fos_pat_…` token, hashed at rest, scoped, expiring, revocable |

The downloadable `FoundationOS-Interface` uses the same token flow as the CLI.
No client gets a bypass.

## 5. Passwords

- **argon2id**, per-user salt, tuned cost.
- Minimum 10 characters, no composition rules, no forced rotation.
- Generic failure message: "Username or password is incorrect." No enumeration.
- Rate limit: 5 attempts per minute per `(ip, username)`, then exponential
  backoff. A successful sign-in clears the counter.
- No email dependency in v1. A forgotten password is reset by an admin who
  generates a **one-time reset link** (same machinery as an invite).
- 2FA is `LATER`; the schema leaves room for `totpSecret` and recovery codes.

## 6. Invites — two kinds, one credential

| | **Server invite** | **Project share** |
| --- | --- | --- |
| Created by | owner / admin | any member+ (≤ own role) |
| Creates | an account | a grant |
| Route | `/join/<token>` | `/s/<token>` |
| Default expiry | 7 days | 7 days |
| Uses | once | once (or direct-to-username, no token) |
| Stored as | `tokenHash`, never plaintext | `tokenHash` |
| Delivery | copy link **or** QR (same token) | copy link **or** QR |

Rules that apply to both:

- One-time: the second redemption fails with "this invite has already been used".
- Revocable at any time; revocation is audited.
- Rate-limited on redemption (5/min/IP) and on creation (20/hour/user).
- The QR encodes the same URL as the link; there is no second secret.
- Redeeming while signed in as a different user offers "switch account", never
  a silent merge.

## 7. First run

- A server with **zero accounts** serves `/setup` and nothing else. Every other
  route redirects there.
- Setup creates the **owner**, their personal workspace, and the server policy.
  It is a single transaction; a failure leaves zero accounts and setup open.
- Once an owner exists, `/setup` returns **404**. Recovery is a CLI command
  (`fos reset-owner`), not a web route.
- Open registration is **off** by default. Accounts arrive by server invite or
  by an admin creating one. `server.json: allowOpenSignup` exists but defaults
  to `false` and is an owner-only setting.

## 8. Audit

`audit/YYYY-MM.jsonl`, append-only, one event per line:

```json
{ "at": "...", "actor": "user:01J...", "action": "invite.create",
  "target": "invite:01J...", "projectId": null, "ip": "...", "result": "ok" }
```

- Sign-in, sign-out, failed sign-in, invite create/redeem/revoke, role change,
  member add/remove, project create/delete, publish, admin action.
- The **affected user** can see every row that names them.
- The admin console shows admin actions; it does not show project content.

## 9. Admin privacy (D17)

Policy + audit, stated plainly:

- An admin can suspend an account, reset a password, see storage and project
  **counts**, and review catalog submissions.
- An admin **cannot** open a project, read a channel, read a DM or browse a
  repo. There is no "view as user" in v1.
- Break-glass, if ever added, requires a reason, an audit row, and a notice to
  the affected user. It is not a checkbox.
- Honest caveat, repeated in the UI: whoever controls the filesystem can read
  the data. This is policy, not cryptography. E2E is `LATER` and would cost
  search and agent access.

## 10. Agents as principals

```json
{
  "agentId": "01J...",
  "ownerUserId": "01J...",
  "projectId": "01J...",
  "permissions": ["read", "propose"],
  "expiresAt": "..."
}
```

- Agents authenticate with a **grant token**, never a human session.
- Default lifetime 8 hours; revoked on server restart or by the owner.
- An agent is listed in `grants.json` like a person, displayed as
  "Alice's builder (agent)".
- An agent cannot invite, cannot change roles, cannot publish, cannot delete.
- A viewer's agent is read-only. A member's agent can propose, not confirm.

## 11. Open questions

1. Does an admin see project **names**, or only counts? (Lean: counts and sizes
   only — names leak more than they help.)
2. Session lifetime 30 days, or 7 for admins? (Lean: 7 for admins.)
3. Should a project share be redeemable by a username without a link? (Lean:
   yes — a direct grant, audited, no token to leak.)
4. Do we need a "guest" account that can only view one project? (Lean: no;
   viewer role covers it.)
