---
revision: 4
---
# PI-2 (Client foundation) · Workspace interaction design

**Recorded decision.** v0.2 supports one active profile and durable per-member settings across restarts and port changes. Earlier alternatives below document the design discussion. See the [increment plan and ordered sprint buckets](../PI-02/client-increment-plan.md).

Fifty questions and working answers for the v0.2 design discussion. The launcher and reconnect decisions are recorded in the [PI draft](pi-02-client-foundation.md). The interface answers below are proposals for review. Prototype observations come from source inspection. Sprint replay is where we verify behaviour and component reuse.

## App overview · what opens and what it contains

1. **What job does the overview do?** Help a member recognize what an app is, read its brief and find its files. This proves the find-and-inspect part of the Weather journey.
2. **How does an app qualify for an overview?** Propose recognizing a directory with a direct child named `app.json` containing a nonblank string `name` and an optional text `brief`. The prototype also requires an ID for its app runtime. In v0.2 the URL uses the member-relative directory path, so an existing ID can remain in the descriptor without being required or used for routing.
3. **What triggers the overview?** Choose **Open** on the revealed app card, or visit a direct app URL. Hover and the card reveal keep you on the shelf.
4. **Is the overview a page, a dialog or the back of the card?** The action face gives you a short description and three actions on the shelf. **Open** goes to an addressable overview page inside the workspace shell.
5. **What belongs above the fold?** The app name, a Material app icon, its location in breadcrumbs, optional one- or two-line brief, and the available file actions. Use the regular workspace heading and body styles.
6. **What is the first useful action?** Show **Open README** when a direct child `README.md` exists. Keep **Browse files** available to open the same directory as an ordinary folder. Both actions use the v0.1 file contract.
7. **Does README content appear inline or in a reader?** Open an addressable reader on activation. Show text as escaped content for the initial slice. Markdown layout can be evaluated separately if the text presentation fails the review.
8. **What if the app has no brief or README?** Use the title and **Browse files**. Omit the absent brief and README action. If the brief is long, let it wrap in the page and limit the amount shown on the card.
9. **What happens when the descriptor has changed or gone bad?** If the folder still exists, offer **Browse files** and use its directory name. If the directory is unavailable, offer a way Home. An expired session routes through the shared connection state at the same URL.
10. **Should the overview show Run, build state, a live preview or App Studio?** Keep the overview focused on file inspection. The action face has a **Run** control that explains availability in v0.2. The roadmap places actual launch and runtime state in v0.7.
11. **How does a user get back?** Back from README returns to **Open README** in the overview. Back from the overview restores the original card and **Open** action when available. A direct link still offers breadcrumbs and Home.
12. **What if the app moved, two apps use the same name, or the session belongs to another member?** Route by member-relative directory path, use the breadcrumb to disambiguate names, and refetch under the current session. A moved app's old route may be unavailable. Clear the previous member's view before rendering any result.

## App cards · at-a-glance identity and actions

13. **What does the card show at rest?** A Material app icon, the display name, and an **App** label. Add a short description only if it fits the card without crowding the title.
14. **How do app, folder and file cards differ?** Use distinct icons and readable type cues with one shared card footprint. The control's screen-reader label includes the name and type. Keep colour as a supporting cue.
15. **Should v0.2 keep the prototype's covers and 3D flip?** Keep the identity-first front and build a cleaner action face. Test a contained 3D flip in Solid and Glass. Use an instant face change for reduced motion and a clean replacement if 3D is unreliable.
16. **What changes when I hover?** Highlight immediately. Trial a reveal after about one second of continuous hover over the same card, with no focus change. Cancel the timer on exit or scroll. A quick pass leaves the front visible.
17. **What changes when an arrow key lands on the card?** Show visible focus and scroll just enough to reveal the card. Keyboard activation deliberately reveals the actions and moves focus to Run.
18. **Does it need a separate card action or a More menu?** Use **Run**, **Open**, and **More** in that order. In v0.2 Run explains the client limitation, Open visits the overview and More can offer **Browse files**.
19. **What happens on click or tap?** Clicking the front or tapping it reveals the actions and keeps them open. The reveal gesture ends there. Use a separate press on an action and let touch scroll normally.
20. **How do long names and duplicate names work?** Keep the card height stable and allow two lines for names. Expose the full name in its accessible label and overview heading. Keep identity keyed to the member-relative path.
21. **Where does the client learn that a folder is an app?** v0.1 listings return names and file/folder types. Read descriptors for visible child folders with a small request limit and session-scoped results. Repeat the check when returning to a view if needed. Avoid a background scan of the entire home.
22. **What if I activate a card before its kind is known?** Prioritize the explicitly activated item. A valid descriptor reveals the app card actions, a missing or malformed descriptor opens the ordinary folder, and an outage offers Retry. Ignore results for a cancelled activation or an old session.
23. **What happens when metadata arrives after I’ve started navigating the shelf?** Update the label and icon in place. Keep the same element, path key and order, including when a folder becomes an app card. Discard results from an old view or session and keep focus on the same item.

