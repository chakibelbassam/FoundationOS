---
revision: 1
---
# PI-3 owner decisions · 26 November 2026

These decisions were recorded while **PI-3 (Accounts and connection)** is still proposed. They supersede older wording in the [increment plan](accounts-and-connection-plan.md), the [sprint buckets](sprint-buckets.md) and the goal file. The record revision that applies them is listed under **Consequences for the records**.

## Version model

- Every FoundationOS version folder contains both products: the client and the server. For v0.3, copy the accepted v0.2 client and the v0.1 server into versions/0.3 FoundationOS, bump both to 0.3, and work only there.
- The supported pair is **client 0.3 with server 0.3**. A client refuses any other server version; a server refuses any older store.
- **No legacy support.** v0.3 opens only a fresh v0.3 store. A v0.1 or v0.2 store is refused with a clear message and left untouched. There is no upgrade, no key enrollment and no older-schema path. Older versions are inputs for building v0.3, not supported targets.
- v0.1 and v0.2 remain released and unchanged. Their records are historical.

## Sessions and credentials

- The browser cookie carries the **server session token** in an HttpOnly, SameSite=Lax, Path=/ cookie. The client host proxies it; the server owns verification, expiry and revocation. The host is not a second session store.
- The cookie is bound to one installation, because cookies ignore ports. Use a per-installation cookie name or an installation identifier in the opaque value so two 127.0.0.1 ports never share a session.
- **Remember me** is a checkbox, checked by default. Checked issues a persistent cookie; unchecked issues a browser-session cookie that still survives a client-host restart while the browser stays open.
- A valid remembered session survives browser close, device restart and client-host restart. Revocation wins on the next protected request or reopen.
- Adopted lifetimes: 30 days idle and 180 days absolute, sliding on use. Change these before implementation if they are wrong.
- Rotate the session identifier at sign-in. Password change, recovery and closure revoke every session for the account.
- Passwords use Node built-in scrypt with a per-account salt and a versioned hash string. Compare in constant time.
- Minimum password length is **6 characters**, with a small common-password and username denylist and no composition rules. This is acceptable for a local-only v0.3 and must be revisited before v0.5 exposes the server remotely.
- Rate limits: 5 failures, then 1 minute; 5 more, then 3 minutes; 5 more, then 5 minutes; 5 more, then 15 minutes; stay at 15 minutes for further failures. Reset after a successful sign-in or 24 quiet hours. Feedback stays generic.
- Owner recovery code: **16 characters** (four groups of four), shown once, stored as a digest, single-use, replaced on use and on password change, no expiry. Local maintenance is the fallback if it is lost.
- Setup claim: single-use, 15 minutes, issued only while the store is empty, renewable from the server console.
- Invite code: **six digits**, single-use, 24 hours, server-scoped, owner-only, revocable. Redemption is rate-limited.
- Member reset code: **six digits**, single-use, 30 minutes, owner-issued, revocable.

## First run and control

- The server console is the control surface: O opens FoundationOS, R recovers the owner, Q quits.
- O starts the paired client if it is not running and opens the browser at the address it bound. R runs local owner recovery with the server stopped or under exclusive access. No second web login.
- The client pairs with the server once at launch and the server remembers its address. One paired client per server; a short pick list if more.
- An empty store does not auto-create an administrator and does not print an account key. It offers a setup claim and **Create the owner**.
- Exactly one owner. No ownership transfer in v0.3. The owner cannot delete their own account.
- Reserved usernames: admin, owner, api, status, profile, files, sessions, invitations, accounts, settings, login, signup. Nobody may choose them, including the owner.
- Username rules: lowercase, 2 to 39 characters, pattern [a-z][a-z0-9_-]{1,38}, case-insensitive uniqueness. The first owner chooses freely except reserved names.
- The technical role value becomes owner; the interface label is Owner.

## Profile

- SQLite is authoritative. Delete profile.json and never recreate it.
- Username, role, optional unverified email, introduction and avatar reference live in SQLite. The avatar file lives beside the home, outside files/, so it never appears in the file browser.
- Introduction: plain text, 500 characters, newlines allowed, empty clears it.
- Email: optional, format-checked, maximum 254 characters, not unique, labelled unverified, empty clears it.
- Avatar: PNG or JPEG only, maximum 2 MB, maximum 4096 px per side, checked by magic bytes and header dimensions, served from an authenticated route. No SVG. No server-side resizing in v0.3; CSS sizes it. Initials fallback from the username.
- Only the signed-in member edits their own profile. Rename keeps the account ID, role, sessions, home and preferences, and updates the header.

