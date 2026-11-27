---
revision: 1
---
# WI-024 Prototype replay (recorded basis, substitute plan)

## 1. Evidence basis and gap

The OneDrive `FoundationOS-Interface` prototype is **not present
on this machine** and was not inspected in this session. No live
prototype behaviour was observed here. Nothing below is a fresh
observation of the prototype source or its running UI.

Everything recorded comes from owner notes already in this repo:

- `drafts/pi-02-header-settings-review.md` — defect table (flip
  bleed, folder inconsistency, uneven arrows), card proposal,
  component checks (cited as **HSR**).
- `drafts/pi-02-workspace-interaction.md` — 50 answers on cards,
  folders, arrows, Settings (cited as **WSI**).
- `drafts/pi-02-client-foundation.md` — release story, layout,
  sprint plan (cited as **CF**).
- `PI-02/owner-decisions.md` — defaults incl. Target cursor,
  motion rule (cited as **OD**).
- `PI-02/client-increment-plan.md` — Target Cursor section:
  local mount, system pointer kept, fine-pointer guard,
  mouse-only handlers, gamepad hook (cited as **IP**).
- Upstream cursor reference: React Bits TargetCursor
  (corner brackets; link in brief).

Rule applied: any live prototype behaviour not covered by the
above is labelled **not observable here**. Substitute replay
(section 3) runs against the built v0.2 client instead.

## 2. Replay matrix

Short headers: Input = input sequence; Expected = expected
result; Recorded = recorded observation; Decision = reuse /
adapt / replace; v0.2 check = how the v0.2 candidate verifies it.
Every live-replay cell is still unverified until section 3 runs.

| Interaction | Input | Expected | Recorded | Decision | Rationale | v0.2 check |
|---|---|---|---|---|---|---|
| Flip bleed (glass) | Hover on/off; quick reversal; busy bg | No mid-turn layer; titles readable; shelf fixed | HSR defect table: separate faces, split bg rules; live frame not observable here | adapt | Keep identity front; fix backing/clip | Mid-flip capture Solid/Glass; compare instant-face fallback |
| Folder graphic vs label | Click graphic; click label; tap; swipe | Same destination: open folder | HSR defect table: hover/pin/hold/drag/label/open mix; live feel not observable here | replace | One primary link, one gesture | Graphic vs label runs at two depths; tap vs swipe |
| Nested Back | Open 2 deep; Back twice | Route, scroll, focus return to launcher | WSI Q35-36; HSR replay row; live run not observable here | reuse | Same widget and rules each depth | Nested Back with focus/scroll assert |
| Directional movement | Arrows across rows, edges, short rows | One press = one step; focus visible | HSR defect: global + local handlers overlap; WSI Q31-32 | adapt | One shelf focus model | Arrow sweep incl. edges, Settings exclusion |
| Cursor lock/ownership | Cross card, icon, buttons; scroll mid-hover | Brackets track real target; no lock on hidden | IP ownership rules; live lock feel not observable here | adapt | Feedback only; activation via control | Rapid-crossing + rerender + scroll runs |
| Cursor mouse path | Move, dwell ~1 s, click | Highlight now; reveal on dwell/click | IP: mouse-only handlers recorded | reuse | Proven path; keep guard | Pointer pass, dwell, activation |
| Cursor pen-hover path | Hover preview; exit; tap | Hover cue; tap reveals; tap activates | not observable here | adapt | Prototype guard left pen unproven | Emulated hover/exit; device run if hw avail |
| Cursor contact-pen path | Tap; swipe to scroll | Tap reveals; swipe scrolls, no stuck hover | not observable here | adapt | Touch path, no timed press | Tap vs swipe; hover dismissed |
| Cursor keyboard-focus path | Arrows; Enter/Space; Esc | Focus ring distinct; focus drives target | WSI Q34; IP focus-follows rule; live handoff not observable here | adapt | Pointer parks; focus owns target | Keyboard/mouse handoff run |

