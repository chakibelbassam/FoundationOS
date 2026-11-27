# 0.3 FoundationOS — Accounts and connection

Status: in development for PI-3. This folder contains both products: the **0.3 client** and the **0.3 server**. The supported pair is client 0.3 with server 0.3.

## Start

1. Double-click `Start.cmd`. The server prints its status URL and a console menu.
2. On an empty store press **O**. The server opens the paired client and a one-time setup link.
3. Create the owner: choose a username, a password of at least 6 characters and an optional email. Save the 16-character recovery code shown once.
4. On an existing store **O** opens the client at its sign-in page. **R** resets the owner password on this machine. **Q** stops the server.

The client can also be started separately with `Start Client.cmd http://127.0.0.1:<server-port>`. The server keeps its own console.

## Stores and versions

| Item | Location |
|---|---|
| Server store | `%LOCALAPPDATA%\FoundationOS\store` unless `FOUNDATIONOS_DATA` is set |
| Client data | `%LOCALAPPDATA%\FoundationOS\client` unless `--data-dir` is set |
| Private homes | `store\homes\<account-id>\files` |
| Retained homes | `store\retained\<account-id>` for 30 days after closure |

v0.3 opens only a fresh schema 3 store. A v0.1 or v0.2 store is refused with a clear message and is not changed. Start a new data folder for v0.3; the older folders stay as released snapshots.

## Accounts

- **Owner:** exactly one. The owner cannot delete their own account. Ownership transfer is not part of v0.3.
- **Invite a member:** Settings → Accounts → Create invitation. Share the six-digit code privately. It is valid for 24 hours and can be used once.
- **Join:** the member opens Join by invitation, enters the six digits with CodeSlots, then chooses a username, password and optional email.
- **Rename:** Settings → Profile. The account ID, Home, sessions and preferences stay attached.
- **Password:** Settings → Profile → Account. A change ends every session for the account.
- **Username rules:** lowercase, 2 to 39 characters; `admin`, `owner` and the service names are reserved.

## Sessions

- **Remember me** is checked by default. A valid session survives refresh, closing the browser, restarting the device and restarting the client host.
- **Sign out** ends the current session. **Sign out of all sessions** ends every session for the account on this server, including the current browser; other members stay signed in.
- The server owns expiry and revocation. The browser holds an HttpOnly cookie; page scripts and the client host never store the password.

## Recovery

| Situation | What to do |
|---|---|
| Member forgot the password | The owner issues a six-digit reset code in Settings → Accounts. The member uses Recover access → Member reset code. The code lasts 30 minutes and can be used once. |
| Owner has the recovery code | Recover access → Owner recovery code. Enter the username, the 16-character code and a new password. The code is consumed and a new one is shown. |
| Owner lost both | On the server machine press **R** in the server console. Enter the owner username and a new password. The server revokes old sessions and prints a new recovery code. |
| Member closed their account | The Home stays offline for 30 days. The local operator can restore it before the deadline; after the deadline it is permanently deleted and the username is released. |

## Profile

Settings → Profile edits the introduction (500 characters), optional email (unverified), and a PNG or JPEG picture up to 2 MB and 4096 px per side. The picture is stored under the account's private Home and served from an authenticated route. Initials are used when there is no picture.

## Tests

From `FoundationOS Server`:

```powershell
node --test server.test.mjs account-extra.test.mjs
```

From `FoundationOS`:

```powershell
npm test
npm run build
node --test tests/host.test.mjs tests/launcher.test.mjs
```

The server tests use disposable stores and cover setup, sign-in, the attempt ladder, invitations, isolation, sign-out modes, rename, recovery, password change, pictures and the 30-day purge. The client tests cover cookie restore, invalid credentials, setup recovery-code handling, sign-out failure handling, route restoration and the API contract.

## Known limitations

- No remote access, HTTPS, email delivery, social sign-in or ownership transfer. Remote access is v0.5.
- Backups are outside the 30-day purge; a restored backup can contain a retained Home.
- The 30-day value is a constant in v0.3, structured for a later server setting.
- The complete independent browser reports and the final evidence table are linked from PI-3 in Scrum.

## Documents

- [Owner decisions](../../scrumWorkspace/documents/PI-03/owner-decisions.md)
- [Increment plan](../../scrumWorkspace/documents/PI-03/accounts-and-connection-plan.md)
- [Session and retention policy](../../scrumWorkspace/documents/PI-03/session-and-retention-policy.md)
- [Baseline](../../scrumWorkspace/documents/PI-03/baseline.md)
