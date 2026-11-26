# Brief · WI-024 Reproduce the prototype interactions

Role: Muse Spark 1.3 Contributor · model `opencode-go/muse-spark-1.3-contributor` at `xhigh` (highest supported; Max is not offered).
Target: `versions/0.2 FoundationOS/`. Do not run Git.

## Context

PI-02 builds the v0.2 React client against the released v0.1 server. The OneDrive
`FoundationOS-Interface` prototype is **not present on this machine**; the owner's
recorded source-inspection notes are in:

- `scrumWorkspace/documents/drafts/pi-02-header-settings-review.md` (defect table)
- `scrumWorkspace/documents/drafts/pi-02-workspace-interaction.md` (50 answers)
- `scrumWorkspace/documents/drafts/pi-02-client-foundation.md`
- owner decisions in `scrumWorkspace/documents/PI-02/owner-decisions.md`

Upstream reference for the cursor: https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/TargetCursor/TargetCursor.jsx
(React Bits corner brackets).

## Deliverable

Write `scrumWorkspace/documents/PI-02/prototype-replay.md` (revision header `---\nrevision: 0\n---`, then a title, then the content) containing:

1. **Evidence basis and gap.** State plainly that the prototype source is absent from this checkout, cite the recorded observations above, and label every unverified item. Do not invent observed behaviour.
2. **Replay matrix** with one row per interaction: glass-card flip background bleed, folder graphic versus label gesture, nested Back, directional movement, cursor lock/target ownership, and cursor input paths (mouse, pen hover, contact pen, keyboard focus). Columns: interaction, input sequence, expected result, recorded observation (source-cited or "not observable here"), decision (reuse / adapt / replace), rationale, and how the v0.2 candidate verifies it.
3. **Substitute replay plan.** The concrete sequences we will run against the built v0.2 client in the built-in browser (pointer pass, ~1 s dwell, deliberate activation, held Enter, Escape, rapid reversal, mid-flip frame capture on a busy background, nested folder Back, arrow boundaries, cursor framing of a widget versus its icon button and separate action button, keyboard/mouse handoff).
4. **Adoption decisions** for each essential component: app card, folder widget, shelf navigation, Target Cursor, header menus, Settings preview. Say what v0.2 adopts, adapts or replaces.
5. **Cursor paths.** Summarise which paths the prototype handled (mouse-only pointer handlers, fine-pointer guard, gamepad hook) and what v0.2 must prove with keyboard and later controller input.

Keep it under ~250 lines, plain Markdown, no tables wider than the editor can show. No credentials, tokens or personal data.

## Evidence to report back

- The file path and line count.
- A short list of the rows you marked "not observable here" so Edge can attach the gap note.
