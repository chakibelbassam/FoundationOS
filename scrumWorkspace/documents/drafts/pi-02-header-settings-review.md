---
revision: 4
---
# PI-2 (Client foundation) · Header, Settings and prototype review

**Recorded decision.** v0.2 supports one active profile and durable per-member settings across restarts and port changes. Earlier alternatives below document the design discussion. See the [increment plan and ordered sprint buckets](../PI-02/client-increment-plan.md).

**Settings defaults (26 Nov 2026).** System theme, Glass surface, Comfortable density, motion on and Target cursor. Motion stays on when Windows requests reduced motion unless the member chooses Off or Follow system.

The owner wants the prototype's ability to try and compare interface choices in v0.2. Keep a persistent header with the username, server connection control and local time. Put account details in Settings and connection details in the header. The names and contents of the three Settings pages below are proposals. Use a compact About link or footer in Settings for version details.

### Known defects to reproduce in the prototype

| Owner observation | Source finding | Replay and proposed release check |
|---|---|---|
| The app card turns awkwardly and a background layer becomes visible midway through the flip, especially with Liquid Glass. | The card uses a perspective rotation with separate faces. The card face and cover have separate background rules, the glass shell styles the action surface, and the app-card wrapper already clips projecting faces to avoid shelf resizing. These are places to isolate the effect during replay. | Replay hover on and off, including quick pointer reversals, under solid and glass treatments with a busy workspace background. Capture the frame where the layer becomes visible. Compare the revised flip with an immediate face change. Both v0.2 surface treatments must keep titles readable, actions stable and shelf dimensions fixed. |
| The folder behaves inconsistently. | The prototype combines hover, pinned preview, timed touch hold, drag handling, a label selection target and a separate open control. The reported symptom needs a precise reproduction. | Replay graphic versus label activation, fast hover exit, tap versus swipe and nested Back. Capture the input sequence and expected destination. Give the v0.2 folder a single primary link and the same interaction at each depth. |
| Arrow navigation feels uneven. | The shell listens for arrows globally, the launcher and shelf handle their own keys, and app actions and Settings have additional navigation rules. These are possible overlap points. | Replay launch into keyboard navigation, shelf edges, short rows, nested folders, Back, header menus and Settings. Give the shelf one focus model. Verify one key press moves at most one intended step and keeps focus visible, with ordinary arrow behaviour inside other controls. |

### App card interaction and finish

The front identifies the app. The back keeps the name at the top, followed by a short, readable brief, then a consistent action row: **Run · Open · More**. If the brief is absent, the title and actions hold their positions. Wrap long titles, keep the full brief in the overview, and preserve the shelf footprint on both faces.

- **Mouse.** Hover highlights immediately. Trial a reveal after about one second over the same card. Cancel the timer when the pointer leaves, the shelf scrolls or the view changes. A deliberate click on the front reveals actions immediately and keeps them open. Give Run visual priority and keep the actual pointer where the user left it. A hover reveal never moves keyboard focus or activates an action. Keep the back open while the pointer is over its actions or it contains focus.
- **Keyboard and touch.** Arrows on the shelf find the card. Enter or Space on its primary button reveals its actions. Put keyboard focus on Run when the action face is ready, with Open and More next in reading and tab order. Consume the reveal keystroke so repeated Enter during the transition cannot activate Run. Tap reveals the same actions on touch. Escape or the visible close control restores the front and returns focus to the trigger when it held focus. Keep hover dismissed until the pointer leaves and reenters.
- **Run.** In v0.2 against the v0.1 server, the action explains the release limitation inline. Suggested copy is *This version opens app files. Running apps isn’t available yet. Choose Open to inspect Weather.* Keep this feedback on the card and readable on a phone. Preserve the same action position for the future runtime. Once runtime exists, distinguish an app with no runnable build from a launch failure.
- **Open.** Open the addressable app overview. Back restores the original card and the **Open** action when available, with the card face as the fallback.
- **More.** Start with **Browse files**, a shortcut straight to the app directory. Add menu entries when they have a working destination. Keep this action separate from Run and Open.
- **Visual treatment.** Test the flip with an opaque backing behind each face and glass treatment on top. Clip the animation within the card and keep adjacent cards still. Check for background flashes, overlapping faces, contrast and text jitter with a busy background. Reduced motion uses an immediate front-to-back change. If 3D still shows through in an ordinary supported configuration, use a clean face change with the same controls.

### Essential components to verify

| Component | Release review |
|---|---|
| App card and overview | Check fast pointer passes, the dwell threshold, click during the timer, keyboard reveal, Escape, touch and repeat key presses. Check a long title, missing brief, unsupported Run feedback, More, and Back from the overview. |
| Folder and shelf | Verify one click or tap opens a folder, one arrow press moves focus once, touch scrolling stays smooth, and nested Back restores the origin. |
| Header and Settings controls | Verify long names, connection state, menu focus, motion and a real Solid/Glass preview. Use the workspace widgets in the preview to catch styling differences. |
| Shared visual finish | Replay Solid and Glass, normal and reduced motion, and the desktop, 390 px and 320 × 600 widths. Inspect intermediate frames and repeat quick inputs. Document the adopted components, visible states and checked behaviour in the interface inventory. |

