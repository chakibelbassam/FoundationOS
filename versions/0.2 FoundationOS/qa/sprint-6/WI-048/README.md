# WI-048 · Cancel app-card hover on scroll

- The capturing window scroll listener is always mounted while a card can dwell, so a scroll of the page or a nested scrolling surface clears the pending reveal. Deliberate click/tap/Enter/Space, keyboard Run focus, Escape order and reduced motion are unchanged.
- `AppCard.test.tsx` covers pointer enter → 500 ms → scroll → no reveal after a further 1000 ms, the same via a nested surface, pointer-exit cancellation, a fresh hover after scroll, and the reveal/escape paths.
- Live measurement in the tester pass was inconclusive for the automated timing, but the unit regression and manual hover/scroll checks pass; a physical stylus was unavailable.
