---
revision: 8
---
# PI-2 (Client foundation) · v0.2 brainstorming

**Recorded decision.** v0.2 supports one active profile and durable per-member settings across restarts and port changes. Earlier alternatives below document the design discussion. See the [increment plan and ordered sprint buckets](../PI-02/client-increment-plan.md).

[PI-2 (Client foundation) increment plan](../PI-02/client-increment-plan.md)

## Release story

I start FoundationOS Server, open the local web client separately, connect to my private home with an existing member session, and recognize Weather among my folders and files. I reveal its card actions, open its overview, read its README, and return to the card I came from. When the server is unavailable I can see what happened and retry. This delivers the find-and-inspect part of the v1 Weather journey. PI-1 supplies the released v0.1 API.

## Owner decisions so far

- Build the v0.2 web client with React, TypeScript, Vite and React Router.
- Let the client host select a free loopback port at each launch. Preserve the requested location in the URL across refresh and reconnect while that client is running. A full launcher restart can change the port.
- Start FoundationOS Server first and launch the web client separately. Use an independently running v0.1 server throughout v0.2.
- Browse a real member home. Use a minimal connection screen that accepts an existing session token and keeps it in memory. Full account entry belongs to the planned v0.3 journey.
- Keep the workspace idea. Reconsider the layout and evaluate individual prototype components against FoundationOS standards.
- Keep a Settings surface that lets the owner try interface customizations. Put username, connection and local time together in the persistent header. The username opens a profile menu. The connection control opens the server details.
- A single click opens a folder. Activating an app card reveals its actions, ordered **Run**, **Open**, and **More**. The flip waits for deliberate activation or a short hover dwell. **Open** goes to the overview. Back should return focus to the originating item.
- Use five candidate sprints. Review visuals early and reserve the fifth sprint for visual defects, independent QA, fixes, and retesting.

## Candidate sprint reviews

| Candidate | Demonstration |
|---|---|
| Sprint-1 (Prove the client and inspect the prototype) | Start the v0.1 server separately, launch the built client, and read one real file. Replay the reported glass-card flip, folder behaviour and arrow movement. Include nested Back. Record reproducible defects and reuse, adapt or replace decisions. |
| Sprint-2 (Browse a private home) | Connect, confirm the member and server in the header, open folders, use breadcrumbs, and distinguish loading, empty, unavailable, and revoked-session states. |
| Sprint-3 (Recognize an app and inspect its files) | Recognize the prototype's app.json convention. Reveal a tidy action face with a name and optional brief, explain Run availability, and open the overview and a text file. A malformed descriptor leaves its folder browsable. Late metadata preserves focus and selection. |
| Sprint-4 (Refine and document the workspace) | Exercise card transitions, scrolling, long names, reduced motion, keyboard return and narrow layouts. Try the three-page Settings design and compare prototype-derived surface and motion choices. Document adopted components and client startup. |
| Sprint-5 (Fix visual defects and verify the release) | Replay the release journey with two member homes, keyboard and mouse, delayed responses, retry and session revocation. Check solid and glass treatments, header and Settings on desktop, 390 px, and 320 × 600. Record observed defects, fixes, remaining limitations, and release evidence through the launcher. |

## Adoption and ownership proposals

Use the OneDrive FoundationOS-Interface as the reference. Its React/MUI widgets and Vite configuration are working examples. Its explorer model includes projects, links, runtime states, and appearance fields beyond the v0.1 file/folder contract. Behaviour and component adoption still need runtime investigation.

## Client architecture decision

Use React, TypeScript, Vite and React Router. Vite builds the browser assets. React Router gives the home, folders, app overviews and text files addressable views. This keeps the prototype's React/MUI components available for selective adoption. The first implementation can try React Router Data Mode for route loading and pending states. The specific router mode is an implementation proposal.

The URL identifies a view and a path relative to the current member's home. For example, opening Weather then its README could visit `/app/Weather` then `/file/Weather/README.md`. On reload or session expiry, keep the requested URL and show Connect in place. After a valid session, check the member profile and fetch the route again under that identity. On a temporary outage, Retry keeps the destination. If the path is missing or inaccessible, show an unavailable state and a way Home. Keep credentials out of the URL. Browser Back and Forward follow visited views. Returning from the reader restores focus to its originating item when that item is still present.

Acceptance example: open Weather, read its README, refresh, reconnect, see the same file, then press Back once to return to the overview with focus on the README. Repeat after switching members or removing the file and verify that previous content never flashes. Test a pasted nested URL through the built client host.

