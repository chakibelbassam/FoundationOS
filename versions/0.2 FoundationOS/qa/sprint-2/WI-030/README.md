# WI-030 · Predictable shelf navigation and cursor targets

Candidate `b8459c6`. Desk viewport, keyboard and mouse.

## Arrows

| Sequence | Observed |
| --- | --- |
| Journal → ArrowRight | Photos |
| Photos → ArrowRight | Weather desk |
| Weather desk → ArrowRight (edge) | focus stayed on Weather desk |
| Weather desk → ArrowDown (last row) | focus stayed |
| Weather desk → ArrowLeft | Photos |
| Weather → ArrowLeft while the pointer was parked over Broken | Projects received focus and the brackets moved to Projects |

One key press moved one visible neighbour; boundaries kept focus; pointer movement did not steal keyboard focus.

## Target ownership

| Target | Element rect | Bracket box |
| --- | --- | --- |
| Folder card (graphic + label) | 47,189 → 261,385 | 43,185 → 264,389 |
| Settings icon button | 1157,30 → 1187,58 | 1153,26 → 1191,62 |
| Run action | 990,288 → 1042,325 | 986,284 → 1046,329 |
| More menu item | 990,374 → 1119,401 | brackets followed the item; a small offset remained while the menu was still animating (recorded Sev-4 observation) |

During the card turn (`data-target-lock`) the brackets stay on the card outline even with the pointer over Run.

## Return and scroll

Back from `alpha` focused the `alpha` folder card; Back again focused `Projects`. Returning from the reader focused `Open README`; returning from the overview revealed the card and focused `Open`.
