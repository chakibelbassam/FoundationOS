---
revision: 2
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
| **Sign out of all sessions** | In **Settings → Profile → Account**, an owner or member can end every session for their own account on this server. Confirm that this includes the current browser. Cancel preserves all sessions. On success, the server revokes every existing session for that account, the initiating browser returns to Sign in, and other sessions lose access on their next protected request or reopen. Other members stay signed in. Files, preferences and the password are preserved. |
| Connection breaks during global sign-out | Clear local access after confirmation of intent. Report that the server result is unconfirmed. Give the user a way to sign in again and retry once connected. Show success only after server confirmation. A repeated request must leave the account in a consistent state. |

The server owns credential verification, session expiry and revocation. The proposed design uses an expiring, persistent HttpOnly cookie containing an opaque session identifier. The client host holds the paired server credential. Prove isolation between local installations, including when ports change, since a cookie alone does not isolate ports. Validate cookie settings for the supported transport and protect state-changing requests against cross-site submission. Store passwords as salted, slow hashes and keep secrets out of URLs, browser-accessible storage, logs and QA artifacts. [Session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) · [Cookie port scope](https://www.rfc-editor.org/rfc/rfc6265.html#section-8.5)

## Profile settings

The account menu opens **Settings → Profile** for the signed-in user. Show the current username, role and picture together. Group the introduction, optional unverified email and picture under **Profile details**. Group username, password and session controls under **Account**. Put **Delete my account** in a separate section with the consequences visible before confirmation. Owner-only invitation and member-reset controls stay in **Settings → Accounts**.

| Action | What the user can rely on |
| --- | --- |
| Change username | Editing shows whether the name appears available. Save makes the authoritative uniqueness check using the signup rules. On conflict, keep the input and suggest choosing another name. After success the new name appears in the header, signs in and works in recovery. The account ID, role, sessions, files and preferences stay attached to the same person. A reused name never inherits another person’s data. |
| Change password | From Account, confirm the current password, enter the new one and sign back in. Follow the password-change and revocation journey below. |
| Edit introduction or email | Show a labelled plain-text introduction with a visible length limit and a separate optional unverified email. Save, Cancel and clearing a field are explicit. Restore saved values after reopening. The v0.3 surfaces for profile details are the member’s own settings and signed-in header. |
| Change picture | Select a local picture, preview it, then Save, Cancel, replace or remove it. Use initials when no picture is available. Read and write the image under the authenticated account ID. Check actual image type, byte size and decoded dimensions on the server. Keep the previous picture if saving fails. |
| Delete my account | Confirm the signed-in identity with the current password and explain which data goes offline, the recovery deadline and how to contact the operator. Immediately close account access and revoke its sessions and credentials on success. Keep the private Home offline for 30 days from confirmed closure. Show the exact deadline. Return to Sign in. A new account reusing that username cannot claim it. |
| Recover or expire a Home | Proposed procedure: a local authorized operator verifies the former member’s identity, selects the retained account by stable ID and restores it with fresh credentials before the deadline. Handle a reallocated username without overwriting a live account. At the 30-day deadline recovery ends, including while the server is stopped. On its next cleanup run permanently remove only the identified member’s retained data. Persist enough state to resume interrupted cleanup. Document which profile data and preferences follow this policy and how separately managed backups behave. |

Protect the sole owner from self-deletion so an initialized installation retains a recovery authority. Explain this restriction on the Profile page. Ownership transfer is a possible follow-up. Inspect the v0.1 account record, ID-based Home and its profile.json together when migrating or renaming. Include client-host preferences and cached private views in closure and restoration tests.

**Component choices.** Reuse the client’s MUI v6 dependency. Compose Avatar with an accessible upload Button for the picture, multiline TextField with helper text for the introduction and username feedback, and a confirmation Dialog for deletion. Show Cancel first and restore focus when it closes. Use Material Icons with accessible action labels. [Avatar and fallback](https://v6.mui.com/material-ui/react-avatar/) · [File upload Button](https://v6.mui.com/material-ui/react-button/#file-upload) · [TextField](https://v6.mui.com/material-ui/react-text-field/) · [Dialog](https://v6.mui.com/material-ui/react-dialog/)

## Changing or recovering a password

| Person and starting point | Journey and result |
| --- | --- |
| Signed-in user knows the password | Settings → Profile → Account asks for the current and new passwords. After a successful change, revoke prior sessions and sign in again. |
| Owner has the saved recovery code | At Sign in → Need help signing in?, select owner recovery, confirm the server, enter the username and code, and choose a new password. Consume the code, revoke active sessions and outstanding recovery credentials, then sign in and save the replacement code. |
| Owner lost the password and recovery code | On the server machine, the authorized operating-system user stops the server and opens local **Recover owner** maintenance. Confirm the installation, store and existing owner username. Enter the new password in a hidden field. Commit under exclusive access, revoke that owner’s sessions and recovery credentials, issue a fresh recovery code and record the event without secrets. Restart and sign in to the same Home. Failure before commit preserves the previous state. This control is available only from local maintenance. |
| Member forgot the password | The sign-in help page identifies the server and directs the member to its owner. After checking identity out of band, the owner issues a one-use reset code for that member in Settings → Accounts and shares it privately. The member enters the code and a new password. Consume the code, revoke the member’s prior sessions, and sign in to the same workspace. The owner can revoke or replace an unused code. |

Scope protected codes to the server, account where applicable, and purpose. Rate-limit attempts and give generic invalid-credential feedback. Proposed defaults include a 30-minute member reset window and a 15-character minimum for password-only sign-in, with long passphrases, paste, password managers and weak-password checks. [Password guidance](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/) · [Recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

## Account interface

Use the official MUI v6 Sign-in and Sign-up templates as the basis for one FoundationOS layout covering sign-in, administrator signup, invitation and reset. Keep the selected server visible. Use permanent field labels, show/hide password, appropriate autofill and keyboard submission. Show which action is pending, prevent duplicate submissions, and give actionable feedback for expired codes, unavailable servers and incompatible versions. Check desktop and narrow layouts, visible focus, error announcements, reduced motion and readability against the background. Record adopted controls in the interface inventory. [MUI templates](https://v6.mui.com/material-ui/getting-started/templates/) · [Interface inventory](../../../Product%20Information/Interface/Components/README.md)

## Delivery order

Follow the [six ordered sprint buckets](sprint-buckets.md). Each work item records the outcome, its prerequisites, queue position and the evidence needed to close it. Start from the accepted v0.2 baseline and deliver the v0.3 pair under its own version folder. [Client and server working guide](../../../Procedures/working-on-client-and-server.md)

## Release acceptance and evidence

Use the built v0.3 pair, real Windows launchers and disposable stores. Record candidate revision, version pair, browser profiles, steps, observed results, defects and retests. Redact private data and secrets. The release reviewer should be able to repeat these checks.

| Check | Passing observation |
| --- | --- |
| Fresh and upgraded installations | The server link opens the correct client. Competing first-run tabs yield one owner. On a copied legacy store, two existing accounts enroll and keep their IDs, roles, homes and distinct settings. An interrupted migration has a documented recovery. |
| Remembered sign-in | Refresh and full browser close/reopen restore the authorized page with a valid session. An expired or revoked session prompts for credentials. Offline retry and denied or missing deep links give the user a safe next action. |
| Session boundaries | Sign the same account into browser profiles A and B, and a different member into C. Ordinary sign-out in A leaves B and C working. Sign back into A, cancel global sign-out, then confirm it. A returns to Sign in. B loses protected access on its next request and on reopen. C can still open a private file. The original user can sign back in with the same password and find the same files and settings. Exercise a dropped confirmation response. |
| Invitations and recovery | Verify successful redemption, name collision, repeated redemption, expiry and revocation. Exercise password change, member reset, owner code reset and local maintenance recovery. Prior sessions lose access and replacement credentials reach the same private home. |
| Profile and account closure | Rename, change password, edit the introduction, replace and remove a picture. Verify name collisions and persistence on reopen. Close a disposable member, prove old sessions and a reused username cannot reach its Home, recover before 30 days, then test expiry and cleanup on a separate fixture. The sole owner and another member retain access. |
| Workspace regression and polish | With two members, check Home, Projects, Apps, SVAR File Explorer, file reader, Back and appearance. Switch accounts with a request in flight. Check the account forms with keyboard, autofill, slow responses, narrow layouts and reduced motion. Attach independent browser evidence from the final candidate along with automated results and outstanding limitations. |

## Decisions to settle before implementation

- Select the idle and absolute session lifetimes, whether to offer a shared-browser opt-out, and the expected behaviour after a full client-host or server process restart. Remembering a valid sign-in after the browser closes is required.
- Confirm supported source store versions, backup and rollback steps, and the point at which legacy keys and sessions are retired during enrollment.

[Original planning draft](../drafts/pi-03-accounts-and-connection.md)
