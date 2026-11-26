---
revision: 1
---
# 📦 PI-3 (Accounts and connection) · v0.3 increment plan

**Target v0.3** · [Version brief and product folder](../../../versions/0.3%20FoundationOS/README.md) · [PI record](../../increments/PI-03.json)

## Release outcome

I open FoundationOS from my local server, sign in with my username and password, and return to my private workspace even after closing the browser. As the owner, I can invite a member. We each see our own files and settings. If I lose a password I can regain the same account. If I leave a browser signed in elsewhere, I can end every session for my account from the browser I still control.

Deliver a local v0.3 client and server pair. Build on the accepted v0.2 workspace and the v0.1 SQLite identities, roles and private homes. The v0.3 client, host and server changes belong under the v0.3 version folder. Authorized remote access is a v0.5 roadmap outcome. Shared-domain server discovery, email delivery and social sign-in remain future work. [Roadmap](../../../planning/Roadmap.md) · [Product vision](../../../Product%20Information/FoundationOS%20Product%20Vision.md) · [v0.1 API](../../../versions/0.1%20FoundationOS/FoundationOS%20Server/openapi.yaml)

## How people enter FoundationOS

| Starting condition | What happens |
| --- | --- |
| First launch, empty store | The local operator starts the server and selects **Open FoundationOS**. Open the paired client at its actual bound address, offering to start it if needed. A short-lived, single-use local setup claim opens **Create the administrator account**. Enter username, password and optional email, then save the owner recovery code. Two setup tabs can produce only one owner. After an interrupted response, check whether signup succeeded before offering another attempt. |
| Existing installation | Offer **Set a password for your existing account** to a legacy account holder. The intended enrollment proves possession of the existing account key once. Preserve account ID, role, private home and member preferences. An owner who lost the key can use local maintenance. Verify upgrade on a copy of an existing store before recommending it. |
| Returning user | A signed-out visit opens **Sign in** for the paired server. A valid remembered session opens the workspace. Restore an authorized internal deep link after checking the identity. On a change of member, clear private state, discard stale responses and open the new member’s Home. |
| Invited member | The owner chooses **Invite member** in Settings → Accounts, copies a one-use code and shares it directly. The member selects **Join by invitation**, confirms the server, enters the code and chooses a username, password and optional email. Successful redemption creates one account with its own Home. A username collision leaves the invite available. Show pending, used, revoked and expired states and let the owner revoke a pending invite. |

A member joins the selected local server with a pasteable code. A proposed invitation lifetime is 24 hours. Optional email can also be edited in Settings and is labelled unverified. A username identifies an account within its own server.

## Remembering a session and ending access

| Action | Required behaviour |
| --- | --- |
| Refresh or fully close and reopen the browser | In the same browser profile, with both local processes running and a valid session, reopen Home or the authorized private page without entering the password. Check the session before rendering private content. A temporary outage preserves the requested route and offers Retry. Expiry or revocation clears private state and opens Sign in. |
| **Sign out** | End the current session, including tabs that share it. Other independent sessions keep working. If the server cannot confirm the request, clear local access and explain that server revocation is unconfirmed. |
| **Sign out of all sessions** | In **Settings → Account**, an owner or member can end every session for their own account on this server. Confirm that this includes the current browser. Cancel preserves all sessions. On success, the server revokes every existing session for that account, the initiating browser returns to Sign in, and other sessions lose access on their next protected request or reopen. Other members stay signed in. Files, preferences and the password are preserved. |
| Connection breaks during global sign-out | Clear local access after confirmation of intent. Report that the server result is unconfirmed. Give the user a way to sign in again and retry once connected. Show success only after server confirmation. A repeated request must leave the account in a consistent state. |

