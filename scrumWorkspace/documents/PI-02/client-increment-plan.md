---
revision: 6
---
# 📦 PI-2 (Client foundation) · v0.2 increment plan

**Target v0.2**

**Product folder** · `versions/0.2 FoundationOS/`  
**Dependency** · the independently launched v0.1 FoundationOS Server from 📦 PI-1 (FoundationOS Server).

**Owner decisions (26 Nov 2026)** · System theme, Glass surface, Comfortable density, motion on, Target cursor. Edge owns the Scrum transitions and may reorganise proposed work. Sev-1 only blocks. See [owner decisions](owner-decisions.md).

## Release outcome

I start my server, open the web client, connect to my private home and find Weather. I reveal its actions, choose **Open**, and read its README. After a refresh I reconnect and return to the same file. Back brings me to the control I used. I can tell who I am connected as, check the server, and try different workspace treatments in Settings. This delivers the find-and-inspect part of the [v1 Weather story](../../../Product%20Information/FoundationOS%20Product%20Vision.md).

[Sprint-6 (Stabilize and polish the v0.2 workspace)](pr-9-acceptance-follow-up.md) adds SVAR, Bento Home, backgrounds and dual browser QA.

## Delivery scope

- **Startup and connection.** Start the v0.1 server first. Its console gives the operator the loopback address. The v0.2 launcher takes that address, checks readiness and version, serves the built client on a free loopback port, and opens the browser. The operator controls the two processes independently. Use an existing member session token in memory. Keep credentials out of routes, logs and preferences. On refresh or session expiry, retain the member-relative route, validate the new session and reload the data. Clear private content and discard stale requests when identity changes. A full launcher restart can assign a new client port.
- **Workspace.** Use the same folder widget at Home and every depth. Click, tap or Enter opens its folder. Arrows move focus one visible neighbour at a time, with predictable edges and stable scroll on Back. Folder hover may highlight or subtly move its lid inside a fixed footprint. Breadcrumbs and direct folder, overview and file URLs make the current location clear. Give loading, empty, unreachable, missing and expired-session states distinct feedback and a useful next action.
- **App recognition and overview.** For the first slice, recognize a folder with a direct `app.json` declaring a nonblank name and optional text brief. Probe visible entries with bounded concurrency and prioritize the one being opened. Keep item order and focus stable as metadata arrives. Missing or malformed descriptors leave the folder browsable. Show name, path, optional brief, **Open README** when present, and **Browse files**. Read text through the v0.1 files API.
- **App card.** Show identity on the front. Trial a one-second mouse dwell to reveal the back. Cancel on pointer exit, scroll or navigation. Click, tap, Enter or Space reveals immediately. Keep the name and brief legible above **Run · Open · More**. When deliberately entering actions by keyboard, focus Run. A second explicit activation is required. In v0.2, Run explains the runtime limitation inline and points to Open. Open goes to the overview. Start More with Browse files. Escape dismisses the menu first, then the action face. A reduced-motion face change must support the same actions. Actual app execution belongs to the later runtime increment.
- **Shell and Settings.** Keep the clickable username, server state and local time together. The username menu marks the active profile and opens Profile. The connection panel shows the address, status and recovery action. Distinguish an available server from an expired member session. Use three Settings pages as the working design: **Profile** for username and role, **Appearance** for theme and Solid/Glass comparison, and **Workspace** for density, motion and System/Target cursor comparison. Use actual workspace widgets in the preview, reversible changes, and a compact About entry for version information.
- **Prototype adoption.** The original plan called for a OneDrive replay. The owner removed it from final acceptance. Review the current v0.2 client. Compose controls with MUI or React Bits, use Material Icons, and document adopted behaviour and evidence in the [interface inventory](../../../Product%20Information/Interface/Components/README.md).

## Target Cursor and navigation focus

