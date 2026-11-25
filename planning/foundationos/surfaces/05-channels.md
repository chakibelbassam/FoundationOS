# 05 — Channels and DMs

**Status:** DECIDED (D18, D19) · 25 November 2026

Two surfaces, one message model:

| Surface | Who | Created by | Purpose |
| --- | --- | --- | --- |
| **Project channel** | Everyone with a grant | Automatically with the project | The lobby: membership, coordination, system events |
| **DM** | Two friends | Either of them | Private conversation; grants nothing |

## 1. The channel is the lobby

- One channel per project, created with it.
- The member list **is** `grants.json`.
- **Add to channel → grant a role.** Remove → revoke, with a confirm naming
  what is lost.
- Adding your agent is a grant: it appears as "Alice's builder (agent)".
- A member may add at `member` or `viewer` only (ceiling rule, D18).
- There is no way to be in the conversation without being in the project. For
  a private side-conversation, use a DM.

## 2. Message kinds

| Kind | Author | Appearance | Example |
| --- | --- | --- | --- |
| **Human** | a person | normal bubble, avatar, time | "The build is ready." |
| **Agent** | an agent, with its owner's grant | same bubble + **"via Edge"** tag, agent avatar | "Alice asked me to send the build link." |
| **System** | the server | a card, not a bubble | "Bob's builder opened a review." |

The tag is not optional and cannot be removed by the agent. An agent never
impersonates a human, and never edits a human's message.

## 3. Composer

- Text, attach, and **"Ask Edge to draft"**.
- Enter sends; Shift+Enter is a newline.
- Draft is saved locally per conversation.
- A failed send keeps the text and offers retry; it never clears the box.
- Mentions (`@bob`, `@builder`) are exact-match; no directory.

## 4. Agent sending (D19)

```
Alice: "Edge, tell Bob the build is ready."
Edge:  drafts a message
Alice: reviews, edits, presses Send
Bob:   sees "Alice: …" tagged "via Edge"
```

| Mode | Applies to | Guard |
| --- | --- | --- |
| **Draft + approve** | anything a human initiated | default; always available |
| **Auto-send** | job events and pre-approved templates, only to contacts marked trusted | off by default; per contact |
| **System** | job state changes, invites, failures | server-authored; no approval |

Hard rules:

- An agent cannot message someone its owner cannot message (not friends,
  blocked, no shared project).
- Reading history requires an explicit per-conversation grant; send-only is the
  default.
- Blocking a person blocks their agents.
- Auto-send never composes new prose as the human; it sends an event or a
  template the human approved.

## 5. Membership events in the channel

The channel carries the audit of its own membership, as system cards:

- "Alice added Bob as **member**."
- "Bob added his builder (agent) as **viewer**."
- "Alice removed Bob." (with the confirm that preceded it)
- "Carol accepted an invite as **viewer**."

These cards are not deletable. They are the human-readable face of
`grants.json` and `audit/`.

## 6. Unread, mute, quiet hours

- Unread counts are per user, per conversation, stored in the index.
- A channel can be muted; the count still exists in the inbox, without a badge.
- Quiet hours (default 22:00–08:00) suppress browser and Windows notifications,
  not the inbox. Sev-1 and job failures break through.
- A viewer receives no work notifications; they can still read the channel.

## 7. Privacy

- Messages are stored on the server in `channel/messages.jsonl`.
- An admin cannot read them (D17). This is policy + audit, not encryption.
- The UI states it once, plainly, on the conversation's info panel:
  *"Messages are stored on this server. The server admin cannot read them by
  default, but whoever controls the filesystem can."*
- E2E is `LATER`; it would cost search and agent access, and it is not a v1
  promise.

## 8. States

| State | Design |
| --- | --- |
| Empty channel | "This is the start of #weather. Say hello, or file the first item." |
| Empty DM | "You and Bob are friends. Messages are private to you two." |
| Not friends | Composer disabled: "Become friends to send a message." |
| Blocked | "You can't message this person." No workaround via agent. |
| Loading older | A button, not infinite scroll that jumps position. |
| Server unreachable | Banner + retry; the draft is kept. |

## 9. Standards

- New messages do not steal focus or scroll the reader away from history.
- The composer keeps its position when the message list grows (§1.2).
- Message time is a `<time>` element with an absolute title.
- The "via Edge" tag is text, not an icon alone (§2.2).
- At 320 px, the channel is a full page; the member list is a sheet.

## 10. Acceptance

1. Adding Bob to the channel gives him a grant; removing him revokes it after a
   confirm that names the loss.
2. A member cannot add someone as `admin`.
3. An agent message is always tagged "via Edge"; it cannot be sent untagged.
4. Alice cannot DM Bob if they are not friends; her agent cannot either.
5. Blocking Bob hides his messages and stops his agents.
6. A muted channel still counts in the inbox but shows no badge.
7. Keyboard: composer → send → focus stays in the composer.

## 11. Open questions

1. Threads? (Lean: no in v1; quote-reply is enough.)
2. Reactions? (Lean: later.)
3. Can a channel be read-only for viewers but writable for members? (Lean: yes,
   role-based; that is the default.)
4. Group DMs? (Lean: no; create a board project instead.)