## Version launcher

The v0.1 server launcher starts Node and prints its assigned loopback address. A GET to `/status` returns readiness, version and store schema. Use that as the compatibility check. The v0.2 launcher opens the web workspace. Running Weather itself belongs to a later increment.

- **Startup decision and first runnable slice.** Start v0.1 with its existing launcher. Give the v0.2 launcher that server's explicit loopback address. Verify readiness and version, serve the Vite build, then open the browser. On a missing build, unreachable server or version mismatch, show the expected version and the recovery step. The client launcher connects to that separately started server. To recover from an unreachable server, start it or correct its address and retry. Stopping the client leaves the server running.
- **Hosting proposal.** A small loopback client host serves built assets and forwards same-origin `/api` requests to the selected loopback backend, preserving API status codes. Serve the app entry for client routes including a direct file URL. Missing assets return an asset error. Use Vite's dev server during development. Keep the first-run server console available to its operator for its one-time admin key. Keep secrets out of launcher diagnostics.
- **Client port decision.** Bind the client host to loopback on an available port and open the browser at the assigned address. Keep the route in the current URL through refresh and reconnect. Bookmarks across full launcher restarts are outside v0.2 acceptance. The independently started v0.1 server keeps its own address.

## Proposed v0.2 web app layout

| Location under the v0.2 version folder | Responsibility |
|---|---|
| `Start.cmd`, `README.md` | User entry point and instructions for the supported client/server pair. |
| `FoundationOS/host/` | Serve the build, resolve the chosen server and check readiness. Keep process and port handling outside browser code. |
| `FoundationOS/src/app/` | Route definitions, app shell, session lifetime and reconnect flow. |
| `FoundationOS/src/api/` | Typed requests for status, profile and files. Translate server replies into results the UI can handle. |
| `FoundationOS/src/workspace/` | Home, folder browser, app overview, text reader and restoring focus to an item. |
| `FoundationOS/src/components/` | Reusable visual controls. A card raises an action and the owning view decides its destination. |
| `FoundationOS/tests/` | Browser journeys and representative fixtures. Put focused tests alongside the code they cover. |

The [client and server working guide](../../../Procedures/working-on-client-and-server.md) covers version ownership, contract changes, component adoption, verification and handoff.

Design references: [Vite build and deployment](https://vite.dev/guide/static-deploy.html), [React Router modes](https://reactrouter.com/start/modes), [v0.1 contract](../../../versions/0.1%20FoundationOS/FoundationOS%20Server/openapi.yaml), [v1 vision](../../../Product%20Information/FoundationOS%20Product%20Vision.md).

## Workspace interaction proposals

The [workspace interaction study](pi-02-workspace-interaction.md) records 50 design questions and working answers for app overviews, cards, folder widgets and Settings. The overview opens through the app card's **Open** action or a direct route. It shows identity, an optional brief, README when available, and **Browse files**. Folder activation opens the folder. Hover highlights immediately and can reveal app actions after about one second. Arrow keys move focus within the shelf. Keyboard activation reveals the action face with focus on **Run**. Pointer hover leaves focus in place. In v0.2 **Run** explains the runtime limitation, **Open** opens the overview, and **More** can offer a direct folder shortcut.

Propose three Settings pages: **Profile** for account details, **Appearance** for theme and solid or glass surfaces, and **Workspace** for density and motion. Use a compact About entry. The username menu opens Profile and can grow into a profile picker and a Friends entry in later people and collaboration work. The connection panel owns status and recovery. Follow the operating system's reduced-motion preference.

The [header, Settings and prototype review](pi-02-header-settings-review.md) contains the defect replay matrix, the proposed card interaction, essential component checks and the v0.1 account capability map. v0.1 can read the active identity, issue sessions, invite and enroll members, list accounts for admins, and revoke a known session. Account removal and Friends require additional capabilities. Keep the current draft's existing-session connection flow while deciding whether to include a profile switcher.

## Questions for later synthesis

1. Agree the first customization controls and whether preferences survive a full client restart.
2. Decide whether v0.2 needs switching between existing profiles or a single active profile, and review when the invitation UI should ship.
3. How much descriptor discovery is affordable in a large home?
4. Which prototype behaviours survive the interaction replay, and which issues block v0.2?
5. Does the five-sprint scope leave enough time for QA once the first runnable slice reveals the actual adoption cost?

The PI stays proposed while these questions are explored. Use this draft for subsequent decisions and the later feasibility review.