The server owns credential verification, session expiry and revocation. The proposed design uses an expiring, persistent HttpOnly cookie containing an opaque session identifier. The client host holds the paired server credential. Prove isolation between local installations, including when ports change, since a cookie alone does not isolate ports. Validate cookie settings for the supported transport and protect state-changing requests against cross-site submission. Store passwords as salted, slow hashes and keep secrets out of URLs, browser-accessible storage, logs and QA artifacts. [Session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) · [Cookie port scope](https://www.rfc-editor.org/rfc/rfc6265.html#section-8.5)

## Changing or recovering a password

| Person and starting point | Journey and result |
| --- | --- |
| Signed-in user knows the password | Settings → Account asks for the current and new passwords. After a successful change, revoke prior sessions and sign in again. |
| Owner has the saved recovery code | At Sign in → Need help signing in?, select owner recovery, confirm the server, enter the username and code, and choose a new password. Consume the code, revoke active sessions and outstanding recovery credentials, then sign in and save the replacement code. |
| Owner lost the password and recovery code | On the server machine, the authorized operating-system user stops the server and opens local **Recover owner** maintenance. Confirm the installation, store and existing owner username. Enter the new password in a hidden field. Commit under exclusive access, revoke that owner’s sessions and recovery credentials, issue a fresh recovery code and record the event without secrets. Restart and sign in to the same Home. Failure before commit preserves the previous state. This control is available only from local maintenance. |
| Member forgot the password | The sign-in help page identifies the server and directs the member to its owner. After checking identity out of band, the owner issues a one-use reset code for that member in Settings → Accounts and shares it privately. The member enters the code and a new password. Consume the code, revoke the member’s prior sessions, and sign in to the same workspace. The owner can revoke or replace an unused code. |

Scope protected codes to the server, account where applicable, and purpose. Rate-limit attempts and give generic invalid-credential feedback. Proposed defaults include a 30-minute member reset window and a 15-character minimum for password-only sign-in, with long passphrases, paste, password managers and weak-password checks. [Password guidance](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/) · [Recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

## Account interface

Use the official MUI v6 Sign-in and Sign-up templates as the basis for one FoundationOS layout covering sign-in, administrator signup, invitation and reset. Keep the selected server visible. Use permanent field labels, show/hide password, appropriate autofill and keyboard submission. Show which action is pending, prevent duplicate submissions, and give actionable feedback for expired codes, unavailable servers and incompatible versions. Check desktop and narrow layouts, visible focus, error announcements, reduced motion and readability against the background. Record adopted controls in the interface inventory. [MUI templates](https://v6.mui.com/material-ui/getting-started/templates/) · [Interface inventory](../../../Product%20Information/Interface/Components/README.md)

## Delivery order

1. Run the accepted v0.2 workspace and v0.1 server through their launchers with disposable accounts. Record the version pair, routes, storage, launch steps and existing defects. Decide the migration and session policies below before changes depend on them.
2. Establish the v0.3 contract and implement first-owner setup, legacy enrollment and a complete password sign-in to a private file. Exercise first run and upgrade separately.
3. Complete remembered sessions, authorized route restoration, single-session and all-session sign-out. Verify revocation with independent browser profiles and a second member.
4. Deliver invitation management, password change and both owner and member recovery routes. Check concurrent submissions, single-use codes and interrupted operations on the real store.
5. Polish the account forms and review the code paths that now own sessions, API forwarding, route guards and storage. Remove superseded token-entry UI once the credential flows work. Document the supported version pair, launch commands, data locations, upgrade and recovery. Run independent browser QA and retest fixes on the final candidate. [Client and server working guide](../../../Procedures/working-on-client-and-server.md)

## Release acceptance and evidence

Use the built v0.3 pair, real Windows launchers and disposable stores. Record candidate revision, version pair, browser profiles, steps, observed results, defects and retests. Redact private data and secrets. The release reviewer should be able to repeat these checks.

| Check | Passing observation |
| --- | --- |
| Fresh and upgraded installations | The server link opens the correct client. Competing first-run tabs yield one owner. On a copied legacy store, two existing accounts enroll and keep their IDs, roles, homes and distinct settings. An interrupted migration has a documented recovery. |
| Remembered sign-in | Refresh and full browser close/reopen restore the authorized page with a valid session. An expired or revoked session prompts for credentials. Offline retry and denied or missing deep links give the user a safe next action. |
| Session boundaries | Sign the same account into browser profiles A and B, and a different member into C. Ordinary sign-out in A leaves B and C working. Sign back into A, cancel global sign-out, then confirm it. A returns to Sign in. B loses protected access on its next request and on reopen. C can still open a private file. The original user can sign back in with the same password and find the same files and settings. Exercise a dropped confirmation response. |
| Invitations and recovery | Verify successful redemption, name collision, repeated redemption, expiry and revocation. Exercise password change, member reset, owner code reset and local maintenance recovery. Prior sessions lose access and replacement credentials reach the same private home. |
| Workspace regression and polish | With two members, check Home, Projects, Apps, SVAR File Explorer, file reader, Back and appearance. Switch accounts with a request in flight. Check the account forms with keyboard, autofill, slow responses, narrow layouts and reduced motion. Attach independent browser evidence from the final candidate along with automated results and outstanding limitations. |

## Decisions to settle before implementation

- Select the idle and absolute session lifetimes, whether to offer a shared-browser opt-out, and the expected behaviour after a full client-host or server process restart. Remembering a valid sign-in after the browser closes is required.
- Confirm supported source store versions, backup and rollback steps, and the point at which legacy keys and sessions are retired during enrollment.

[Original planning draft](../drafts/pi-03-accounts-and-connection.md)
