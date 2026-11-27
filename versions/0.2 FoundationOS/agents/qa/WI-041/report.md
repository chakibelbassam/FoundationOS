# WI-041 · Independent visual and input review · v0.2 client foundation

Reviewer: GLM 5.3 Flash (`opencode-go/glm-5.3-flash`), 26 November 2026.
Candidate: `edge-opencode/pi-02-client-foundation` at `b8459c6`. Evidence judged, not re-driven: no Git, no product edits, no browser. Method artifacts: `contrast-check.mjs` (this folder) — every number below is reproducible with it.

Bar applied (`scrumWorkspace/documents/PI-02/owner-decisions.md`): only Sev-1 blocks; a failure of a stated PI acceptance criterion is Sev-1; WCAG AA — 4.5:1 text, 3:1 interface components — in Solid and Glass.

---

## 1 · Contrast — method and numbers

**Method.** WCAG 2.1 relative luminance from 8-bit sRGB (transfer function, 0.03928 threshold; L = 0.2126R + 0.7152G + 0.0722B; ratio = (L₁+0.05)/(L₂+0.05)). Every translucent layer was composited in paint order with "source-over": body fill (`#eef2f8` / `#0b1220` from `theme.ts` via CssBaseline) → the three `.fo-backdrop` radial tints at **full centre alpha** (blue `rgba(96,148,255,.22)`, purple `rgba(196,126,255,.18)`, teal `rgba(84,214,190,.16)`) → the dot grid at folded alpha 0.066 → the glass fill → the `saturate(1.35)` backdrop-filter matrix, kept only where it lowers the ratio. `blur(18px)` is not simulated; it only averages neighbours, which in each worst region *raises* contrast, so omitting it is conservative. Full tint alpha is conservative too: the tint centres never co-occur, so per-region numbers are pessimistic. `contrast-check.mjs` also prints an unphysical stacked-tint bound for reference.

**Worst-case glass region** = the blue radial at full strength + dots: light `rgb(201 216 245)`, dark `rgb(36 53 88)`.

### Text — all pass 4.5:1

| Text | Light Solid | Light Glass (worst) | Dark Solid | Dark Glass (worst) |
| --- | --- | --- | --- | --- |
| Primary (`#0f1b2d` / `#e8eefc`) on card | **17.28** | **12.87** | **14.51** | **12.88** |
| Primary on page | 15.38 | — | 16.11 | — |
| Secondary (`#42536b` / `#a9b8d6`) on card | **7.83** | **5.83** | **8.45** | **7.49** |
| Secondary on page | 6.97 | — | 9.37 | — |
| Accent text (`--fo-focus`) on card (Run/Open/More, icons) | **6.61** | **4.92** | **9.31** | **8.26** |
| Run label on filled accent (`#fff` / `#06101f`) | **6.61** | 6.61 | **10.52** | 10.52 |
| Card brief, opacity .80 | 9.16 | — | 9.66 | — |
| Card kind, opacity .68 | 5.98 | — | 7.33 | — |
| Card hint, opacity .66 (lowest-opacity text) | 5.59 | **4.91** | 6.98 | **6.44** |
| Clock, opacity .78 on header fill | 7.95 | — | 10.00 | — |
| Connected chip (`success.main`) on header fill | 6.10 | — | 12.00 | — |

Footnote: at the unphysical stacked-tint bound light accent-on-glass dips to 4.40; the real per-region worst is 4.92. Text passes everywhere in every physically realisable composite.

### Interface components — focus indicators pass, boundaries fail

| Component | Light Solid | Dark Solid | Light Glass | Dark Glass |
| --- | --- | --- | --- | --- |
| Focus ring vs page | **5.89** | **10.34** | — | — |
| Focus ring vs card/glass | **6.61** | **9.31** | **4.92** | **8.26** |
| Card border (`--fo-border`) vs page | ✘ **1.33** | ✘ **1.53** | — | — |
| Card border vs card fill | ✘ **1.33** | ✘ **1.57** | — | — |
| Glass border vs glass fill | — | — | ✘ **1.22** | ✘ **1.80** |
| Glass border vs page behind edge | — | — | ✘ **1.27** | ✘ **1.72** |
| Glass card fill vs page (no border) | — | — | ✘ **1.02** | ✘ **1.25** |
| Solid card fill vs page (no border) | ✘ **1.12** | ✘ **1.11** | — | — |
| Open/More border (34% accent mix) vs card | ✘ **1.73** | ✘ **2.25** | — | — |

