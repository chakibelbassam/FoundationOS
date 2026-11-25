# Intake: three doors, one form, as little typing as possible

The hardest part of a work item is not the schema. It is that the person has
to stop what they are doing, open a form, and translate a lived annoyance into
fields. Every field we can capture or infer is a field they should never see.

## 1. Three doors

| Door | Entry wording | Produces | Required from the user |
| --- | --- | --- | --- |
| **Report a problem** | "Something is wrong" | Bug | What happened, what you expected |
| **Request a feature** | "I want to be able to…" | Feature or Enhancement | What you want to do |
| **Ask for a task** | "Someone needs to…" | Dev Task or Enabler | What needs doing |

The type is decided by the *sentence*, not by the door: "I want to be able to
preview JSON" is an Enhancement, not a Feature, and the door should not lie
about it. Show the resulting type as a small, editable chip.

## 2. The one-sentence path (default)

```
[ Describe it ]  "the previewer crashes when I open a json file"
        |
        v
Edge drafts:  type=Enhancement  scope=Weather  title="Preview JSON files"
              current="No JSON support; file fails to open"
              expected="JSON renders as readable text"
              actual="Nothing renders / crash"
              repro=["Open Weather > Files > sample.json"]      [edit]
        |
        v
              [ File it ]   [ Fix a field ]   [ Discard ]
```

Rules:

- **One input is enough to start.** If the sentence is enough, filing is one
  button.
- Edge never invents a repro step. If it cannot see one, the field stays empty
  and is marked "not captured", not filled with a guess.
- The draft is editable before filing; after filing, edits are revisions.
- If the provider is offline, the doors fall back to the plain form. Intake
  must never be blocked by a dead agent.

## 3. What we capture automatically

Never ask for these:

| Field | Source |
| --- | --- |
| scope / app | the screen the door was opened from |
| route / screen | current view |
| app version + build | app manifest / `system/dist` timestamp |
| reporter | signed-in user |
| workspace | active workspace (D15) |
| createdAt | clock |
| platform, viewport, input | browser |
| last error | client error buffer, if any |
| screenshot | one tap, pre-cropped to the active view |
| console excerpt | optional, off by default, explicit consent |

This is why "repro steps" is the field people skip: we can carry the context
instead of asking them to remember it.

## 4. Field flow per door

**Report a problem** (Bug)
1. What happened? (one line)
2. What did you expect?
3. Steps — prefilled from the session; editable.
4. Optional: severity guess, screenshot, frequency.

**Request a feature** (Feature / Enhancement)
1. What do you want to be able to do?
2. Why / who is it for? (optional, Edge suggests)
3. Done when — Edge proposes acceptance checks; user edits.
4. Optional: current behaviour (for enhancements).

**Ask for a task** (Dev Task / Enabler)
1. What needs to happen?
2. Done when.
3. Optional: what it unblocks (required if Enabler), due date.

Nothing else is on the first screen. Everything else lives under "More
detail", collapsed.

## 5. Where the doors appear

- **Global "+ New"** in the workspace header: three doors.
- **Contextual**: every app card menu and every app view has "Report a
  problem" and "Request a change" (the latter chooses feature/enhancement).
- **Edge chat**: when Edge detects a problem or a request, it offers "File
  this" with the draft already built.
- **From a failed job / QA report**: "File as bug" with evidence attached.

Every door opens the **same** panel with the scope locked to where it came
from, so a bug filed from Weather never lands in FoundationOS by accident.
Under T3 (D15), the door only appears on an app the user can access; a viewer
sees the app but cannot file into it, and the server enforces that, not the UI.

## 6. Interaction rules (per Interface Standards 1.1, 2.1, 2.2)

- The panel is **bounded inside the viewport**. It scrolls internally; it
  never pushes the row or moves the control you pressed.
- Opening it **preserves focus** and returns focus to the originating control
  on close (`Esc`).
- One panel, not a modal on top of a modal. The "More detail" section expands
  in place.
- Keyboard: Tab order follows the fields; `Ctrl+Enter` files; `Esc` discards
  with a confirm only if text was typed.
- Gamepad: the same directional model — Down into fields, Up out, Enter
  activates, B/Escape closes.
- Touch/pen: 44x44 minimum targets; the primary button sits above the keyboard,
  not below it.
- Works at 320-390 CSS px and in landscape.
- Labels are visible, not placeholder-only; errors are text next to the field,
  announced politely.
- Reduced motion: no slide-in; the panel simply appears.

## 7. States

| State | What the user sees |
| --- | --- |
| Empty | Three doors with one example sentence each |
| Drafting | "Edge is drafting…" with a cancel; form usable meanwhile |
| Draft ready | Fields filled, type chip editable, File it |
| Duplicate suspected | "This looks like #12 — add to it or file separately?" |
| Filed | The item, its ID, and the next step (triage), not a vanishing toast |
| Offline | Plain form + "saved locally, will submit when connected" |
| Rejected by schema | The exact field and rule, not a generic error |

## 8. Anti-patterns

- A twelve-field form in front of a one-line problem.
- Required fields the system already knows.
- Hiding the type behind jargon ("Enhancement" with no explanation).
- A modal that traps focus behind an overlay on a phone.
- Filing into "the current folder" when the user is on Home.
- Letting an agent file a Bug it cannot reproduce, with invented steps.

## 9. Open questions

1. Should the global door remember the last app you were in, or always require
   an explicit scope? (Lean: remember, show it as a chip.)
2. Do we allow filing without a title if Edge can draft one? (Lean: yes, title
   is derived and editable.)
3. Should "Request a feature" ever create an Enabler directly? (Lean: no —
   enablers come from triage, not from users.)
4. Voice: is "describe it out loud" in scope for v1? The dictation composer
   already exists, so the cost is low.