Rows marked "not observable here": pen hover, contact pen,
and the live feel of flip bleed, folder gesture, nested Back,
arrows, cursor lock, and keyboard handoff (citations above
cover the recorded part; the live replay part is unobserved).

## 3. Substitute replay plan (built v0.2 client, built-in browser)

Run each sequence on desktop, 390 px, and 320 x 600, in Solid
and Glass, motion on and reduced motion. Record input, result,
and screenshot or frame where noted.

1. Pointer pass: fast sweep across a card row; front must stay.
2. Dwell: hold ~1 s on one card; reveal fires once; exit, scroll,
   or view change cancels the timer.
3. Deliberate activation: click front; actions open at once and
   stay while pointer is over actions or focus is inside.
4. Held Enter: press Enter on card trigger and hold through the
   turn; Run must not self-activate (key consumed).
5. Escape: Esc closes menu first, then action face; focus
   returns to the trigger that held it.
6. Rapid reversal: hover on/off/on mid-flip; no stuck faces,
   no shelf resize, no jumping to the card behind.
7. Mid-flip capture: busy background, Glass on; grab the
   mid-turn frame; check for bleed, jitter, contrast loss.
8. Nested folder Back: open two levels, Back twice; scroll and
   focus return to the launching widget or nearest item.
9. Arrow boundaries: arrows at row ends, short rows, single
   column; one press moves at most one step; focus stays
   visible; arrows stay native outside the shelf.
10. Cursor framing: bracket a widget vs its icon button vs a
    separate action button; decorative icon inherits the
    button bounds; independent buttons get own targets.
11. Keyboard/mouse handoff: focus a card by keyboard, then move
    the mouse elsewhere; focus outline and hover stay
    distinct; deliberate input wins.

## 4. Adoption decisions

- App card: **adapt**. Keep identity front and Run/Open/More
  back (HSR/WSI). Replace the flip internals: opaque backing
  per face, clipped turn, instant face change for reduced
  motion, clean replacement if 3D still bleeds (OD: Glass is
  default, so bleed is a first-run defect).
- Folder widget: **replace** interaction, **reuse** look. One
  primary link for graphic and label at every depth (HSR);
  single tap opens on touch; no pinned preview or timed hold
  in v0.2 (WSI Q27-29).
- Shelf navigation: **adapt**. Deliberate arrows scoped to the
  shelf, one step per press, stable scroll and Back focus
  (WSI Q30-36); remove global/listener overlap (HSR).
- Target Cursor: **adapt**. Adopt React Bits corner brackets
  per IP ownership rules; keep system pointer visible; keep
  native selection, Tab order, and focus ring with effect off.
- Header menus: **reuse** design (CF/HSR): username menu with
  active profile + Profile link; connection disclosure with
  address, check result, version, recovery; quiet local time.
- Settings preview: **reuse** design (HSR/CF/OD): Profile,
  Appearance (Solid/Glass on real cards), Workspace (density,
  motion, System/Target cursor); live preview with Apply,
  Cancel, Reset; per-member durable store.

## 5. Cursor paths

- Prototype handled (recorded, IP + brief): mouse pointer
  handlers only, behind a fine-pointer guard; system pointer
  kept visible; a gamepad navigation hook exists but is
  unreviewed here (not observable here beyond its mention).
- Prototype left unproven: pen hover vs contact pen, keyboard
  focus driving the target, controller ergonomics — all
  **not observable here**.
- v0.2 must prove: mouse (pass, dwell, click); hover-capable
  pen (preview, exit, tap-to-reveal, tap-to-activate);
  contact-only pen on the touch path (tap vs swipe, hover
  dismissed); keyboard (focus owns target, pointer parked);
  overlay never intercepts taps, covers labels, or hides the
  fallback pointer. Emulation covers event logic; physical pen
  feel and controller ergonomics need device evidence (IP).
  Controller support stays a later goal; v0.2 proves the
  directional model with keyboard input.

Assumptions: brief/IP cursor summary taken as recorded; ~1 s
dwell and Run/Open/More order taken as trial proposals
(HSR/WSI), not measured prototype values.
