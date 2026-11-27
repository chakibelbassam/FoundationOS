# Brief · WI-051 Integrate SVAR React File Explorer

Role: Muse Spark 1.3 Contributor (`opencode-go/muse-spark-1.3-contributor` at `xhigh`). Target `versions/0.2 FoundationOS/FoundationOS/`. No Git; do not edit `qa/`, `agents/` or Scrum. Depends on Phase A (session boundary) being merged in the working tree.

Package already installed: `@svar-ui/react-filemanager@2.6.0`. Import `Filemanager` and `@svar-ui/react-filemanager/all.css` (verify the CSS path in `node_modules/@svar-ui/react-filemanager`).

Read the follow-up's File Explorer section and the draft `scrumWorkspace/documents/drafts/workspace-home-and-file-explorer.md`. Use Context7 (`/svar-widgets/react-filemanager`) for the API rather than guessing.

## Behaviour

- **Route.** Add `/files` and `/files/*` (member-relative path). Deep links must load the explorer at that folder; refresh/reconnect returns there; Back restores the previous view and a reachable focus target.
- **Data.** Start at the root with `GET /api/files`; lazy-load each folder with `GET /api/files/{path}` when SVAR requests it (`onRequestData` → `api.exec('provide-data', { id, data })`). Map v0.1 entries to SVAR items with ids as member-relative POSIX paths (`/` for the root, `/Projects/alpha`, …). Do not invent sizes or dates: omit them or show an explicit unknown; never fake metadata.
- **Navigation.** Folder opens stay on `/files/<path>` (push, so Back works). `open-file` opens the existing text reader at `/file/<path>` with return state; Back restores the explorer folder and focus (at minimum the explorer heading; prefer the file row when it still exists).
- **Read-only.** `readonly` plus a `menuOptions` filter that removes download, upload, add, rename, delete, copy and move from the body and item menus. Intercept `download-file` and any unsupported action so nothing happens even via menu or keyboard. Verify no toolbar button exposes an unsupported operation.
- **Search and sort.** Keep SVAR's loaded-directory search and sorting. Do not claim workspace-wide search.
- **States.** Loading, empty folder, missing folder (404), offline (502) and expired session each have useful feedback and a next action. SVAR must not silently show an empty folder on failure.
- **Session and member.** Remount/clear the explorer on member change; a stale member's data must never render. Reuse the Phase A abort/generation handling.
- **Look and feel.** Fit the existing theme (light/dark, Solid/Glass), normal tab order, visible focus and target cursor. Desktop uses tree + list; narrow viewports fall back to a single pane without horizontal scrolling.
- **Home and app links.** Any existing "Browse files" entry point should go to `/files/<path>`; keep the text reader and the v0.1 API unchanged.

## Tests and evidence

- Unit tests for the path↔SVAR id mapping and the menu filter (unsupported actions absent).
- `npm test`, `npm run build`, host + launcher tests, fixture tests.
- Report what you verified in the built client (you may run it), with the exact routes and observed results; do not write into `qa/`.
- Do not start the Bento Home or backgrounds; report back after the explorer is working.
