# Component inventory

[Agent Output · scrumWorkSpace](Agent%20Output/scrumWorkSpace.md) defines the Markdown components Edge uses in conversation.

Proposed building blocks for the versioned client. Use MUI ButtonBase for a selectable card, IconButton for labelled actions, Menu for contextual actions and Drawer for Edge chat. Use React Bits visual components where they support the interaction. Record the actual component and usage here when the version ships.

## v0.2 client foundation

Delivered in `versions/0.2 FoundationOS/FoundationOS/`. The React app composes MUI controls; the Target Cursor brackets adapt the React Bits corner-bracket idea without its pointer-interception layer. Owner decisions and the prototype replay set the interaction rules: [owner decisions](../../../scrumWorkspace/documents/PI-02/owner-decisions.md) · [prototype replay](../../../scrumWorkspace/documents/PI-02/prototype-replay.md).

| Component | Where it appears | Click / tap | Keyboard | Focus and return | Long labels and narrow viewport | Reduced motion | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **App card** (`src/components/AppCard.tsx`) | Shelf wherever a folder has a valid `app.json` | Front reveals actions. **Run** explains the runtime limit, **Open** visits the overview, **More** opens a menu starting with **Browse files**. A second explicit activation is required. | Enter or Space on the front reveals; focus moves to **Run** when the turn settles. Escape closes the menu first, then the face, restoring the trigger. | Back from the overview returns to the revealed card with **Open** focused. | Name clamps to two lines, brief to three; actions wrap inside the fixed card footprint at 320 px. | Immediate face change with the same actions when motion is Off or Follow system resolves to reduced. | `qa/release/` flip frames; `src/components/AppCard.test.tsx` |
| **Folder widget** (`FolderWidget.tsx`) | Home and every folder depth | One click or tap opens the folder; the graphic and label are one button. | Enter opens. Arrows move one visible neighbour; boundaries keep focus. | Back restores the folder card that was opened. | Two-line name clamp; single-column shelf below 560 px. | Hover lift removed; static highlight. | Weather journey notes; `qa/sprint-2/WI-029/` |
| **Shelf** (`Shelf.tsx`) | Every directory view | Cards are the only targets. | Geometry-based Left/Right/Up/Down and Home/End; roving tab stop. | Scroll position and the originating path survive Back. | Column count adapts from one to five; no horizontal scrolling at 320 px. | Arrow movement has no animation. | `qa/sprint-2/WI-030/` and `qa/release/` |
| **Target Cursor** (`TargetCursor.tsx`) | Over any actionable control while Cursor is Target | Brackets are visual only; the underlying control receives the input. | Focus drives the brackets while keyboard input is the latest input; pointer movement takes over again. | Follows focus after Back and menu dismissal. | Uses transform-only movement; never intercepts taps or text selection. | Stationary brackets; no interpolation. | `qa/sprint-2/WI-030/` geometry; `qa/sprint-4/WI-038/` |
| **Header** (`Header.tsx`) | Persistent strip | Username opens the profile menu; server chip opens connection details; gear opens Settings. | Menu starts on the active profile; Escape returns to the trigger. | Settings Back returns to the workspace. | Clock hides and controls wrap at 640 px; username truncates with a title. | Menus and popovers open without transition. | `qa/sprint-2/WI-031/`, `qa/release/` |
| **Settings pages** (`src/settings/SettingsView.tsx`) | `/settings/profile`, `/settings/appearance`, `/settings/workspace` | Apply saves, Cancel restores the applied state, Reset previews defaults until applied. Previews use the real app card and folder widget. | Tabs are buttons with `aria-pressed`; options are pressed-state buttons. | Leaving Settings discards an unapplied preview; a failed save keeps the saved values on disk. | Single-column preview below 640 px. | Motion choice applies to the preview immediately. | `qa/sprint-4/WI-037/`, `qa/release/` |

## Motion system (WI-044)

Motion is a deliverable. Tokens live in `src/styles.css` and are consumed by the card, folder hover, menus and route entry.

| Token | Value | Used by |
| --- | --- | --- |
| `--fo-dur-hover` | 120 ms | card and folder hover highlight, action hover |
| `--fo-dur-menu` | 160 ms | username menu, More menu, connection popover |
| `--fo-dur-face` | 240 ms | backing opacity/colour transitions outside the turn |
| `--fo-dur-flip` | 520 ms | app card turn |
| `--fo-dur-route` | 200 ms | route entry fade/slide |
| `--fo-ease-standard` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | hover, menus, route |
| `--fo-ease-flip` | `cubic-bezier(0.45, 0, 0.55, 1)` (symmetric) | card turn; the face swap happens at edge-on |

**Turn rules.** The outgoing face is visible until the card passes edge-on; the incoming face is hidden until the same instant. Both faces become opaque and drop `backdrop-filter` for the duration, and the card backing turns opaque, so the page never shows through. Resting cards keep the Glass treatment. Motion **Off** and **Follow system** (when Windows requests reduced motion) swap faces immediately with no turn; every action remains available. Motion stays on by default even when Windows requests reduced motion, per the owner decision.

**Measured on 26 November 2026**, built client on the in-app Chromium browser, desktop viewport, Glass surface, motion On:

| Check | Result |
| --- | --- |
| Frame pacing during a full turn | 56 frames in 900 ms, average 16.7 ms, maximum 17.0 ms, 0 frames over 20 ms (~60 fps) |
| Layout shift during the turn (PerformanceObserver, `layout-shift` excluding recent input) | 0.000 total; no shifted content |
| Mid-turn visibility | Frozen frames at 25%, 51% and 69% of the turn show one face at a time, an opaque card, no page bleed and stationary neighbours |
| Neighbour geometry | Broken/Projects/Weather card rectangles identical before and after the turn |
| Cursor overlay | Transform-only brackets; contributing 0 layout shift |
| Reduced-motion face change | Immediate back face; focus still moves to Run |

Raw screenshots and the frame sample are in `versions/0.2 FoundationOS/qa/`.

## V0.2 evidence links

- Weather journey and action face: `versions/0.2 FoundationOS/qa/release/`
- Descriptor budget (200 entries, 40 folders, 12 probes): `versions/0.2 FoundationOS/qa/sprint-3/WI-032/`
- Settings defaults, Apply/Cancel/Reset, failed save, two-member restart: `versions/0.2 FoundationOS/qa/sprint-4/WI-036/` and `qa/release/`
- Narrow layouts at 390 px and 320 × 600: `versions/0.2 FoundationOS/qa/release/`
