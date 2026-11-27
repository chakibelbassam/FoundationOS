---
revision: 2
---
# Workspace Home and File Explorer proposal

The [Sprint-6 decision](../PI-02/pr-9-acceptance-follow-up.md) approves SVAR, Bento Home and the Topography default for PR #9. The following notes are the earlier design exploration and shortlist.

The owner chose Topography as the default background and asked to adopt an existing File Explorer component. The annotated Magic Bento reference sets the layout. The proposed delivery follows the v0.2 acceptance pass on PR #9 and fits the roadmap's Everyday navigation increment. The planned release target for this design remains a proposal.

## Home

| Tile | First usable behaviour |
|---|---|
| Projects, upper right | Show up to three member projects and a Show all projects link. Each row opens its project. Proposed starting point is folders deliberately pinned by the member. |
| Recent apps, lower left | Show up to three recently opened apps and a Show all apps link. Count opening the overview as use. The explorer needs a dependable inventory, since the shelf's bounded descriptor probes only cover part of a folder. Review an explicit private app registry versus bounded discovery from designated roots. |
| File Explorer, upper left | Open the member's private file root or a deliberately chosen resume location. Use a library adapter with the existing routes, text reader and member session. |
| Activity, lower right | Merge the two small tiles. Use real lifecycle updates as Edge, builds and tasks add producers. Show a plain idle or unavailable state based on whether a source is connected. |

Use one activation per destination and return focus to its source. Keep reading and tab order stable at narrow widths. Give each app and project row an independent target. [Magic Bento](https://reactbits.dev/components/magic-bento)

## Appearance decision

Topography is the default for a member with no saved background when the background feature lands. Apply the default on Reset and preserve explicit choices. Appearance offers Standard (static), Topography, Magic Rings, Lightfall and Ghost Fibers with live preview, Apply and Cancel. Render one effect at a time. With motion disabled, unsupported graphics or failed initialization, use a readable static fallback. Check foreground contrast, keyboard focus and flip layers with Glass. The OneDrive prototype already contains Topography, Magic Rings and Lightfall integrations, including a graphics check and resolution cap. Inspect that code before adopting current React Bits versions.

[Topography](https://reactbits.dev/backgrounds/topography) · [Magic Rings](https://www.reactbits.dev/backgrounds/magic-rings) · [Lightfall](https://reactbits.dev/backgrounds/lightfall) · [Ghost Fibers](https://reactbits.dev/backgrounds/ghost-fibers)

## File Explorer shortlist

- **SVAR React File Manager** is the first choice for a trial. MIT, TypeScript, tree and breadcrumbs, list and tiles, search, sorting and light/dark themes. It can request directory data on demand and intercept actions. Its documented read-only mode still offers Download, so verify that unsupported actions disappear from toolbar, menus and shortcuts. Compare desktop tree plus list to a narrow single-pane view. [Overview](https://docs.svar.dev/react/filemanager/overview/) · [Demos](https://docs.svar.dev/react/filemanager/samples/) · [Read-only mode](https://docs.svar.dev/react/filemanager/guides/read_only_mode/)
- **@harryy/react-file-browser** is the second ready-made trial. The MIT project documents list/grid, search, sorting, preview and capabilities controlled by adapter methods. Prove React 18 and keyboard fit and check the maintenance history before choosing. [Repository and demo](https://github.com/harryy2510/react-file-browser)
- **Marimo React Finder** is the route to the closest visual match if styling a ready-made component costs too much. It supplies state, adapters, keyboard interactions, tree, list and table primitives with application-owned styling. It carries a larger integration and design cost. [Repository](https://github.com/marimo-team/react-finder)
- **Syncfusion** is a richer packaged benchmark with large-icon and details modes, file operations and customization. It adds an integration with its file-manager data model and needs a suitable license. [React File Manager](https://ej2.syncfusion.com/react/documentation/file-manager/) · [Licensing](https://ej2.syncfusion.com/react/documentation/licensing/overview)
- **21st.dev** is a visual pattern directory. Use it for references when styling the library or designing the project and app views. [Library directory](https://21st.dev/community/libraries)

Trial the first two with the same disposable two-member fixture, a nested folder, a missing path, long names and desktop and narrow browser widths. Look for a clean dark and light fit, keyboard and target focus, route and Back restoration, data isolation, no duplicate global styles, and one-directory-at-a-time loading. Reuse the existing reader and v0.1 file API, which lists names and types and reads small UTF-8 text. Keep search and sort scoped to the loaded directory initially. Preview only content the server can provide. Broader search, metadata, editing, binary downloads and uploads need explicit product scope and API support. Keep the existing browser view available until the adopted library passes the same journeys.

## Decisions before implementation

- Default project interpretation is member-pinned folders. Confirm whether the first Projects Explorer needs any project record beyond the folder and pin.
- Confirm whether File Explorer should open the root every time or restore the last visited folder. The current proposal is root for the Home entry and normal Back restoration for an existing journey.
- Confirm release placement of Topography if a background-only change is wanted ahead of the Home work. The current proposal introduces the default with the background picker and Bento Home.
