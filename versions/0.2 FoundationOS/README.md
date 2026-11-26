# 0.2 FoundationOS — Client foundation

PI-02 is the increment that builds this folder; its live state is in Scrum. The released backend is [v0.1](../0.1%20FoundationOS/README.md), started separately.

## Release pair

- **Server:** `0.1 FoundationOS Server`, started first from its own launcher. Its console prints the loopback status URL.
- **Client:** this folder. React, TypeScript, Vite and React Router; the built output is served on a free loopback port.

## Defaults

Theme **System** · Surface **Glass** · Density **Comfortable** · Motion **On** · Cursor **Target**.

Each is a per-member choice. Settings persist under the current Windows user's application-data directory and survive a client restart on a different port. Motion stays on when Windows requests reduced motion unless the member chooses Off or Follow system.

## Connect with an existing session

v0.2 uses one active member and an existing session token held in memory.

1. Start the server. On a fresh store its console prints the admin identity and one-time key.
2. Exchange the admin key at `POST /sessions` for an admin session token.
3. Call `POST /invitations` with the admin token for each member.
4. Call `POST /accounts` with the invitation token and `{"name":"<member>"}`; the response holds the member's one-time account key.
5. Exchange each member key at `POST /sessions` for a session token.
6. Launch the client, paste one member's session token at Connect.

The operator helper (delivered with WI-027) reads a key securely and prints only the token; it writes nothing. Account keys, invitation tokens and session tokens never belong in this repository, notes, logs or screenshots. Revoke a leaked session with `DELETE /sessions/{id}`.

## Test data

QA uses disposable stores through `FOUNDATIONOS_DATA` and a client data-directory override, never the owner's real installation.

## Evidence

- QA evidence: `qa/`
- Contributor artifacts: `agents/{role}/{WI-ID}/`

The [PI-2 plan](../../scrumWorkspace/documents/PI-02/client-increment-plan.md) defines the sprint buckets, settings defaults, motion work and release bar.