Use the React Bits corner brackets to show the actionable target. The OneDrive shell already mounts a local TargetCursor and keeps the system pointer visible. Its fine-pointer guard and mouse-only pointer handlers leave pen and controller behaviour to prove. The prototype also has a gamepad navigation hook. Review both before adopting either. [React Bits component](https://reactbits.dev/animations/target-cursor) · [upstream implementation](https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/TargetCursor/TargetCursor.jsx)

**Who owns the target.** Mouse movement or a hovering pen points to the actionable control under the tip. A decorative icon or text inside a button inherits the button's bounds. An independent icon button gets its own target. Keyboard or future D-pad navigation follows actual focus, including when the pointer is parked elsewhere. Deliberate input takes over. Ignore incidental pointer events caused by rerendering. The brackets are visual feedback. Activation always goes through the real control and an explicit input. Preserve native text selection, Tab order and a visible focus ring with the effect off.

| Moment | Proposed initial focus or target | Observable behaviour |
|---|---|---|
| Connect and reconnect | Session field when credentials are needed. Retry for an unreachable server. | Explain the state and preserve the requested URL. After successful reconnect, announce the destination and apply its entry rule. |
| Enter Home or a folder | Focus the location heading on directional entry. The first shelf entry is the first actionable card, or the last valid card when returning. | Decorative headings carry no action brackets. Empty folders offer Up or Home. Desktop pointer entry keeps the pointer under user control. |
| Reveal an app | During the turn, keep a stable card outline. Once ready, deliberate keyboard entry lands on **Run**. On dwell, Run gets visual priority while the mouse retains its position. | No mid-turn locks on hidden buttons, jumping to the shelf behind the card or activation on key repeat. A tap reveals and a separate tap chooses. |
| Open overview or reader | Announce and focus the heading on keyboard entry. First content action in the overview is **Open README** if present, otherwise **Browse files**. In the reader, offer Back or a breadcrumb. | Back restores **Open README**, then **Open** on the originating card. If a target disappeared, restore the parent heading and provide a reachable neighbour. |
| Open a menu or Settings | A menu starts on its current or first enabled item. Settings announces the active page and puts its controls in reading order. | Lock stays inside the active menu while open. Escape restores its trigger. Arrowing through a Settings choice stays within that control. |
| Busy action, error, scroll or resize | Hold the current target if still valid. Release a hidden, disabled or removed target. Resolve the next valid control once the layout settles. | Keep focus visible, recompute bounds after scrolling and avoid replaying the input. An unavailable Run that explains the limitation remains an actionable button. |

**Input and motion checks.** Verify rapid crossings between a card, its nested icon and its separate buttons. Repeat after moving the shelf and switching between keyboard and mouse. For a hover-capable stylus, test hover preview, pen exit, then tap to reveal and tap to activate. A contact-only pen uses the touch path. Touch scrolling should dismiss transient hover feedback. With reduced motion, use a stationary outline and an immediate face change. Confirm the overlay never intercepts taps, covers the label or hides the system pointer on fallback. Record the tested device and browser. Emulation covers event logic; physical pen feel and controller ergonomics require device evidence. Controller support is a later delivery goal; v0.2 proves the directional model with keyboard input.

## Original five sprints

| Sprint | Working demonstration and exit evidence |
|---|---|
| 🏁 Sprint-1 (Prove the client and inspect the prototype) | Start the separate launchers and read a real private file in the built client. Record the existing card, folder, arrow and cursor behaviours. Identify which cursor paths handle mouse, pen and focus. Measure descriptor reads in a representative large home. |
| 🏁 Sprint-2 (Browse a private home) | Connect, verify identity and server state, browse nested folders and return to the same widget. Demonstrate the focus rules with the system cursor and Target Cursor on the shelf. Exercise empty, loading, unreachable and revoked-session paths. |
| 🏁 Sprint-3 (Recognize an app and inspect its files) | Complete the Weather → action face → Open → README → reconnect → Back journey. Check Run feedback, More, malformed descriptors, delayed metadata and a removed return target. Record a flip and lock-on transition with both pointer and keyboard. Judge the motion timings against WI-044. |
| 🏁 Sprint-4 (Refine and document the workspace) | Review the three Settings pages, header menus and customization preview. Compare cursor, motion, density and Solid/Glass treatments using the same cards as Home. Check pen hover/contact where hardware is available. Apply different settings for two members and verify persistence across a full restart. Record component usage, chosen defaults, launcher steps and known device gaps. |
| 🏁 Sprint-5 (Fix visual defects and verify the release) | Independent QA through the release launcher on desktop, 390 px and 320 × 600. Test two member homes, revocation, reconnect, stale content and distinct saved preferences after a different-port restart. Replay quick inputs, long labels, mid-flip layers, reduced motion, focus, arrow boundaries and cursor targeting. Fix and retest Sev-1 defects; record the rest. Attach results and remaining limitations for owner acceptance. |

## Organisation and release review

The version root owns the launcher and brief. The React + TypeScript + Vite package lives in `FoundationOS/` under that root. Use React Router for addressable views. Proposed boundaries are `host/` for built assets and forwarding same-origin API calls to the selected server, `src/app/` for routes and session state, `src/api/` for the typed contract, `src/workspace/` for views and return focus, `src/components/` for shared controls, and `tests/` for browser journeys. Direct client routes must work through the built host. Missing assets and API errors retain their own responses. [Working guide](../../../Procedures/working-on-client-and-server.md) · [v0.1 server baseline](server-baseline.md)

**Owner review.** Demonstrate the release story from a cold start, then repeat with a revoked session, an inaccessible path and a second member. Show Solid and Glass, pointer and keyboard action faces, reduced motion and a usable Settings preview. Report input hardware used and reproducible outstanding defects. The prior v0.1 contract run verified the server's 12 operations and 40 documented responses. v0.2 needs its own client and launcher evidence.

**Profile and preferences.** Use one active profile. On reconnect with the same identity, restore the requested route. If a different member connects, clear the previous view, cancel outstanding requests and open the new member’s Home. The client host stores validated theme, Solid/Glass surface, density, motion and cursor settings atomically under the current Windows user’s application-data directory, keyed by the member ID verified through the selected v0.1 server’s `/profile`. Use system defaults before connecting. Keep credentials in memory. Preview changes on real widgets, Apply to persist, Cancel to discard the preview, and Reset to preview defaults before applying.

**Restart acceptance.** Have two members apply different preferences under the same Windows login. Stop the client, relaunch it on a different port and reconnect to each member in turn. Verify the correct choices and private home each time. Exercise missing preferences, invalid values and a failed write that preserves the last good settings.

## Recorded sprint buckets

Delivery follows the listed IDs. Each record names its technical prerequisites separately from its previous item in the delivery queue. The original 21 items precede the Sprint-6 follow-up. Each sprint inherits v0.2 from this PI.

| Sprint | Work items in delivery order |
|---|---|
| [🏁 Sprint-1 (Prove the client and inspect the prototype)](../../sprints/S-02-1.json) | [WorkItem-24 (Reproduce the prototype interactions)](../../work-items/WI-024.json) → [WorkItem-25 (Build and serve the versioned client)](../../work-items/WI-025.json) → [WorkItem-26 (Connect the launcher to the v0.1 server)](../../work-items/WI-026.json) → [WorkItem-27 (Read one private file through the built client)](../../work-items/WI-027.json) |
| [🏁 Sprint-2 (Browse a private home)](../../sprints/S-02-2.json) | [WorkItem-28 (Restore the current route after reconnect)](../../work-items/WI-028.json) → [WorkItem-29 (Browse Home and nested folders)](../../work-items/WI-029.json) → [WorkItem-30 (Make shelf navigation and cursor targets predictable)](../../work-items/WI-030.json) → [WorkItem-31 (Show the active member and server in the header)](../../work-items/WI-031.json) |
| [🏁 Sprint-3 (Recognize an app and inspect its files)](../../sprints/S-02-3.json) | [WorkItem-32 (Recognize apps without disturbing the shelf)](../../work-items/WI-032.json) → [WorkItem-33 (Open the app overview and text reader)](../../work-items/WI-033.json) → [WorkItem-34 (Reveal and operate the app card actions)](../../work-items/WI-034.json) → [WorkItem-44 (Define and verify the motion system)](../../work-items/WI-044.json) → [WorkItem-35 (Polish the flip and cursor handoff)](../../work-items/WI-035.json) |
| [🏁 Sprint-4 (Refine and document the workspace)](../../sprints/S-02-4.json) | [WorkItem-36 (Persist workspace preferences per member)](../../work-items/WI-036.json) → [WorkItem-37 (Preview and apply settings on real widgets)](../../work-items/WI-037.json) → [WorkItem-38 (Refine cursor behaviour across inputs and pages)](../../work-items/WI-038.json) → [WorkItem-39 (Document the launcher and adopted components)](../../work-items/WI-039.json) |
| [🏁 Sprint-5 (Fix visual defects and verify the release)](../../sprints/S-02-5.json) | [WorkItem-40 (Run independent release-journey QA)](../../work-items/WI-040.json) → [WorkItem-41 (Review visual and input behaviour independently)](../../work-items/WI-041.json) → [WorkItem-42 (Resolve release-blocking findings)](../../work-items/WI-042.json) → [WorkItem-43 (Assemble the v0.2 acceptance evidence)](../../work-items/WI-043.json) |

Priority follows release dependencies and urgency. Effort is relative agent difficulty, with the dominant cost documented on each item. Reassess flip polish on the final v0.2 client after independent QA. Keep the original estimate and record the reason for a revision.


[Brainstorming decisions](../drafts/pi-02-client-foundation.md) · [50 interaction questions](../drafts/pi-02-workspace-interaction.md) · [Component and account review](../drafts/pi-02-header-settings-review.md) · [Roadmap](../../../planning/Roadmap.md)
