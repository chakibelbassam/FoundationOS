# 04 — Projects, sharing and the lobby

**Status:** DECIDED (D16, D18) · 25 November 2026

## 1. One umbrella

```
Project { kind: app | folder | board }
```

| Kind | Holds | Surfaces | v1 rules |
| --- | --- | --- | --- |
| **app** | A git repo, a manifest, a workshop | Board, channel, App Studio, workshop | Full collaboration; worktrees per job |
| **folder** | Files and documents | Board, channel, file browser | Guests read-only, or one writer via check-out |
| **board** | Work items only | Board, channel | No files, no workshop |

Why one object: sharing, permissions, chat, work items and agents all attach to
one unit. Without it we build three permission systems and three invite flows.

The UI may still say "Apps" and "Folders" — that is a filter on `kind`, not a
different model.

## 2. Where a project lives

```
data/projects/<projectId>/        one folder per project, top level
```

**Not** inside a personal folder. A "personal workspace" is a **view**:

- `My projects` = `ownerUserId == me`.
- `Shared with me` = a grant exists and `ownerUserId != me`.

If projects lived under `users/<id>/`, sharing would mean moving the folder —
breaking paths, git remotes, worktrees and every link. The filter costs one
query; the move costs everything.

## 3. Membership is a grant

`projects/<id>/grants.json`:

```json
{
  "user:01JALICE": { "role": "owner",  "addedBy": "user:01JALICE", "addedAt": "..." },
  "user:01JBOB":   { "role": "member", "addedBy": "user:01JALICE", "addedAt": "..." },
  "agent:01JQA":   { "role": "viewer", "addedBy": "user:01JALICE", "addedAt": "..." }
}
```

- Every read and write resolves the caller's grant first.
- No grant → 404 (D15/§3 of `03`).
- A role change is immediate for people and for agents.
- The project owner is the only role that can delete or transfer the project.

## 4. The channel is the lobby (D18)

Every project gets one channel at creation. Its membership **is** the grant
list.

- Add someone to the channel → they get a role in the project.
- Remove them from the channel → their grant is revoked, with a confirm:
  *"Remove Bob from Weather? He will lose access to the board, files and
  workshop."*
- Add your agent to the channel → it appears as "Alice's builder (agent)" with
  a grant at or below Alice's role.
- A member may add people at **member** or **viewer** only (the ceiling rule).
- An admin or owner may add at any role up to their own.

This is why the channel is not "just chat": it is the membership surface that
happens to also carry the conversation. The invite dialog and the member list
are two views of the same `grants.json`.

Consequence to accept: **you cannot be in the conversation without being in the
project.** If a private side-conversation is needed, that is a DM, not a
channel.

## 5. Sharing flows

| Intent | Action | Result |
| --- | --- | --- |
| Work together | Share the project by `@username` or link/QR | A grant at the chosen role |
| Just talk | Friend request | A DM; **no** access |
| Show files without editing | Share a folder project as `viewer` | Read-only |
| Give the server an app | Submit to the catalog | A reviewed snapshot, installed as a copy |

**Lean: sharing does not require friendship.** Friendship gates DMs, not
grants. To find a person, the lookup is **exact username match** — no
directory, no browsing, no "people you may know". That keeps a small server
from becoming a discovery product by accident.

## 6. Folder projects

- Files live in `files/`; the project owns them.
- Importing an external folder **copies it in**. There are no live pointers
  outside the tree in v1 (a pointer would escape backup and permissions).
- Default for guests: **read-only**.
- One-writer mode: check out a file or a subtree, edit, check in. Others see a
  lock and can request it. No real-time co-editing.
- Large binaries are allowed but counted against the owner's quota.

## 7. Archive, delete, transfer

| Action | Who | Behaviour |
| --- | --- | --- |
| Archive | owner / admin | Read-only; hidden from "My projects" by default |
| Delete | owner | Moves to `data/trash/`, purged after 30 days |
| Transfer | owner | `LATER`; requires the recipient to accept |
| Leave | any non-owner | Removes your grant; the project stays |

Deleting a project deletes its board, channel, repo and files. The confirm
names the project and requires typing its name.

## 8. Relationship to the catalog

- **Share** = live collaboration on one project.
- **Publish** = submit a snapshot; an admin reviews it; others install a copy.
- An installed app is a **new project** with an upstream link
  (`catalogEntryId`, `version`). It does not track the original automatically.
- Publishing never exposes the original repo, its history, its secrets or its
  members.

## 9. Open questions

1. Can a project have a second channel (e.g. "design")? (Lean: no in v1; one
   channel + DMs.)
2. Can a project be nested under another? (Lean: no; a folder project holds
   files, not projects.)
3. Is a public/read-only project link ever allowed? (Lean: no; every read
   requires an account.)
4. Should archiving revoke agent grants? (Lean: yes — archived means no jobs.)
5. Can you share with someone who is not a friend, by exact username? (Lean:
   yes; friendship is for DMs, not access.)
