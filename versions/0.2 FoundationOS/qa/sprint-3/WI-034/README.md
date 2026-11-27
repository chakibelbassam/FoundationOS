# WI-034 · Reveal and operate the app card actions

Candidate `b8459c6`. Desk viewport, mouse and keyboard.

| Check | Expected | Observed |
| --- | --- | --- |
| Quick pointer pass (< 1 s) | no reveal | front stayed visible |
| Continuous hover 1.3 s | reveal | back face shown after ~1 s |
| Leave at 0.6 s, wait | timer cancelled | no reveal |
| Deliberate click | reveal immediately, keep face | revealed; URL unchanged |
| Keyboard Enter | reveal and focus Run when settled | active element `Run` |
| Second activation | Run explains availability | inline note: “Running apps isn't available yet. Choose Open to inspect Weather.” |
| Tab order on the face | Run, Open, More | Tab from Run → Open |
| Escape with More open | closes menu first | menu closed, face still open, focus `More` |
| Escape again | closes face | face closed, focus returned to the card trigger |
| Held Enter | no action on key repeat | repeated keydowns on Run are prevented (`AppCard.test.tsx`) |
| Reduced motion | immediate face change | Motion Off member: no turn, same actions |

Back from the overview returned to the revealed card with **Open** focused.