## Folder widgets · mouse, touch, keyboard and return

24. **What makes a folder feel like a folder?** Use a folder silhouette, visible label and consistent card shape. Evaluate the prototype's folder artwork with a MUI activation control and Material Icons.
25. **Do Home and nested folders use the same widget?** Yes. Reuse the widget and input rules at every depth. Breadcrumbs and the current folder heading identify the location.
26. **What does pointer hover do to a folder?** A small border or fill change and, if useful in the prototype replay, a subtle lid movement inside the fixed footprint. Reduce to a static highlight when reduced motion is active.
27. **Should hover preview the folder's children?** Prefer a light visual cue in v0.2. The old preview comes from the richer `browse` response and fetching previews on hover would make the experience differ on touch and keyboard. Explore a deliberate preview control later if needed.
28. **What happens on click?** The primary folder target opens that folder immediately. Give the view its own URL and breadcrumb. Clicking the text or graphic performs the same action.
29. **What happens on touch?** A single tap opens the folder. A swipe scrolls normally. The folder stays recognizable without a preceding hover or a timed press.
30. **How does Tab enter and leave the shelf?** Tab moves between the shell, breadcrumbs and the shelf, with one tab stop inside the shelf if using the accessible layout-grid pattern. Shift+Tab works in reverse. Reenter on the last focused card when it still exists.
31. **How do arrows move inside the shelf?** For a responsive card grid, Left and Right move across the row and Up and Down move to the nearest card in the adjoining row. In a single column, Up and Down move to the previous or next item. Keep focus in place at a boundary.
32. **When do arrows keep their normal browser or control behaviour?** Handle directional navigation only while focus is inside the shelf. Keep normal scrolling, text caret movement, MUI menus and Settings control behaviour in their own contexts.
33. **What does Enter do, and what is Space for?** Enter follows folder and file links. Enter or Space on the app card button reveals its actions. A separate activation on a focused action runs that action.
34. **How can focus stand out when my mouse is over a different card?** Use a distinct visible focus outline and a softer hover treatment. Pointer movement leaves keyboard focus where it is. Screen-reader users get the item's name and kind.
35. **How do I know the folder opened?** Update the route and title, focus the new heading when entering via keyboard, and let Tab reach the new shelf. Handle loading in the destination without shifting focus again when results arrive.
36. **What happens to scroll and focus when I go Back?** Restore the visible scroll position and focus to the launching widget when it still exists. If it disappeared, focus the parent heading or a nearby remaining item. Breadcrumbs handle navigation up.
37. **How do loading, empty, missing and server-unavailable folders differ?** Use a loading state, a clear empty message with Up or Home, an unavailable path state, or a Retry state for the server. A session error shows Connect at the same URL.
38. **What survives a viewport resize or changing item counts?** Preserve the active item's path and keep it visible. Recalculate directional neighbours from the new shelf layout. At 390 px and 320 × 600, labels and targets stay usable without side scrolling.
39. **What do we keep from the console-like prototype?** Keep the feel of deliberate directional movement, a reachable launcher and the same folder widget at each level. Start with scoped keyboard navigation and predictable scrolling. Treat a custom carousel, gamepad mapping and animated scrolling as follow-up candidates once the basic interaction is proven.