Use Sprint-1 for the prototype replay, Sprint-3 for app card actions and the overview, Sprint-4 for visual comparison and documentation, and Sprint-5 for independent QA and fixes. The approximate hover delay, motion treatment and initial More entry are draft proposals. [W3C hover and focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) · [W3C keyboard interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

### Persistent header

**FoundationOS / current location** · **username ▾** · **server state ▾** · **local time**

- The username opens a profile menu with the active profile marked and a **Profile settings** link. Clicking the active profile or pressing Escape closes the menu and returns focus. The future menu can expose **Connect another profile**, switch connected identities and open Friends. Friends belongs to future people and collaboration planning. It has no v0.2 server contract.
- The adjacent connection button shows a word and an icon, such as **Connected**, **Reconnect** or **Server offline**. Its panel shows the selected server address, check result and actual server version. **Check connection** checks the configured server. **Reconnect** appears when the API is reachable and the member session needs attention. A ready server and a valid member session are distinct states. For a changed server address, explain how to rerun the client launcher with the new address.
- Use a menu for the profile actions and a labelled disclosure or popover for connection diagnostics. Keep the three header elements together in a compact strip on narrow screens. Test long usernames, wrapping, and focus visibility at 320 × 600. Render time as quiet local information and announce connection changes where they help with recovery.

### Three Settings pages

| Page | Candidate v0.2 contents |
|---|---|
| **Profile** | Current username and role from the API, with a connection prompt when identity is unavailable. The username menu provides a direct route here. |
| **Appearance** | Default System theme and Glass surface. Compare Solid and Glass on a sample app card and folder against the same background. Use readable contrast and a stable card surface throughout the test. |
| **Workspace** | Default Comfortable density and motion on. Try Compact, Off and Follow system. Give the preview the same cards and focus treatment as Home so an experiment predicts the real result. |

Reuse the parts of the prototype settings that make judgement easy, including live preview and a clear way to revert. Propose **Apply**, **Reset to defaults** and an easy way back to the workspace. Keep example cards free of personal data. Use MUI or React Bits controls and Material Icons, with ordinary labels and keyboard behaviour.

Persistence is decided. The client host stores validated preferences per member in the current Windows user's application-data directory, independently of the assigned port, and writes them atomically. The v0.1 API has no preferences operation. A data-directory override keeps QA and failed-write tests away from the owner's settings.

### What the running v0.1 server supports

| User intent | Contract | Design implication |
|---|---|---|
| View my identity | `GET /profile` returns ID, username and role for the active session. | Show username and role in Profile. The contract does not provide profile editing, an avatar or a public profile. |
| Sign in to an existing account | `POST /sessions` exchanges an account key for a session ID and token. | v0.2 already plans to connect using an existing session token. The account-key sign-in UX belongs to the planned v0.3 account journey. |
| Connect another existing profile or switch | Each session identifies one caller and its home. The client could validate each token with `GET /profile` and select the active session in memory. | Decide whether to offer switching in v0.2. If included, clear the previous profile's content and requests on switch and open the new profile's Home. A reconnect to the same profile should still return to its current URL. |
| Invite or create a user | An admin calls `POST /invitations`. The recipient calls `POST /accounts` with the one-time invitation. An admin can list accounts via `GET /accounts`. | Use **Invite member** for this flow. It differs from connecting a profile that already exists. Recommend the complete invitation UX for v0.3. |
| Remove a user or disconnect a profile | `DELETE /sessions/{id}` revokes a known session. The owner can revoke their own, and admins can revoke any. | Removing a connected profile from the client only drops local session information. Account removal or disabling requires a separate product decision and server capability. |
| See whether the server is available | `GET /status` reports server version, readiness and schema. | Keep the connection details visible independently of Profile and check the member session separately. |
| Save interface preferences or add friends | The contract provides file operations and has no preference or social operations. | Treat appearance experiments as client-owned and carry Friends into later planning. |

The v0.1 OpenAPI suite ran against an isolated temporary store and passed, exercising 12 documented operations and 40 documented responses. This verifies the API baseline. Browser reproduction and the new client behaviour remain review work.

### Decisions before breaking down work

1. Decided: v0.2 uses one active profile; switching means reconnecting with another token. Invitations stay in the v0.3 accounts journey.
2. Decided: appearance choices survive a full launcher restart, stored per member. Defaults are System theme, Glass surface, Comfortable density, motion on and Target cursor.
3. Replay the reported widget issues and decide which prototype components to adapt or replace. Verify solid and glass variants early enough to protect the QA sprint.
4. Agree the arrow model with a short route through the actual layout, including narrow screens, edge cards and returning from a folder. Add controller support only if it becomes a release requirement.
5. Check capacity after WI-027. WI-044 adds the motion work; prioritize the end-to-end file read, predictable navigation and the customization preview.

Design sources: [v0.1 API contract](../../../versions/0.1%20FoundationOS/FoundationOS%20Server/openapi.yaml), [roadmap](../../../planning/Roadmap.md), [W3C menu button example](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/examples/menu-button-links/), [W3C disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
