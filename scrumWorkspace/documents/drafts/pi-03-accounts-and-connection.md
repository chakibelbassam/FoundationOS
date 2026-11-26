---
revision: 3
---
# PI-3 (Accounts and connection) · v0.3 user journeys

## Owner decisions

Username and password is the normal v0.3 sign-in experience. The v0.2 client uses a pasted session token. The v0.1 server already has stable account IDs, roles, account keys, revocable sessions, one-time invitations and private homes. The owner approved a local browser link from the server control, browser sign-in that survives refresh, optional email, and recovery from the server machine after losing both owner credentials. The journeys below are proposed designs. The product increment remains in planning.

**Release story.** I start my server, open FoundationOS, sign in and land in my own workspace. When I open a private file link while signed out, I can return to that file after signing in to the right account. I can invite a member to the same server and they get a private Home of their own. I can recover access after forgetting my password and keep my files and settings.

[Roadmap](../../../planning/Roadmap.md) · [Product vision](../../../Product%20Information/FoundationOS%20Product%20Vision.md) · [v0.1 contract](../../../versions/0.1%20FoundationOS/FoundationOS%20Server/openapi.yaml) · [v0.2 connection flow](../../../versions/0.2%20FoundationOS/README.md)

## First run and upgrading an existing installation

### A fresh server

1. Start FoundationOS Server and click **Open FoundationOS**. Open the paired local client in a browser tab. If the client is stopped, offer to start it, then open the URL it binds.
2. An empty account store opens **Create the administrator account**. The local operator action issues a short-lived, one-use setup claim. Enter a username, password and optional email.
3. Successful signup consumes the claim, signs in the owner and shows a recovery code to save. Concurrent setup tabs converge on one administrator. If the response is lost, recheck the server and offer Sign in if setup succeeded. The operator can renew an expired claim while the store is empty.
4. Once the owner exists, **Open FoundationOS** takes a signed-out user to **Sign in** and a signed-in user directly into their workspace. Existing installations can also use the enrollment flow below.

**Email.** Optional at first-owner signup, member signup or in Settings → Account. Store it on the account in the server's SQLite store and label it unverified until email verification ships. Email delivery, Google sign-in and email-based password recovery are future capabilities. Sign in uses the username.

### An existing server

- A server with an owner already provisioned opens **Sign in** with a **Set a password for your existing account** option for legacy accounts.
- Proposed upgrade path: present the existing account key once to bind a password to that same account. Verify it on the server before enabling password enrollment. Preserve the account ID, role, home and member-keyed preferences. Record what happens to the key and existing sessions at cutover. The authorized local maintenance path can enroll a password for the legacy owner who has lost the old key. Verify the identity, home and preferences carry forward.
- Test fresh setup and upgrade on disposable stores. Keep launcher control separate. Put new credential, invitation and recovery capabilities in the v0.3 server target, document the supported client/server pair, and test a preserved copy of a v0.1 store before proposing the owner upgrade.

## Sign in, refresh and sign out

