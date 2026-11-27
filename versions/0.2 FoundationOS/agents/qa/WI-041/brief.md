# Brief · WI-041 Review visual and input behaviour independently

Role: GLM 5.3 Flash · model `opencode-go/glm-5.3-flash` at `max`.
Independent reviewer. Do not run Git, edit product source, tests, docs or Scrum. Write only under `versions/0.2 FoundationOS/agents/qa/WI-041/`. Do not drive the built-in browser (Edge owns it); judge the supplied evidence and the code.

## Candidate

Branch `edge-opencode/pi-02-client-foundation`, revision `b8459c6`. Evidence: `versions/0.2 FoundationOS/qa/` (release and sprint folders). Component and motion record: `Product Information/Interface/Components/README.md`. Owner release bar: `scrumWorkspace/documents/PI-02/owner-decisions.md` (only Sev-1 blocks; WCAG AA 4.5:1 text and 3:1 interface in Solid and Glass).

## What to review

1. **Screenshots.** Open every JPEG in `qa/`. For each, record viewport, surface, what it proves and what it does not. Flag any image that cannot support its note.
2. **Contrast.** From `src/styles.css`, `src/theme.ts` and the palette values, compute WCAG ratios for primary and secondary text and for interface borders/focus rings in light and dark, Solid and Glass, including the worst-case glass composite over the page gradient. State the method and numbers. Flag anything under 4.5:1 text or 3:1 UI.
3. **Narrow layouts.** Check the 320 and 390 evidence against the CSS container queries: no horizontal scrolling, wrapped header, truncated username, card actions inside the card. Note that these were container previews, not a physical phone.
4. **Turn frames.** Judge `05/06/07-turn-*.jpg` against the owner's mid-flip bleed defect: is one face readable, is the card opaque, are neighbours stationary? Note that frames were paused through the Web Animations API.
5. **Cursor evidence.** Check the bracket-versus-element geometry quoted in `qa/sprint-2/WI-030/README.md` and the lock claim; flag any gap between the claim and the numbers.
6. **Motion.** Check the token table against `styles.css`, the 60 fps/layout-shift numbers against the method described, and the reduced-motion claim against `PreferencesContext.tsx` and the CSS.
7. **Defect list.** For each finding: severity, what a user sees, where (viewport/surface/input), and a reproduction or the missing evidence. Record untested hardware (pen, controller, touch, physical phone) as limitations, not defects, unless a stated acceptance criterion depends on them.

## Report

Write `versions/0.2 FoundationOS/agents/qa/WI-041/report.md` with the review method, the contrast table, per-image verdicts, the defect list and a final PASS/FAIL for the visual release criteria. End your reply with the number of Sev-1 findings and a one-line verdict.