Mechanism, from `styles.css`: `--fo-border` alphas (0.14 light / 0.22 dark, lines 29 and 38) are far too weak, and `--fo-glass-border` is **referenced but never defined** (line 258), so light Glass cards fall back to `rgba(255,255,255,0.65)` — a white edge on a near-white fill. Dark Glass overrides to `rgba(150,180,230,0.28)` (line 264), still far under 3:1. Settings pills use an even weaker 26% accent mix.

---

## 2 · Per-image verdicts (every JPEG in `qa/`)

### `qa/release/` (candidate journey, alice: saved Light · Glass · Comfortable)

| Image | Supports its note | Notes / limits |
| --- | --- | --- |
| `01-home-desktop.jpg` | ✔ | Light·Glass desk viewport; header state, folder/app/file widgets, order of the Weather card as item 5. Shows nothing about dark, Solid or focus. |
| `02-weather-actions.jpg` | ✔ | Card back with Run/Open/More inside the card; Run shows a focus ring. No cursor brackets visible — explainable (pointer was the last input, parked off-target hides the overlay); does not contradict WI-030. |
| `03-overview.jpg` | ✔ | Breadcrumb `Home › Weather`, brief, Open README, Browse files, entry count. |
| `04-reader.jpg` | ✔ | Private README incl. `Weather 0.2`, monospace reader panel. |
| `05-turn-front-25.jpg` | ✔ | Mid-turn: front face readable, card opaque, page not visible through it, neighbours (Projects, loose-note.txt) stationary, brackets on card. |
| `06-turn-edge-50.jpg` | ✔ | Edge-on: opaque white sliver, **no page bleed**, neither face readable (consistent with "one face at a time"), neighbours still. This is the defect-fix frame. |
| `07-turn-back-70.jpg` | ✔ | Back face readable, front text gone, card opaque, neighbours still. |
| `08-missing-file.jpg` | ✔ *but uncited* | Shows the missing-file state; no release README row cites it, and it does **not** demonstrate the "type and size" state for non-text/oversized files. |
| `09-390-home.jpg` | ✔ | `?w=390` container preview: clock hidden, header wrapped, 2-column shelf, revealed Weather card with actions wrapped inside the footprint, no horizontal scrollbar. |
| `10-390-overview.jpg` | ✔ | Breadcrumb and both buttons fit 390 px. |
| `11-320-long-name.jpg` | ✔ | 320×600 preview, dark Glass: header wraps to three rows, `alexandr…` truncates, no horizontal overflow. The only dark image in the release folder. |
| `12-320-home.jpg` | ✔ | Single-column shelf, vertical scrollbar only (inside the preview container). |

### Sprint folders

| Image | Supports its note |
| --- | --- |
| `sprint-2/WI-031/320-long-username.jpg` | **✘ — cannot support its note.** It shows the long username **wrapping to two lines** ("alexandra-" / "montgomery"), while the note claims truncation to `alexandr…` in a 62 px label. The shipped behaviour *is* evidenced — by `release/11-320-long-name.jpg`. See finding F4. |
| `sprint-3/WI-032/206-entries-11-probes.jpg` | ✔ 5-column dark shelf under the 206-entry fixture, Bulk 09 revealed with the "No brief is available" fallback, shelf usable. |
| `sprint-3/WI-033/overview-without-readme.jpg` | ✔ Bulk 01 overview with only Browse files — no Open README. |

---

## 3 · Narrow layouts (320 / 390) against the container queries

CSS (`styles.css` 174–177, 572–580): ≤560 px shelf `minmax(150px)` → 2 columns at 390, 1 at 320; ≤640 px clock hidden, header and toolbar wrap, username `max-width: 96px` with ellipsis. Images 09–12 match rule-for-rule: wrapped header, no clock, truncated username, actions wrapped inside the fixed card footprint, no horizontal scrolling, `scrollWidth = clientWidth = 320` recorded in the release note. **Caveat (acknowledged by the evidence itself):** these are the built client's `?w` / `?w&h` container previews on a desktop browser, not a physical phone; touch scrolling and a real visual viewport were not exercised.

