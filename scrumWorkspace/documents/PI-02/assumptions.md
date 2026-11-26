---
revision: 1
---
# PI-2 assumptions recorded by Edge

These are Edge's judgement calls where the plan and owner decisions left a reversible choice. Each names the question, the chosen answer, why, and how to verify or reverse it. PI-wide; item notes carry the item-specific ones.

**26 November 2026 · Edge (OpenCode, DeepSeek V4.1 Flash).**

## 1. Prototype source is absent

- **Question.** The plan requires replaying the OneDrive FoundationOS-Interface before adopting each component.
- **Chosen answer.** Replay from the owner's recorded source-inspection notes in the PI-02 drafts, the upstream React Bits TargetCursor description, and the built v0.2 candidate; mark live prototype behaviour as not observable here.
- **Why.** The prototype folder is not present on this machine and the owner is away.
- **Verify / reverse.** Supply the prototype and re-run `scrumWorkspace/documents/PI-02/prototype-replay.md`; decisions are labelled reuse/adapt/replace per row.

## 2. Descriptor budget reserves one slot

- **Question.** "At most 12 per view, activated item first" cannot both hold if 12 probes start before the activation.
- **Chosen answer.** Probe 11 folders initially and keep the 12th request for the focused or activated item. A late focus uses the reserved slot; a 13th request is never made.
- **Why.** Keeps the request ceiling, the shelf usable before probes settle, and the activated item recognisable.
- **Verify / reverse.** `qa/sprint-3/WI-032/` shows 206 cards, 11 initial probes and 12 total when a far folder is focused.

## 3. Narrow viewports are previewed, not physical

- **Question.** The release bar names 390 px and 320 × 600.
- **Chosen answer.** The built client accepts `?w=390` and `?w=320&h=600`, constrains the app container and uses container queries, so the same CSS and components render at those widths. This is recorded as a preview, not a phone.
- **Why.** The in-app browser exposes no viewport emulation, and launching a separate browser is forbidden by the brief.
- **Verify / reverse.** Open the printed client URL with those parameters; `qa/release/09..12` shows no horizontal overflow and the wrapped header. A real device run would replace this evidence.

## 4. No pen, controller or touch hardware

- **Question.** Stylus hover/contact, controller ergonomics and touch scrolling need device evidence.
- **Chosen answer.** Prove the directional model and targeting with mouse and keyboard; record the hardware gap.
- **Why.** None of those devices were attached.
- **Verify / reverse.** Replay the same sequences with a hover-capable pen, a contact-only pen and a controller when available.

## 5. Session token, not account key

- **Question.** How does a member connect in v0.2?
- **Chosen answer.** The Connect screen accepts an existing member session token, kept in memory. The operator helper creates it from an account key. Account sign-in and invitations stay in a later increment.
- **Why.** Matches the recorded owner decision.
- **Verify / reverse.** `docs`/README connect sequence; `scripts/session.mjs`.

## 6. Client-owned preferences

- **Question.** Where do theme/surface/density/motion/cursor live?
- **Chosen answer.** The client host stores them per member id under the Windows application-data directory; the server contract is unchanged.
- **Why.** v0.1 has no preferences operation and the owner asked for survival across client restarts and ports.
- **Verify / reverse.** Set different values for two members, restart on another port, reconnect; delete the file for defaults.

## 7. Defaults resolve System against Windows

- **Question.** What does first-run System theme look like in evidence?
- **Chosen answer.** It follows the Windows theme, which was dark during QA; first-run evidence is therefore the dark Glass surface.
- **Why.** The owner chose System, not a fixed light default.
- **Verify / reverse.** Switch Windows to light and relaunch a member with no saved preferences.

## 8. Motion measurements are machine-local

- **Question.** Does 60 fps hold beyond this machine?
- **Chosen answer.** Report the focused-tab measurement (16.7 ms average, 0 frames over 20 ms, layout shift 0) as evidence from this machine only.
- **Why.** No low-end device was available.
- **Verify / reverse.** Repeat the frame sample on the target hardware; the method is in `qa/sprint-3/WI-044/`.
