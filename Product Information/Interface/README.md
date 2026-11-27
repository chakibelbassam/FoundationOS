# Interface guide

Design reference · proposed for versions 0.2 through 0.7. Compose controls from **MUI** or **React Bits** — the two component sources — and use Material Icons. MUI owns application surfaces, forms, dialogs, navigation and layout. React Bits owns distinctive visual and motion components. React Bits components are styled with **Tailwind**, imported with preflight disabled so it does not reset MUI or the app CSS. Give icon-only actions names. Keep focus and neighbours stable while widgets expand. Preview shared settings before saving. Offer a useful next action when empty and distinguish loading from unavailable.

| Surface | Intended behaviour | Status |
| --- | --- | --- |
| Workspace | Rows of folders and apps, keyboard selection, Show guidance files setting for README.md, AGENTS.md and MEMORY.md | Planned 0.2–0.4 |
| App view | Top bar, embedded app and focus restoration on return | Planned 0.4–0.7 |
| Edge | Movable return control, suggestions, chat and dictation lock | Planned 0.6 |
| App Studio | Import task, running status, retry Connect Edge | Planned 0.7 |
