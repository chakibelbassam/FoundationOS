# Brief · WI-052 Magic Bento Home and WI-053 React Bits backgrounds

Role: Muse Spark 1.3 Contributor (`opencode-go/muse-spark-1.3-contributor` at `xhigh`). Target `versions/0.2 FoundationOS/FoundationOS/`. No Git; do not edit `qa/`, `agents/` or Scrum. Do WI-052 first, then WI-053; both integrate with the shell and preferences.

Already prepared by Edge:
- Official React Bits sources vendored under `src/vendor/reactbits/` (`MagicBento.jsx/.css`, `Topography`, `MagicRings`, `Lightfall`, `GhostFibers`, `LICENSE.md`). Keep the licence notice. Installed: `@hugeicons/react`, `@hugeicons/core-free-icons` (Magic Bento demo visuals).
- `public/qa/viewport.html` is Edge's viewport harness; leave it alone.

## WI-052 · Magic Bento Home

Use the actual `MagicBento` component (spotlight border, intro, tilt/magnetism options as configured), not a lookalike. Replace `/` with a Bento Home; keep `/folder`, `/app`, `/file` and `/files` routes working.

Four tiles in a 4-column grid (desktop):
- **File Explorer** — upper left, spans 2×2; one action opens `/files` at the root.
- **Projects** — upper right; up to three project rows and **Show all projects**. A project is a folder the member pinned. Each row opens `/files/<path>`.
- **Recent apps** — lower left; up to three apps and **Show all apps**. Only a deliberate overview open (`/app/<path>`) records recency. Each row opens `/app/<path>`.
- **Activity** — lower right, spans the remaining 2×2; show a truthful idle/unavailable state explaining that no activity source is connected yet. Do not invent events.

Data and actions:
- Extend the preference schema (client + host validation) with `projects: string[]` (pinned member-relative folder paths, cap 8) and `recentApps: string[]` (cap 8). Existing saved settings and the five existing keys stay valid; missing values receive safe defaults.
- Add a **Pin as project / Unpin** control in the File Explorer header for the current folder (or an equally discoverable single control), persisting through the existing Apply-style save used by preferences (immediate save is acceptable if failure is surfaced).
- Add `/projects` (all pinned projects, empty state with a link to the explorer) and `/apps` (all recognised apps, with a clear scope statement). Apps inventory must not reuse the shelf's 12-probe budget as a workspace-wide claim: probe the member's root folders plus each pinned project folder, state the scope in the UI, cap total probes at 24 with three concurrent workers, and cache per member for the session.
- Each entry is one activation target (click, tap or Enter), normal tab order, visible focus, mobile stacking at narrow viewports. Back restores its source tile.
- Preserve reconnect and return focus.

## WI-053 · Backgrounds with Topography default

- Extend preferences with `background`: `standard | topography | magic-rings | lightfall | ghost-fibers`; default **topography** when missing or on Reset. Preserve an explicit choice and all other settings across restarts and ports.
- Mount only the selected effect. Use the vendored React Bits components with subdued opacity/color so text keeps WCAG AA in Solid and Glass (measure secondary text and at least one action), and so the card flip/cursor layering stays on top.
- Static fallback (no canvas, readable gradient) when Motion is Off, when Follow system resolves to reduced motion, when WebGL/canvas init fails, or when the effect throws. Release animation frames, GL contexts, observers and listeners on switch/unmount; pause when the tab is hidden.
- Cap device pixel ratio at 1.5–2 and avoid layout shift. No effect may intercept pointer/touch input.
- Appearance page: five options with live preview on the real shell, Apply, Cancel, Reset; Reset previews Topography. Keep About and the other pages intact.
- Add tests for the default (missing → topography), persistence, fallback decision (motion off / unsupported) and effect cleanup where practical.

## Shared rules

- `npm test`, `npm run build`, host + launcher + fixture tests must pass.
- Keep changes attributable: report per item, files, before/after, commands/counts and assumptions.
- Do not claim the Home or backgrounds are verified in the browser; Edge and the two independent reviewers do that.
