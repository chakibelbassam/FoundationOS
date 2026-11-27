---
revision: 1
---
# PI-3 session and account lifecycle policy · 27 November 2026

This is the decision table for **WI-055**. It turns the [owner decisions](owner-decisions.md) into values that contract tests can assert. Where a value changes, update this table and the tests together.

## Version and store boundary

| Rule | Value |
|---|---|
| Supported pair | Client 0.3 with server 0.3 |
| Supported store | A fresh schema 3 store only |
| Older store | Refused before the server listens; the message names the supported pair and the data root; the store is not changed |
| Newer store | Refused with the same shape of message |
| Migration | None. v0.1 and v0.2 stores are inputs for building v0.3, not upgrade targets |
| Client/server mismatch | The client shows the expected and found versions and does not offer account forms until the pair matches |

## Session lifetime

| Rule | Value |
|---|---|
| Remember me checked | Persistent cookie; 30 days idle, 180 days absolute |
| Remember me unchecked | Browser-session cookie; 24 hours server-side |
| Sliding | Every authenticated request moves the idle deadline to now + 30 days, capped by the absolute deadline |
| Rotation | A new session identifier is issued at sign-in |
| Server restart | Sessions survive because they live in SQLite |
| Client-host restart | Sessions survive because the cookie is held by the browser |
| Revocation | Password change, recovery, account closure and account-wide sign-out revoke every session for the account |
| Other members | Their sessions are unaffected |

## Cookie and request rules

| Rule | Value |
|---|---|
| Cookie name | Prefix fo_sess_ followed by the installation id, so two loopback ports cannot share a session |
| Flags | HttpOnly, SameSite=Lax, Path=/; no Secure on loopback http |
| Transport | The client host proxies /api/*, forwards the cookie, and returns the server's Set-Cookie |
| State-changing requests | Reject a non-loopback Origin and a Sec-Fetch-Site value other than same-origin or none |
| Secrets | Passwords and session tokens never enter URLs, browser storage, logs, screenshots or the repository |

## Credentials and attempts

| Rule | Value |
|---|---|
| Password hash | Node built-in scrypt, N=16384, r=8, p=1, 16-byte salt, 64-byte key, versioned string |
| Minimum length | 6 characters, with a small common-password and username denylist; no composition rules |
| Invalid feedback | Always "The username or password is not correct." |
| Attempt ladder | 5 failures: wait 1 minute; next 5: 3 minutes; next 5: 5 minutes; next 5: 15 minutes; stay at 15 |
| Reset | A successful sign-in, or 24 quiet hours, clears the counter |
| Invite code | Six digits, 24 hours, single use, server-scoped, owner-only, revocable |
| Member reset code | Six digits, 30 minutes, single use, owner-issued, revocable |
| Owner recovery code | 16 characters in four groups, shown once, digest stored, single use, replaced on use and on password change, no expiry |
| Setup claim | Single use, 15 minutes, issued only while the store has no owner, renewable from the console |

## Accounts and names

| Rule | Value |
|---|---|
| Roles | owner and member; exactly one owner |
| Owner self-deletion | Refused. Ownership transfer is not part of v0.3 |
| Username | Lowercase, 2 to 39 characters, pattern [a-z][a-z0-9_-]{1,38}, case-insensitive unique |
| Reserved | admin, owner, api, status, profile, files, sessions, invitations, accounts, settings, login, signup, setup, recovery, preferences, health, logout, pair, join, reset, avatar |
| Rename | Keeps the account ID, role, home, sessions and preferences; the old name is free for another account after the rename |
| Email | Optional, format-checked, maximum 254 characters, not unique, labelled unverified |
| Introduction | Plain text, maximum 500 characters |
| Picture | PNG or JPEG, maximum 2 MB, maximum 4096 px per side, magic-byte and header check, served from an authenticated route, no SVG |

## Closure, retention and purge

| Rule | Value |
|---|---|
| Who can close | A member closes their own account with the current password and explicit confirmation |
| Immediate effect | Access ends, sessions and codes are revoked, the Home moves to retained storage |
| Username | Reserved for the full 30 days |
| Deadline | 30 days from confirmed closure, stored as retained_until |
| Restore | Local operator only; same account ID and username; fresh password; new recovery code; server stopped or exclusive access |
| At the deadline | Hard delete the account row, retained Home, files, avatar, preferences, sessions, reset codes and invitations used by the account; release the username |
| Purge schedule | At server start and daily while running; a server stopped at the deadline purges on its next start |
| Test clock | FOUNDATIONOS_NOW (ISO timestamp) is a QA-only environment variable |
| Backups | Outside the purge; documented as such |

## Preferences

| Rule | Value |
|---|---|
| Source of truth | Server SQLite, keyed by immutable account ID |
| Client copy | Local cache keyed by account ID for startup and offline display |
| Save | Server first, then cache; last write wins per key |
| Import | The v0.2 local preferences file is imported on first v0.3 sign-in |
| Purge | Removed with the account |

## Verification

The server test file asserts owner setup, sign-in, the attempt ladder, preferences, invitations, isolation, sign-out modes, rename, last-owner protection, self-deletion, username reservation and owner recovery. The client tests assert cookie restore, invalid credentials, setup recovery-code handling, sign-out failure handling, route restoration and the API contract. Browser QA exercises the same journeys through the real launchers.