## 4 · Turn frames against the mid-flip bleed defect

The fix claim (WI-035) matches the code exactly: the backing goes opaque for the whole turn (`data-target-lock` → `background: var(--fo-card-solid)`, `transition: none`, styles.css 276–291), both faces drop `backdrop-filter` while turning, and the face swap is delayed to `calc(var(--fo-dur-flip) * 0.5)` — edge-on. The three paused frames show: 25% front readable and opaque, 51% edge-on with zero page content through the card, 69% back readable with no front ghosting; neighbours keep identical geometry (214 × 196 each, matching `--fo-card-height: 196px`). **One face readable, card opaque, neighbours stationary — the owner's bleed defect is fixed on this evidence.** Caveat: frames were paused through the Web Animations API; static frames prove colour/geometry states, not animation smoothness.

## 5 · Cursor evidence (`qa/sprint-2/WI-030/`)

The bracket geometry is exactly the code's contract (`TargetCursor.tsx` 129–146: box = element rect inflated 4 px per side; 12 px corner pieces). Folder card: element 214×196 at (47,189), predicted box (43,185)→(265,389), observed (43,185)→(264,389) — within 1 px rounding. Settings icon button and Run: predicted boxes match to the pixel (1153,26→1191,62; 986,284→1046,329). The lock claim is implemented as described: `resolveTarget` maps any node inside `[data-target-lock="true"]` to the card root (lines 13–17), and the card root always carries `data-target`. Keyboard-over-pointer, scroll/resize recompute (rAF + 160 ms interval), transform-only movement and the touch/coarse-pointer hide all match the code. The only recorded gap — a small bracket offset on a menu item while the menu is still animating — is already logged by QA as Sev-4 and is consistent with measuring a scaled/translated MUI enter animation.

## 6 · Motion

- **Tokens:** `styles.css` 1–8 matches the component-inventory table value-for-value (120/160/240/520/200 ms; `cubic-bezier(0.2,0.7,0.2,1)`; symmetric flip easing, face swap at edge-on via the 50 % delay). ✔
- **60 fps:** 56 frames in 900 ms, avg 16.7 ms, max 17.0 ms, none over 20 ms — consistent with 60 Hz vsync; sampling method (focused tab, JS rAF, single machine) is honestly disclosed, including "not measured" limits. Minor wording issue: the 900 ms window is wider than the 520 ms turn and 55 × 16.7 ≈ 918 ms. Sev-5 note, folded into F2. ✔
- **Layout shift:** `PerformanceObserver('layout-shift')`, recent input excluded, 0.000 total; cursor moved to transform-only after an earlier 0.005. Method is sound for layout shift. ✔
- **Reduced motion:** `motionIsReduced` (`PreferencesContext.tsx` 139–147): Off → reduced; Follow system → `prefers-reduced-motion`; On → always full motion, per the owner decision that On is the default even when Windows requests reduced motion. `App` applies `fo-motion-reduced` (1 ms transitions), `AppCard` uses 0 ms turn and still moves focus to Run. ✔ — but see F3 on the "no text jitter" acceptance.

---

## 7 · Defect list

