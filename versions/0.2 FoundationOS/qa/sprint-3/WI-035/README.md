# WI-035 · Flip and cursor handoff polish

Candidate `b8459c6`. Desk viewport, Glass surface, motion On.

The owner's reported symptom was a background layer visible midway through the turn. Two causes were found and fixed:

1. The card backing faded in over 240 ms, so early frames let the page show through. It is now opaque for the whole turn.
2. Both faces painted through each other because Chrome ignored `backface-visibility` on the clipped glass face. The incoming face is now hidden until the turn passes edge-on, and both faces drop `backdrop-filter` and use an opaque colour while the turn runs. Resting cards keep Glass.

Frames (real transition paused through the Web Animations API):

| Frame | Turn position | Observed |
| --- | --- | --- |
| `../../release/05-turn-front-25.jpg` | 25% | front readable, card opaque, neighbours still |
| `../../release/06-turn-edge-50.jpg` | 51% | card edge-on, no page content visible through it |
| `../../release/07-turn-back-70.jpg` | 69% | back readable, no front text, neighbours still |

Neighbour rectangles were identical before and after the turn (Broken 47,189; Projects 741,189; Weather 973,189; 214 × 196 each). The cursor brackets lock to the card outline for the duration.
