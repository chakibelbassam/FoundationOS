# FoundationOS 0.3 Server

Status: in development for PI-3 (Accounts and connection).

Run `Start.cmd` from the version folder. The console is the control surface:

- **O** opens the paired 0.3 client, or creates the owner on an empty store.
- **R** recovers the owner from this machine.
- **Q** stops the server.

The server opens only a fresh 0.3 store. A 0.1 or 0.2 store is refused and left untouched. The supported pair is client 0.3 with server 0.3.

Data root: `%LOCALAPPDATA%\FoundationOS\store` unless `FOUNDATIONOS_DATA` is set.

The browser never holds an account key. The server verifies the username and password, issues an HttpOnly session cookie, and owns expiry and revocation. The client host proxies the cookie and never stores the password.