| # | Sev | What a user sees | Where | Reproduction / missing evidence |
| --- | --- | --- | --- | --- |
| F1 | **Sev-1** | The interactive boundaries — app/folder card edges and the Open/More button outlines — are effectively invisible to low-vision users: light Glass draws a *white* border on a near-white card (1.22:1); every other combination measures 1.1–2.3:1 against the stated 3:1 bar. Focus indicators themselves pass everywhere. | Every viewport; Solid **and** Glass; light **and** dark; mouse and keyboard target identification. | Home in Light · Glass at any width; measure border pixels (see `contrast-check.mjs` table §1). **Missing evidence:** no Solid-surface screenshot exists at all, so the Solid half of this bar was verified from code only. Fix is cheap: define `--fo-glass-border` per theme and raise `--fo-border` (e.g. ~45 % ink equivalent) so border/fill vs page ≥ 3:1. Per the owner's rule (stated release-bar criterion → Sev-1), this blocks. Caveat for the owner: WCAG 1.4.11 applies to the visual information that identifies a component; if the owner judges the card boundary decorative because grid layout and text carry identification, this can be re-scoped — that judgement is theirs, and the numbers above stand either way. |
| F2 | Sev-3 | None (evidence note only). | Release README §Turn frames. | The note says the frames are "at 25 %, 51 % and 69 % of a **1600 ms** turn", but the shipped turn is `--fo-dur-flip: 520 ms` and nothing in `src` produces 1600 ms (no override, `playbackRate` or `getAnimations` hook). Either the capture replayed a slowed turn — then say so — or the figure is wrong. Same paragraph's "56 frames in 900 ms during a full turn" also exceeds the 520 ms turn. The frames still support the bleed fix visually; the note must be corrected. |
| F3 | Sev-4 | None (evidence gap). | Motion acceptance: "60 fps with no layout shift **or text jitter**". | Static frames cannot observe jitter, CLS 0 does not cover it, and no video or per-frame capture is recorded. The jitter claim is currently unevidenced, not disproven. |
| F4 | Sev-4 | None (evidence inconsistency). | `sprint-2/WI-031/320-long-username.jpg` vs its README. | The image shows the username wrapping to two lines; the note claims `alexandr…` truncation. `release/11` shows the shipped truncation — re-point the WI-031 note at it or re-capture. |
| F5 | Sev-4 | Folder lid and app-tile graphics are faint (26 %/56 %/14 % accent mixes, well under 3:1). | Folder/app cards, all themes. | Measure per `contrast-check.mjs`. Likely acceptable because the text labels carry identification; recorded for owner review under 1.4.11 "graphical objects". |
| F6 | Sev-5 | None. | `release/08-missing-file.jpg`. | Uncited by the release README, and the shown state (missing *text* file, generic message) does not demonstrate the stated "type and size" unavailable state for non-text/oversized files — no image of that state exists in the evidence. |

**Limitations (not defects):** no stylus, controller, touch screen or physical phone was available; narrow layouts were container previews; the refresh/reconnect/back-focus rows rest on the run log, which I could not re-drive; frame pacing was sampled in JavaScript on one machine; the System-theme first-run default (which resolves **dark** on the QA machine) is described but never screenshotted — every journey image is alice's saved Light; screen-reader output was outside this visual review.

---

## 8 · Verdict

**FAIL** on the stated visual release criteria — text contrast, focus visibility, narrow layouts, the mid-flip bleed fix, motion tokens and cursor geometry all pass on the evidence, but F1 (component boundaries at 1.1–2.3:1, including a white-on-near-white light Glass edge caused by the undefined `--fo-glass-border`) fails the owner's stated 3:1 interface bar in all four theme × surface combinations. By the owner's own severity rule this is the release-blocking Sev-1. The fix is a small, cheap token change; if the owner instead rules the card boundary out of 1.4.11 scope, the release criteria would pass as evidenced.

---

# Retest · 26 November 2026 (candidate revised in the working tree; commit follows)

Method: re-read `src/styles.css` from the working tree, refreshed the token inputs in `contrast-check.mjs`, recomputed every border ratio independently (alpha compositing, WCAG 2.1 luminance, worst-region bound plus a physical sweep over tint alpha), and inspected the supplied and neighbouring evidence. One correction to my own first report: my `saturate(1.35)` helper skipped the linear→sRGB re-encode, which understated some glass numbers (light primary-on-glass was published as 12.87; correct value 15.14). The error was conservative in direction and changes no first-report verdict; all Retest numbers below use the fixed helper.

## New border tokens — independent computation

Code confirmed: `--fo-border: #5f7088` and `--fo-glass-border: #5f7088` in **both** theme blocks (`styles.css` 27–45); the glass and dark-glass overrides now consume `var(--fo-glass-border)` (lines 260, 266); card actions (line 382), card note (408), Settings options (612), the state panel (546) and the header rule (101) all use the token. The white-fallback mechanism from the first review is gone.

| Boundary | Light Solid | Dark Solid | Light Glass (bound) | Dark Glass (physical) | Dark Glass (bound) |
| --- | --- | --- | --- | --- | --- |
| Card border vs page | **4.49** | **3.71** | **3.51** | **3.17–3.45** | 2.42 ✘ (unreachable) |
| Card border vs card / glass fill | **5.05** | **3.34** | **4.42** | **3.21–3.39** | 2.96 ✘ (unreachable) |
| Open/More + Settings pill border vs card | **5.05** | **3.34** | — | — | — |
| Hover border mix (34% accent + token) | **5.67** | **4.91** | — | — | — |