## Settings · scope, placement and persistence

The [header, Settings and prototype review](pi-02-header-settings-review.md) records the later design discussion, v0.1 capability map and defect replay steps.

40. **Why include Settings in a client foundation release?** Let the owner try a small set of real interface controls, compare the results on representative widgets, and decide what to keep.
41. **Where is Settings and how do I leave it?** A labelled gear in the shell opens Settings. The three proposed routes are Profile, Appearance and Workspace. Back returns to the previous view and restores focus when the gear initiated the visit.
42. **Where does Connection live?** In the header, beside username and local time. Open the connection control for the selected server, version, recovery and a fresh status check.
43. **What does Profile show?** Show the current username and role from the server. The header menu marks the active profile and links to the Settings page. Whether to switch existing profiles in v0.2 is an owner decision.
44. **How should a user recover if the server address changes?** Show the configured address in the header panel. First try the current address. If it has changed, explain how to relaunch the client with the new server address.
45. **What belongs under About?** Use a compact Settings link or footer with the client version and server version when reachable. Connection diagnostics stay in the header.
46. **Which appearance and workspace controls earn a place first?** Propose a theme sample and solid or glass surface in Appearance, and density and motion in Workspace. Follow the system's reduced-motion preference.
47. **How do preferences persist when local ports change?** Tab-scoped preview can survive a reload at the running client address. Keeping preferences through full restarts would require client-owned persistence or a future preferences API. This is an open choice.
48. **Should Settings use immediate changes or Save and Cancel?** Preview changes live against sample cards. Provide Apply and Reset to defaults, with the wording and storage lifetime decided together. Read-only Profile details require no save step.
49. **How do users get added or removed?** Connect another profile means using an existing identity. Admin invitations and member enrollment are separate v0.1 API operations. Removing a profile from the picker, revoking a session and deleting an account have different effects. See the follow-up review for the contract table.
50. **What does Settings look and feel like on keyboard and phone?** Use three reachable sections, labelled controls and a single-column page on narrow screens. Preview the real controls and keep focus visible below the header.

## What to prove in the five candidate sprints

- In the first runnable slice, inspect whether visible-folder descriptor reads stay responsive. Try a large folder and open a card while its descriptor is pending. Replay hover, activation, arrow navigation and Back in the prototype and record reuse decisions.
- Prove that folder browsing and focus restoration work before adopting the visual effects. Then connect the app overview and text reader to a real Weather fixture and verify the same URL through refresh, session loss and reconnect.
- Start the header and read-only profile with the first authenticated workspace slice. Put a small customization preview ahead of the visual review. Keep the final sprint for defects and independent QA.
- Test mouse, keyboard, touch-width layout and reduced motion. Include missing and malformed descriptors, duplicate names, a late response, a disappearing return target and a session change between two member homes.

## Sources

- [v0.1 OpenAPI contract](../../../versions/0.1%20FoundationOS/FoundationOS%20Server/openapi.yaml) defines profile, status, folder listings and text reads.
- [Product vision](../../../Product%20Information/FoundationOS%20Product%20Vision.md) and [roadmap](../../../planning/Roadmap.md) place account, shared appearance and runtime work in later increments.
- [Widget reference](../../../Product%20Information/Interface/Widgets.md), [component inventory](../../../Product%20Information/Interface/Components/README.md) and [working guide](../../../Procedures/working-on-client-and-server.md) define the shared direction and component standards.
- OneDrive prototype source inspected locally under FoundationOS. Relevant files are `FoundationOS-Interface/AppCard.tsx`, `Objects.tsx`, `useDirectionalNavigation.ts`, `main.tsx`, and `FoundationOS-Server/explorer/files.mjs`. The original inspection included no live user data.
- [W3C layout grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), [keyboard interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) and [hover or focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) inform the proposed focus, arrow and hover behaviour.
- [HTML origin definition](https://html.spec.whatwg.org/multipage/browsers.html#concept-origin) and [Storage Standard](https://storage.spec.whatwg.org/#storage-keys) explain why browser preferences tied to one port are separate from preferences at another port.
