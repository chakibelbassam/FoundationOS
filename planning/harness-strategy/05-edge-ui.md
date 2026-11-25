# Edge UI: mode switching (D6) and suggestion chips (D7)

## D6 — Auto-switch modes

**Decided: B.** Edge may move you to a surface, but it always says so and
always offers undo.

### What exists

- Mode shell: Voice / Chat / Tasks / Find, switched by hand
  (`EdgeChat.tsx`).
- Router: `server/edge/mode.mjs` -> `suggestMode({ text, hasActiveJob,
  workerAvailable })` -> `voice | chat | tasks | find`. Pure, tested, **not
  wired to anything**.
- Follow-up SCR `e5bf53c4` tracks the wiring.

### How B behaves

```
you send "where's the weather app?"     -> Edge: [moved to Find]        [undo]
you send "build the weather app"        -> Edge: [moved to Tasks]       [undo]
                                  (no worker available) -> stays in Chat,
                                  chip: "Open the workshop instead"
you type while the banner is showing    -> banner stays, does not steal focus
you already switched manually           -> router stays quiet for this thread
```

Rules that keep it trustworthy:

1. **Never switch on the first keystroke.** Only after a message is sent.
2. **Never switch away from Voice while dictation is recording.** Announce
   instead.
3. **Never override an explicit pin.** If you picked a mode in this thread,
   the router may suggest but not move.
4. **Undo is sticky for the rest of the thread.** One undo means "stop doing
   that here".
5. **Announce the move** (`aria-live="polite"`) so screen readers and
   keyboard-only users are not ambushed.
6. **No motion, no sound.** A mode change is a change of view, not a
   notification.

### Rules vs model

| | Rules (built) | Small model | Main model |
| --- | --- | --- | --- |
| Latency | ~0 ms | 200-600 ms | 1-3 s |
| Cost | zero | low | not free |
| Predictable | yes | mostly | no |
| Handles "can you make the weather thing actually work" | badly | well | best |

**Lean:** ship rules first (already written, already tested), log every
mismatch ("router said chat, user immediately opened Tasks"), and only add a
model once the log shows a real error rate. That log is also the training set.

### Where it plugs in

Server-side, in the `edgeSend` path: compute `suggestMode`, return it with the
send response, and let the UI decide whether to honour it (pin, mute, undo
state live in the UI). Keeping the decision server-side means the embedded
harness can reuse it later.

---

## D7 — Suggestion chips

### What they are

The two to four small tappable prompts under the composer ("Summarize this
folder", "What changed today?"). They exist to answer "what do I even ask
here?" without the user typing. They are a starter, not a menu.

### Why you have never seen them

They only render when the backend reports `ready`. With no working key and no
running harness, `ready` was false, so the component returned nothing. It is a
render condition, not a missing feature.

### What makes a chip good

- **Specific.** "Summarize the 3 unread SCRs in Weather" beats "Help me".
- **Safe.** One tap must not start a build or spend money.
- **Fast.** An answer in a few seconds, or it feels broken.
- **Visible result.** It should change something on screen, not just add text.

### Content strategies

| | Static per mode | Contextual | Hybrid |
| --- | --- | --- | --- |
| Source | Hand-written strings | Folder contents, recent files, open SCRs, last answer | 3 static + 1 contextual |
| Cost | zero | one cheap model call per scope | one cheap call, cacheable |
| Feels | Generic but honest | Smart, occasionally wrong | Smart where it matters |
| Offline | Works | Cannot generate | Degrades to static |

**Lean: hybrid.** Three fixed starters that are always true for the surface
(Find: "Where is…", Tasks: "What is running?", Chat: "What changed in this
folder?"), plus one contextual chip when a scope is known and the backend is
ready. Cache per `(scope, mode)` and invalidate on send.

### Offline behaviour (the real question)

| Option | Look | Problem |
| --- | --- | --- |
| Hide | Composer only | User does not learn the feature exists |
| Disable + tooltip | Grey chips | Reads as broken |
| Replace with one action | "Connect a harness" chip | **Recommended** — teaches the next step |

So: offline shows exactly one chip, and it opens the connection setting. That
also fixes the earlier confusion where a dead backend looked like a UI bug.

### Constraints from the input requirements (all surfaces)

- Touch and stylus: 44x44 minimum, wrapping row, no hover-only affordances.
- Keyboard: reachable with arrows/Tab, Enter activates, visible focus ring.
- Gamepad: they sit in the normal focus order, so D-pad traversal works
  without special code — verify it, do not assume.
- Never place a chip where it covers the composer hint text or the send button.

### Questions

1. Should chips be **per-app** (Weather-specific) as well as per-mode? That is
   where the value is, but it needs the contextual call.
2. Do chips disappear after first use in a thread, or stay? (Lean: stay, but
   fade the one you just used so the row does not look frozen.)
3. Is "Connect a harness" the right label, or should it name the harness
   ("Connect Edge", "Start OpenCode")?
