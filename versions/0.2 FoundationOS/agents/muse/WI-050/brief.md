# Brief · WI-050 hands-on tester (Muse Spark 1.3 Contributor)

You are the **hands-on tester**, a separate agent session from the developer and from Edge. Do not edit product code, Git, `qa/` or Scrum records. Write only under `versions/0.2 FoundationOS/agents/muse/WI-050/`.

Candidate: the latest PR #9 head given in the message that starts your run. Tested pair: built client 0.2 against the released v0.1 server, both started separately.

## Set up your own disposable run

Use `%TEMP%\wi050-tester\` for everything. Never use `%LOCALAPPDATA%\FoundationOS` or another agent's ports.

1. Server:
   ```
   $env:FOUNDATIONOS_DATA="$env:TEMP\wi050-tester\store"
   node "versions\0.1 FoundationOS\FoundationOS Server\server.ts"
   ```
   Read the printed admin key and URL from its log.
2. Base homes + nested fixtures:
   ```
   $env:FOUNDATIONOS_ADMIN_KEY=<admin key>
   node "versions\0.2 FoundationOS\FoundationOS\tests\fixtures\seed.mjs" --server <url> --out "$env:TEMP\wi050-tester\fixtures.json"
   $env:FOUNDATIONOS_SESSION=<alice token from fixtures.json>
   node "versions\0.2 FoundationOS\FoundationOS\tests\fixtures\seed-sprint6.mjs" --server <url> --member alice
   $env:FOUNDATIONOS_SESSION=<blair token>
   node "...\seed-sprint6.mjs" --server <url> --member blair
   ```
   Never paste a token into a report or screenshot; redact it.
3. Client through the real Windows launcher:
   ```
   versions\0.2 FoundationOS\Start.cmd <server url> --no-open --data-dir "%TEMP%\wi050-tester\client"
   ```
   Use the URL it prints. Track the PIDs you started and stop only those at the end; verify they exited.

## Browser rules (OpenCode built-in browser only)

- Drive the **built-in browser** (`browser.tabs.open`, `snapshot`, `click`, `fill`, `press`, `evaluate`, `screenshot`, `wait`). Do not launch Chrome or another browser. Do not count another agent's run as yours.
- Desktop: use the tab opened at the launcher URL.
- Real narrow viewports: open `<launcher URL>/qa/viewport.html?w=390&h=600&url=/` and `...?w=320&h=600&url=/`. The app runs in an iframe whose layout viewport is exactly that size; confirm `innerWidth`/`innerHeight` inside the frame with `evaluate` and a frame id from `browser.frames`. Interact inside the frame using its refs.
- Record the actual viewport, browser, input method and candidate SHA for every scenario, plus a screenshot in your folder.

## Journeys (all mandatory for you)

1. **Primary journey** at desktop and at 390×600: Home → File Explorer → open Projects/Weather (nested) → app card → reveal `Run · Open · More` → Open → overview → README → refresh → Connect → reconnect as the same member → same file → Back → Back → focus restored. Run explains availability.
2. **Session and members.** Disconnect, connect as Blair; confirm Blair's home, settings and recent apps; confirm no Alice content or stale response appears. Restart the client on another port and check both members' settings.
3. **Defects.** Nested Weather folders (Projects/Weather, Archive/Weather, root Weather) have distinct descriptors and actions; scrolling during a ~0.6 s hover cancels the reveal (fresh hover and click still work); stale requests after a switch are discarded.
4. **Explorer.** Deep links, refresh/reconnect, Back, loaded-directory search and sort, empty/missing/offline states, and unsupported operations (download/upload/delete/rename) absent from toolbar, menus and shortcuts.
5. **Bento Home.** Each tile opens the right place; up to three projects and three recent apps; Show all routes; Activity is honest; pin/unpin a project; mobile stacking; keyboard activation and focus return.
6. **Backgrounds.** Topography on first run with no saved background; Standard, Magic Rings, Lightfall, Ghost Fibers via Appearance; Preview/Apply/Cancel/Reset; Motion Off and Follow-system fallback; Solid and Glass readability; only one effect mounted; switching releases the previous effect; settings survive restart.
7. **Input and layout.** Keyboard-only pass, visible focus, Target Cursor over tiles/cards/buttons, Escape from menus, arrow/scroll behaviour, 320×600 stacking, no horizontal scrolling.

## Report

Write `versions/0.2 FoundationOS/agents/muse/WI-050/report.md`:
- candidate SHA, environment, viewports and inputs actually used;
- one row per scenario: PASS / FAIL / BLOCKED, steps, expected, observed, evidence file;
- findings with severity (only a failure of a stated PI/Sprint acceptance criterion is Sev-1), reproduction and screenshots;
- tool/hardware gaps (touch, pen, controller, real phone) stated separately;
- exact cleanup commands and confirmation that your processes exited.

Reply with PASS/FAIL/BLOCKED counts and the Sev-1 list.
