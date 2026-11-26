# Release evidence · v0.2 client foundation

Candidate: `edge-opencode/pi-02-client-foundation` at `d4a59f3` plus the retest evidence commit (see PR #9).
Pair: client 0.2 · server 0.1 schema 2 (released v0.1 server, started separately).
Entry point: `versions/0.2 FoundationOS/Start.cmd http://127.0.0.1:52093 --no-open` → printed `FoundationOS 0.2 client ready at http://127.0.0.1:61052/` (the launcher defect found by WI-040 was fixed before this run).
Browser: OpenCode built-in Chromium (Edge-family desktop), Windows 11, the URL printed by the launcher.
Windows display setting: dark theme; the default Theme `System` therefore resolves dark for members without a saved choice.
Input: mouse and keyboard through the in-app browser; the stylus, controller and a physical phone were not available.

## Desired journey

| Step | Expected | Observed | Evidence |
| --- | --- | --- | --- |
| Connect | Existing member session token accepted, profile shown, token in memory only | alice connected; header showed `Connected`, `alice` | `01-home-desktop.jpg` |
| Find Weather | App card in place, order stable as descriptors arrive | Weather became an app card in item 5 without moving | `01-home-desktop.jpg` |
| Reveal actions | Run · Open · More, focus on Run after keyboard reveal | Keyboard Enter revealed; active element `Run`; Escape closed and restored the trigger | `02-weather-actions.jpg` |
| Open | Overview with name, path, brief, Open README and Browse files | `/app/Weather` showed all of them | `03-overview.jpg` |
| Read README | Reader with the private text at `/file/Weather/README.md` | README text shown, including `Weather 0.2` | `04-reader.jpg` |
| Refresh | Connect at the same URL, last member named | Connect shown at `/file/Weather/README.md`, `Last member on this browser: alice` | run log |
| Reconnect | Same file under the same member | returned to `/file/Weather/README.md` | run log |
| Back | Reader → overview with Open README focused | focused element text `Open README` | run log |
| Back again | Overview → Home with Weather revealed and Open focused | `revealed=true`, focused text `Open` | run log |

## Two-member and settings evidence

- Alice saved Light · Glass · Comfortable · Motion On · Target; Blair saved Dark · Glass · Compact · Motion Off · System.
- The client was stopped and relaunched on a different port; reconnecting as each member restored that member's settings and home (Alice: Projects present; Blair: Journal, Photos, Weather desk).
- A member with no saved preferences (alexandra-montgomery) received the recorded defaults: System theme, Glass, Comfortable, On, Target.
- A read-only preferences file made Apply fail: the error was shown, the UI kept the attempted preview, and `preferences.json` still held the previous values.
- Full detail: `../sprint-4/WI-036/`, `../sprint-4/WI-037/`.

## Visual and responsive evidence

- `08-missing-file.jpg` — a deleted text file shows “This file is not available”. v0.2 cannot reach a non-text or oversized state because the v0.1 API stores only UTF-8 text up to 64 KiB (recorded in the assumptions).
- `09-390-home.jpg`, `10-390-overview.jpg`, `11-320-long-name.jpg`, `12-320-home.jpg` — narrow layouts. They were produced by the built client's `?w=390` and `?w=320&h=600` preview, which constrains the app container and switches the container queries; they were not captured on a physical phone, so touch scrolling and a real visual viewport were not exercised. At 320 px `scrollWidth = clientWidth = 320`, the header wraps, the long username truncates with the full value in its title and menu, and the card actions stay inside the card.

## Turn frames

`05-turn-front-25.jpg`, `06-turn-edge-50.jpg`, `07-turn-back-70.jpg` are real transition frames paused through the Web Animations API at 25%, 51% and 69% of a turn that was **deliberately slowed to 1600 ms** for capture by overriding `--fo-dur-flip`; the shipped turn is 520 ms. The card stays opaque, only one face is readable at a time, the page never shows through the card, and the three neighbouring cards keep identical geometry.

## Final candidate run

The journey above was repeated on a fresh pair after the last code commit: server v0.1 on port 52093, client 0.2 started through the **real launcher** — `Start.cmd http://127.0.0.1:52093 --no-open` printed `FoundationOS 0.2 client ready at http://127.0.0.1:61052/`. Member alice with no saved preferences received the owner defaults: System theme (dark on this Windows), Glass, Comfortable, On, Target. An earlier run on ports 52662/60553 confirmed alice's saved Light Glass preferences after a restart.

- `13-final-home.jpg`, `14-final-actions.jpg`, `15-final-overview.jpg`, `16-final-reader.jpg` — the fresh pair with alice's saved preferences.
- `17-final-launcher.jpg` — Home reached through the launcher-printed URL, with the default dark Glass surface and the raised card boundary.
- Refresh showed Connect at the same URL with `Last member on this browser: alice`; reconnecting restored the reader; Back focused Open README; the second Back revealed the card and focused Open.

The launcher's unquoted-parenthesis defect found by WI-040 is fixed; `tests/launcher.test.mjs` now covers the positional URL.

## Not covered by this folder

Independent QA reports live in `../../agents/qa/WI-040/` and `../../agents/qa/WI-041/`; retests and remaining findings are in `../sprint-5/`.

