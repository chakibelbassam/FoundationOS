# WI-049 · Integrated workspace polish

The owner rejected the first integrated Home/explorer. This item records the redesign and the functional polish.

## Home

- Composed 4-column Bento: Files **1×1 app square** top-left, Projects 2×1 top-right, Recent apps 3×1 lower-left, Activity 1×2 right. Single-line rows with icons; nested entries show `Name · path` inline; root entries show one line. Counts (“3 pinned”, “3 recent”) and Show all links.
- Measured with three pinned projects and three recent apps (two nested): every tile `scrollHeight == clientHeight`, Show all fully visible, desktop 1307/1024 and 390/320 stacking with no horizontal overflow. Images: `../WI-052/home-desktop.png`, `home-390.png`.
- Magic Bento follows the system theme; the spotlight/intro respects reduced motion.

## Explorer

- Adopted the SVAR demo presentation: official vivid folder/file-type SVGs, the official `wxi` toolbar font vendored locally, tree + breadcrumbs, Name-only table, info/preview pane, Back-to-Home, a single visible “Files” title.
- Size/Date columns are hidden because v0.1 exposes neither; Date is omitted from Information. Add New, download, upload, rename, delete, copy and move remain absent and intercepted.
- Narrow (<768 px): SVAR’s own narrow mode otherwise showed only the info pane. The view now keeps the list/search/toolbar primary, adds Show/Hide details, delays single-tap preview by 300 ms so double-tap opens the reader, and hides the dead tree toggle. Verified at 390×600 and 320×600 (`../WI-051/narrow-*`).
- Tree long names ellipsize with no horizontal scrollbar; Name sort toggles asc/desc/asc by mouse and keyboard.

## Other polish

- Global `:focus-visible` ring (3 px accent, 2 px offset) on buttons, links and role=button, including MUI controls; the existing card/action rings remain.
- Return focus from an app overview to its originating Apps/Home/Projects row; heading fallback.
- Follow-system motion subscribes live to `prefers-reduced-motion` and updates the shell/background.
- The server chip recovers on the first successful request and retries at 2 s/5 s after failure instead of staying “Server offline” for 30 s.
- Tests: 75/75 client, 16/16 host+launcher, 3/3 fixtures, clean build.