The dark-glass bound rows deserve the number in full: at the theoretical full-strength blue tint the fill side gives **2.96:1** and the page side **2.42:1**. That composite is not reachable: the blue radial's centre sits at −10 % viewport height (off-screen), so the strongest tint under any card row is alpha ≈ 0.06 (evidence geometry, card tops at y≈189 at 1232×871) to ≈0.08 (small windows), and the sweep puts the 3:1 crossover at alpha ≈ **0.197** (fill side) and ≈ **0.096** (page side). Every physically achievable composite clears 3:1 on both sides. Blue and purple tints do not overlap at card height (verified geometrically).

**Watch item (not a defect):** the dark-glass page-side margin is the thinnest number in the fix — crossover at tint alpha 0.096 against ≈0.06–0.08 achievable. Keep assumption 10's recompute hook; if a future layout ever starts card rows materially higher, this is the number to recheck.

## Evidence

- `sprint-5/WI-042/glass-borders-fixed.jpg` — light Glass, Home shelf: every card edge clearly delineated; focus ring and brackets visible. ✔
- `sprint-5/WI-042/solid-borders-fixed.jpg` — light Solid, Settings preview on the real `AppCard`/`FolderWidget`: crisp boundaries on cards and pills. ✔
- `sprint-5/WI-042/dark-glass-borders-fixed.jpg` — Blair's Dark·Glass home: clearly visible borders against the dark page. ✔ (Present in the folder though not listed in the retest request; it closes the dark-surface visual gap.)
- Residual scope note: the Solid evidence is the Settings preview (same components), not the Home shelf in Solid; acceptable, recorded precisely.

## Per-finding result

| Finding | Sev at first report | Retest result |
| --- | --- | --- |
| F1 component boundaries under 3:1 | Sev-1 | **PASS** — solid token `#5f7088` everywhere, all physically achievable theme × surface composites ≥ 3.17:1 (table above); boundary visible in all three supplied screenshots. Watch item recorded. |
| F2 turn-duration note (1600 ms vs 520 ms) | Sev-3 | **PASS** — release README now states the capture was deliberately slowed to 1600 ms by overriding `--fo-dur-flip` and names the shipped 520 ms; WI-044 states the 900 ms sample deliberately includes the settle. Consistent with the code. |
| F3 text-jitter acceptance unevidenced | Sev-4 | **PASS** — WI-044 "Not measured" now records jitter as unmeasured/evidence-limited (paused frames show no wrap, size change or reflow); assumption 8 repeats it. The claim is withdrawn, matching the evidence. |
| F4 stale WI-031 truncation image | Sev-4 | **PASS** — replaced by `320-long-username-final.jpg`, which does show `alexandr…` at 320 px; the README discloses that the old image showed a pre-fix wrap. |
| F5 folder/app graphics under 3:1 | Sev-4 | **OPEN, correctly recorded** — unchanged in CSS (26 %/56 %/14 % accent mixes), deliberately retained because labels carry identification; assumption 10 registers it as a Sev-4 visual observation for the owner. Non-blocking. |
| F6 uncited missing-file evidence / type-and-size state | Sev-5 | **PASS** — release README now cites `08-missing-file.jpg` and records the non-text/oversized state as unreachable through v0.1 (UTF-8 ≤ 64 KiB, no size exposed), formalised as assumption 9 with a verify/reverse path. |

Revised Sev-1 count: **0**. Unchanged limitations stand (no physical phone/touch/pen/controller; container previews; single-machine frame sampling; System-theme first-run dark surface described, not screenshotted).

## Revised verdict

**PASS** on the visual release criteria. Text contrast passes everywhere including worst-case glass; the interface boundaries now clear 3:1 in all four theme × surface combinations on every physically achievable composite (thinnest margin: dark-glass page side, 3.17:1 at the maximum on-screen tint); the note corrections are accurate. Remaining items are non-blocking: the Sev-4 folder/app graphic observation for owner review, and the watch item on the dark-glass margin.
