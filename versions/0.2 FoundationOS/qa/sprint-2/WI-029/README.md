# WI-029 · Browse Home and nested folders

Candidate `b8459c6`. Desk viewport, mouse and keyboard.

| Check | Expected | Observed |
| --- | --- | --- |
| Home shelf | One folder widget at every depth | Home and folders use `FolderWidget`; app folders use `AppCard` |
| Nested open | Projects → alpha | `/folder/Projects` then `/folder/Projects/alpha`; breadcrumbs matched |
| Graphic or label | Same destination | the whole card is one button |
| Keyboard | Enter opens the folder | Enter opened `alpha`; heading received focus |
| Direct URL | Built client loads a nested route | `/folder/Projects/alpha` after reload and reconnect |
| Back | Restores the originating folder card | browser Back returned focus to `alpha, folder. Open.` |
| Empty folder | Clear message and a way up | `Empty` showed “This folder is empty” with Go up |
| Missing folder | Distinct unavailable state | unavailable state with Go Home |
| Offline | Retry state | server stopped → “The server is not reachable” with Try again (`../sprint-5/`) |

The shelf reproduces the same widget at Home and two levels deep; no horizontal scrolling at 320 px.
