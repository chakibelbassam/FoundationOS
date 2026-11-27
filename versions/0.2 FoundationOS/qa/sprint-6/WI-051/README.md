# WI-051 · SVAR File Explorer

- `/files` and `/files/<path>` render SVAR File Manager 2.6 read-only, with member-relative ids, per-folder lazy loading through `/api/files`, deep links, Back, Pin/Unpin and the existing text reader at `/file/<path>`.
- Data: root and nested listings load reliably; every route carries its ancestor chain so two-level paths do not crash; malformed/absent `app.json` never blocks browsing. Missing/empty/offline have visible states and retry.
- Unsupported actions: Add New, upload, download, rename, delete, copy and move are removed from menus and intercepted; the preview download icon is hidden and intercepted. Size/Date columns are hidden (no data).
- Presentation: vivid SVAR icons (vendored SVGs), local `wxi` toolbar font, table mode, info/preview pane, tree without horizontal scroll; Name-only table; Name sort toggles.
- Narrow: list/search/toolbar primary; Show/Hide details; single tap previews, double tap opens the reader; verified at 390×600 and 320×600.
- Images: `explorer-desktop.png`, `explorer-edge.jpg`, `narrow-list-390.png`, `narrow-details-390.png`, `narrow-list-320.png`.