- Use a **Sign in** screen with server identity, username, password, show/hide password, and **Need help signing in?**. The main sign-in action submits credentials to the paired server. The server validates them using the local SQLite account store. Support paste, password managers and keyboard submission. Use plain feedback for invalid credentials and distinct recovery for an offline or incompatible server. Keep passwords and bearer tokens out of routes, browser storage, logs, and evidence.
- Sign in to an authenticated Home. Restore an internal deep link only after the server authorizes the route for the signed-in member. If it belongs to a different member or no longer exists, offer that member's Home without disclosing the previous workspace.
- **Refresh acceptance:** refresh Home or a private route and stay signed in while the session is valid. Check the session before drawing private UI and then restore the authorized page. Keep the route during brief outages and offer Retry. Expired or revoked sessions return to Sign in and clear private state.
- **Proposed design:** use an opaque HttpOnly app session cookie, with the client host holding the server credential and the server owning revocation. Bind the session to the paired installation and verify that separate local clients stay isolated, since cookies do not isolate by port. Validate cookie settings for the supported local transport and guard state-changing requests against cross-site submission. [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) · [Cookie port scope](https://www.rfc-editor.org/rfc/rfc6265.html#section-8.5)
- Sign out ends that session across the tabs sharing it, clears private data from the view, and returns to Sign in. If the server cannot confirm revocation, clear local access immediately and report that server-side sign-out was unconfirmed. Password recovery revokes all sessions for the recovered account.
- Passwords are stored as salted, slow hashes. Proposed baseline is a minimum of 15 characters for sign-in with password alone, support for long passphrases and password managers, no arbitrary symbol rules, checks against known weak passwords and rate limits on authentication attempts. [NIST password guidance](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)

## Account forms

Start with the official MUI v6 Sign-in and Sign-up templates, matching the current client. Adapt one FoundationOS layout for Sign in, Create the administrator account, Join by invitation and Reset password. Support browser autofill, keyboard submission, narrow layouts and form errors. Reuse the FoundationOS theme. React Bits can supply a background if needed. [MUI v6 templates](https://v6.mui.com/material-ui/getting-started/templates/) · [React Bits catalog](https://reactbits.dev/get-started/index)

## Invite someone to this server

**Owner.** In **Settings → Accounts**, choose **Invite member**. FoundationOS creates a one-time invitation valid for a limited time. The owner copies it and shares it directly. The panel shows pending, used, expired and revoked states, with **Revoke** for pending invitations. Suggested initial expiry is 24 hours.

**Member.** Open the FoundationOS client for the intended server, choose **Join by invitation**, enter the invite code, then choose a username, password and optional email. A second screen confirms the server before account creation. On success, enter the new private Home. A username already in use leaves the invite available so a different name can be chosen. Expired, used or revoked invitations explain how to ask the owner for a fresh one.

**Connectivity.** A loopback link only reaches a client running on the same machine, and the launcher can choose a different port next time. Start with a pasteable invite code scoped to the server selected in the client. Shareable invitation links can follow when there is a stable, reachable address. v0.3 first proves the two-member flow on one local server.

**Server.** Account creation, home assignment and single-use redemption must behave as one operation from the user's point of view. A failed signup leaves a consistent result and clear recovery. A server invite grants membership and an independent home. Shared-project invitations belong to the later collaboration increment.

## Password change and recovery

**Change a known password.** In **Settings → Account**, confirm the current password and set a new one. Revoke existing sessions and ask the user to sign in again. Keep the account ID, files and preferences.

### Owner with a saved recovery code

1. At **Sign in → Need help signing in?**, choose **Use owner recovery code**. Confirm the server and provide the owner username, saved code and a new password.
2. The server validates and consumes the code after a successful reset. The reset invalidates prior sessions and outstanding recovery credentials for that account. Sign in normally with the new password to save a replacement recovery code.

### Owner who lost both the password and the recovery code

1. Go to the machine running FoundationOS Server. Use the operating-system account authorized to operate that FoundationOS store. Stop the running server through its normal control before opening **Recover owner** in the local server maintenance app or console. This is a proposed control label and operator flow.
2. Select or confirm the existing installation and data store. Show the existing owner username and ask the operator to confirm that account before accepting a new password through a hidden input. This local flow resets the existing owner account. It is scoped to that store and requires exclusive maintenance access. The server does not expose this operation as a browser or remote API action.
3. The maintenance operation commits the new password and revokes the owner's active sessions and outstanding reset and recovery codes. It issues a fresh recovery code for the operator to save. The existing owner ID, private home and preferences carry forward. Record the event without any credentials.
4. Start the server again and open FoundationOS. Sign in as the same owner with the new password. If the maintenance operation fails, report the reason while preserving the previous state. If the wrong installation is selected, return to store selection before committing the reset.

### Member who forgot their password

1. From **Sign in → Need help signing in?**, the member selects **Ask your server owner**. FoundationOS identifies the server without revealing whether a supplied username exists.
2. The owner confirms the member's identity through a known contact channel. After signing in as administrator, the owner opens **Settings → Accounts**, selects that member and issues a short-lived, one-time reset code. Suggested first expiry is 30 minutes. The owner shares the code privately and can revoke or replace it.
3. The member opens **Reset password** on that server, enters the code and chooses a new password. The owner never sees the password. The server consumes the code, invalidates previous sessions and sends the member to ordinary sign-in. They return to the same account and workspace. If the code expired or was revoked, they ask the owner for a fresh one.

Recovery codes and reset codes are scoped to one server, account and purpose. Store protected representations and rate-limit attempts. A lost server connection offers **Retry** first. Recovery starts when the selected server can be reached. [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

## Local release and later online access

**Proposed v0.3 boundary:** one local FoundationOS Server with a local SQLite store, username and password, first-owner setup through a local browser link, member invitations, and owner and member recovery. A signed-out visit to the main client page opens **Sign in** after the first account exists. **Create administrator** is fresh-store setup. **Join by invitation** is member signup. Each server verifies the requested username and password against its own account store. The client is already paired with that server.

**v0.5 on the current roadmap:** authorized remote access and security/deployment work. A useful first online test is one FoundationOS server at a protected hostname, with HTTPS, access boundaries and recovery verified. Cloudflare Tunnel can connect a hostname to a selected server and can support private routes. It provides reachability. [Roadmap](../../../planning/Roadmap.md) · [Cloudflare Tunnel fundamentals](https://developers.cloudflare.com/tunnel/concepts/)

**Future shared entry point:** the vision for os.subsolutions.dev is one place to enter FoundationOS and reach the server you belong to. Treat multi-server routing as a separate design decision. Usernames are local to each server, so Bob's and Alice's servers can each have an account with the same name. A first design could select a server via a verified invite, workspace address or remembered choice. If the product later chooses central sign-in, map a verified identity to server memberships at the shared entry point and let the destination server independently verify the issued sign-in proof and its own membership. Keep each server's account passwords with that server. Cloudflare or a managed identity provider can be evaluated when this scope is planned.

## Proposed delivery and acceptance

1. Build password sign-in, sign-out and return to Home with a seeded member. Verify refresh on Home and a private file, reopening the local link with a valid session, revocation and isolation between client instances.
2. Deliver owner setup and enrollment for existing accounts. Verify the server link opens the paired local client, first setup and sign-in resolve correctly, and an example upgrade preserves both private homes and preferences.
3. Deliver invitation creation, redemption, expiry and revocation. Exercise two members on one real local server in separate browser contexts and test reconnect and switching.
4. Deliver password change, member reset, owner recovery code and local owner maintenance recovery. Verify a locked-out owner regains the same workspace after a restart. Run the complete cold-start, upgrade, two-member, restart and recovery journeys through the actual launchers. Confirm each member keeps their own files, projects, apps and preferences throughout.

## Decisions still open

- **Session lifetime.** Refresh persistence is decided. Choose session expiry and whether sign-in should survive browser close or a full client-host restart.
- **Existing accounts.** Confirm that v0.1 stores with real user data are an upgrade acceptance target. Recommend preserving existing identities and documenting recovery before migration.
