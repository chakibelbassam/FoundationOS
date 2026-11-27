# Brief · WI-049 design rebuild · Home Bento and File Explorer

Role: Muse Spark 1.3 Contributor (`opencode-go/muse-spark-1.3-contributor` at `xhigh`). Target `versions/0.2 FoundationOS/FoundationOS/`. No Git. Do not edit `qa/`, `agents/` or Scrum.

The owner reviewed the Sprint-6 candidate and rejected the current visual result:
- The Bento tiles are four equal rectangles. **File Explorer must be a small 1×1 app-like square**, not the same size as Projects/Apps.
- Projects/Recent/Activity do not look designed; typography, iconography and spacing are unpolished.
- The File Explorer is bare. The SVAR library ships a complete, clean demo (icons, tree, table, breadcrumbs, info/preview pane). **Copy and adapt the demo's presentation**, keeping our read-only data. The owner supplied the SVAR demo screenshot (Pictures folder, vivid file icons, Add New, preview pane, information panel) as the bar.

## Home · Magic Bento

Use the actual vendored MagicBento with deliberate mixed sizes on a 4-column desktop grid, for example:
- **File Explorer**: 1×1 small square in the top-left, like an app tile (folder icon, “Files”, a short line such as the folder count or “Private home”, one clear action).
- **Projects**: 2×1 wide tile (up to three projects + Show all).
- **Recent apps**: 3×1 wide tile on the second row (up to three apps + Show all) or 2×1 depending on the final composition; no holes.
- **Activity**: 1×2 tall panel on the right, truthful idle state.

Aim for a composed bento, not equal cards: one small app square, one wide list, one tall panel. Keep every entry a single activation target, tab order, visible focus, and the <720 px auto-height stack. Add restrained detail: Material icons per row, path only when it differs from the name, counts (“3 pinned”, “3 recent”), a quiet hover/spotlight, and consistent 8 px spacing.

## File Explorer · match the SVAR demo

- Use the library's **default vivid icons** (folder and file-type icons) or vendor the SVG icon set locally under `public/` so it works offline. Map folder/file ext icons; fall back to a generic file icon. Do not leave blank thumbnails.
- Keep **table** as the default with Name / Size / Date columns, add the **info/preview pane** (`preview`) for the selected item, and the tree + breadcrumbs. If a text file is selected, show a text preview or the Information panel; hide the preview **download** control (and any other unsupported control) rather than exposing it.
- Hide Add New, upload, rename, delete, copy, move and download as before. Do not add unsupported operations just because the demo shows them.
- Polish: tree width and ellipsis (no horizontal scrollbar for long names), row hover/selection, header alignment, search placement, spacing, empty state, and the narrow single-pane layout. Remove duplicated headings if the SVAR toolbar already says “Files”.
- Keep deep links, Back focus, per-folder lazy loading, Pin/Unpin, member switching and the existing reader hand-off.

## Verify

- Run the suites/build. Use the connected browse integration if available to capture before/after screenshots at desktop and 390 px, and iterate until the Home composition is intentional and the explorer resembles the SVAR demo rather than a bare table. Save screenshots under `versions/0.2 FoundationOS/agents/muse/WI-049/` (secret-free).
- Report the final composition (which tile spans what), the explorer props/icons/preview choices, and any existing behaviour that changed. Stop when the visuals are ready for the owner/tester review; no new product scope.
