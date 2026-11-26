# WI-044 · Motion system

Candidate `b8459c6`. Tokens are recorded in the [component inventory](../../../../Product%20Information/Interface/Components/README.md#motion-system-wi-044).

| Token | Value |
| --- | --- |
| hover | 120 ms |
| menu | 160 ms |
| face | 240 ms |
| flip | 520 ms |
| route | 200 ms |
| standard easing | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| flip easing | `cubic-bezier(0.45, 0, 0.55, 1)` symmetric — 50% of the time is edge-on |

## Measured

The tab was focused before measuring, so requestAnimationFrame ran at the display rate.

- Idle: 38 frames in 600 ms, average 16.7 ms, maximum 17.1 ms.
- During a full turn: 56 frames in 900 ms, average 16.7 ms, maximum 17.0 ms, **0 frames over 20 ms** (~60 fps).
- Layout shift (`PerformanceObserver('layout-shift')`, recent input excluded): **0.000**; the cursor overlay was changed to transform-only movement after an earlier run showed 0.005 from its fixed box.
- Neighbour geometry unchanged before and after the turn.

## Reduced motion

Motion **Off** produced the `fo-motion-reduced` root class, 1 ms transitions and an immediate back face with all actions available. **Follow system** resolves through `prefers-reduced-motion`. Motion stays On by default when Windows requests reduced motion, per the owner decision.

## Not measured

The display refresh and compositor of this machine only; no low-end device or phone was available. Frame pacing was sampled in JavaScript, not with a system-level profiler.