## Closure and retention

- A member closes their own account with the current password and explicit confirmation. The owner cannot close a member account in v0.3.
- On confirmed closure: revoke sessions, credentials and pending codes; move the private Home to retained storage; keep the username reserved and the account record for exactly 30 days.
- The 30-day period is a constant in v0.3, structured as a policy value so the server app can expose it as a setting later.
- Restore is local and operator-assisted, within the window only. It keeps the same account ID and username, sets fresh credentials and a new recovery code, and requires the server stopped or exclusive access.
- At the deadline: hard delete the account row, retained Home, files, avatar, preferences, sessions and codes. The username becomes available. Nothing is tombstoned.
- Purge runs at server start and daily while running. A server stopped at the deadline purges on its next start.
- The test clock is a documented QA-only environment variable. It is not a product setting.
- Operator backups are outside the purge and are documented as such.

## Preferences

- **Working design, confirm before implementation.** The server is the source of truth in SQLite, keyed by account ID. The client keeps its local file as a cache for startup and offline display.
- On sign-in the client loads from the server and refreshes the cache. On save it writes the server, then the cache. If the cache is newer, it pushes first; otherwise the server wins. Last write wins per key, no merge interface.
- The existing local preferences file is imported on first v0.3 sign-in. Purging an account removes its server-side preferences.

## Invitations

- Owner-only. Six-digit code, 24 hours, single-use, server-scoped, revocable. Show pending, used, revoked and expired states.
- A username collision leaves the invitation valid and the member on the choose-name step. Concurrent redemption has one winner and a clear message for the other.
- Redeeming an invitation creates one account with its own Home.

## Delivery

- Two pull requests. PR 1 covers Sprints 1 to 3. PR 2 covers Sprints 4 to 6 on a branch stacked on PR 1 and retargeted when PR 1 merges. Edge continues immediately after opening PR 1 and does not wait for approval.
- Edge never merges. The owner reviews and merges; tagging happens after acceptance.
- QA uses real Chrome, real Edge and the built-in browser as three independent cookie jars, with disposable profiles. Record which checks each reviewer actually performed, and do the close/reopen test on the jar holding the persistent session.
- The machine must stay awake for unattended runs. If a browser is unavailable, fall back to the built-in browser and record the limitation.
- The Manual, the verified user promise, is updated after owner acceptance, not during implementation.

## Consequences for the records

These edits follow from the decisions above and are applied as the next record revision:

- **PI-03 acceptance**: remove first-run legacy enrollment and the upgrade promise. Say that only a fresh v0.3 store is supported and older stores are refused. Keep recovery, sessions, invitations, profile and retention.
- **WI-060**: repurpose from password enrollment to refusing older stores. Acceptance: point v0.3 at a v0.1 or v0.2 store, get a clear refusal naming the supported pair, start a fresh store, and confirm the older store is untouched.
- **WI-056**: reframe from migrating a copy to creating the versioned v0.3 store. Schema 3, account and credential model, preferences, profile fields, retained state, refusal of older schemas, backup and rollback on a copy of a v0.3 store.
- **WI-055**: remove legacy key retirement and supported source stores. Keep cookie lifetime, restart behaviour, username normalization and the retention, restoration and purge policy table.
- **WI-054**: keep as an observational baseline only. It records how the v0.2 client and v0.1 server behave; it does not migrate data.
- **Sprint-1**: baseline, policies, fresh store, paired launch. No migration rehearsal.
- **Sprint-2**: create the owner and sign in. No enrollment.
- **Release acceptance**: rename the first row to a fresh installation and delete the upgraded-store observation.
- **New item**: sync member preferences through the server (Ef-2), placed after sign-in. It needs its own acceptance, schema and host-wiring coverage.
- **Goal**: Edge/goals/PI-3.md is updated to carry these decisions.

## Still open

- The owner will paste the six-digit React input component. Until then, use a standard MUI numeric input with six boxes, paste support and keyboard navigation.
- Confirm the server-authoritative preferences design before building it.
- Confirm the 30-day idle and 180-day absolute session lifetimes.
