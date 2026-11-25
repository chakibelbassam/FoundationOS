# Embedded harness (D4)

Goal: press a button on an app, and the harness opens **inside** FoundationOS,
already scoped to that app's folder, running on the server, reachable from
your phone, your tablet and your laptop.

## What we verified before designing

| Probe | Result | What it unlocks |
| --- | --- | --- |
| `opencode serve` | "Start the v2 API and web server" | The harness is a web app we can host |
| `GET /` on a served instance | `200 text/html`, 9.4 kB, mobile viewport meta | It is already responsive — phones are supported by it |
| `GET /api/info` | `401 Unauthorized` | It has its own auth, not an open door |
| Response headers | no `X-Frame-Options`, no `frame-ancestors` | It can be embedded in a pane |
| `opencode pair` | one-time `/auth/connect/<token>` link, 5-minute expiry | We can hand a device a session without passwords |
| `--standalone` | "private server instead of the background service" | Our instances never touch your own OpenCode service |
| `--server <url>` | attach a client to an existing server | One backend, many viewers |
| `--cors` | allow extra origins | Escape hatch if we iframe cross-origin |

So the remaining work is not "build a harness host". It is **orchestration,
isolation, auth, and chrome**.

## Four ways to put it in front of the user

| Pattern | How it works | Cost | Verdict |
| --- | --- | --- | --- |
| O1. New tab | Open the instance URL in a browser tab | Trivial | Works today; leaves our shell. Keep as fallback |
| O2. Iframe, direct | Embed `http://127.0.0.1:<port>/` in an iframe | Low | Breaks on other devices (127.0.0.1 is *their* machine) |
| O3. Path proxy | `fos/harness/<id>/` reverse-proxied, iframe it | Medium | Fragile: SPA absolute paths, cookies, service workers |
| O4. Host proxy | `oc-<id>.localhost:4317/` routed by `Host` header to the instance | Medium | **Recommended.** Own origin per instance, clean cookies, iframe-safe |

O4 detail: our server already listens on 4317. Add a `Host`-based route:
`oc-<slug>.<host>` -> `127.0.0.1:<instancePort>`, proxying HTTP **and**
WebSocket upgrades. The browser sees one origin per instance, so its auth
cookie cannot leak into another app's harness.

Caveat, now with an answer: you own **cebsolutions.dev** (GoDaddy, parked,
NS `domaincontrol.com`). Cloudflare is the chosen provider (`15`):

- **Same machine:** `*.localhost` resolves automatically. Zero DNS work. Prove
  v1 here.
- **Any device, remotely:** `oc-<app>.cebsolutions.dev` -> the server. Needs a
  **first-level** wildcard record and Universal SSL (`*.cebsolutions.dev`,
  never `*.fos.cebsolutions.dev`).
- **Cloudflare caveat:** Universal SSL covers the apex and first-level
  wildcard only. Use `os.` and `oc-*`, or pay for Advanced Certificate Manager.
- **No DNS yet:** path proxy (O3) for LAN only, or new tab (O1).

### Roles are sub-agents, not separate instances

Confirmed: **one workshop per app**. Builder, QA and reviewer are sub-agents
or sessions inside that workshop, so the URL stays `oc-<app>.…` and the
supervisor tracks one process per app.

That has two consequences worth writing down:

- A crashed sub-agent must not take the workshop down; the supervisor restarts
  the process, not the role.
- "Who is working right now" is a property of the *workshop*, read from its
  session list — not something we infer from ports.

## Instance model

| Option | Shape | Isolation | Cost |
| --- | --- | --- | --- |
| I1. One shared server | Use your existing background service, just create projects | Weak — one agent's tool cwd is all that separates apps | Cheapest, but couples us to your personal OpenCode state |
| I2. One instance per app | `serve --standalone` with `cwd = app folder`, own port | Strong — separate process, separate state | N processes; needs lifecycle management |
| I3. One instance per user | Later, for multi-tenant | Medium | Needed only when there are real users |

**Lean:** I2 for v1, always `--standalone`, bound to `127.0.0.1`. It matches
"start it from the folder that was pressed", makes "kill this app's agent" a
single operation, and never mutates your personal service.

## Supervisor (the server-side brain)

```
        FoundationOS server (4317)
        |
        +-- HarnessSupervisor
        |     state: map<appId, { port, pid, startedAt, lastSeen, status }>
        |     start(app)      -> allocate port, spawn serve --standalone
        |     stop(app)       -> graceful kill, then force
        |     status(app)     -> starting | ready | crashed | idle
        |     reap()          -> stop instances idle > N minutes AND no active job
        |     cap()           -> max concurrent instances (config)
        |
        +-- Host proxy (4317) -> 127.0.0.1:<port>
              handles HTTP + WS, injects no content, strips no CSP
```

Non-obvious requirements that will bite if skipped:

- **Kill the whole tree.** On Windows, `spawn` + `child.kill()` can orphan
  grandchildren (node servers, browsers). Use a job object or `taskkill /T`.
- **Port allocation is a race.** Bind-test before assigning, and remember the
  port so a crash-restart reuses it (or the user's tab 404s).
- **Orphans after a server crash.** On boot, scan the registry file and kill
  recorded PIDs that still exist.
- **Startup is slow.** Show a real "Starting workshop..." state with a spinner
  in the pane, not a blank iframe.
- **Logs.** Capture stdout/stderr per instance to a ring buffer and surface the
  last lines in a "why did it die" panel.

## Keep working when the pane closes

Confirmed: the agent keeps running. That makes the pane a **view**, not the
engine, and moves several requirements earlier:

| Need | Why |
| --- | --- |
| A durable job record | The process outlives the tab; the *result* must outlive the process |
| Status readable from any device | You closed the tab on the laptop and opened the phone |
| A notification path (D13) | Otherwise "keep working" means "work into the void" |
| Reaper respects active jobs | Never kill a workshop mid-build to save memory |
| A restart policy | After a server crash: resume, or mark the job `interrupted` with a retry |
| Cost guard | Background work spends money with nobody watching |

Minimum viable version: the rail shows *Idle / Working (12 min) / Waiting for
approval / Finished 2 min ago / Failed*, and a finished job posts one message
into that app's Edge thread so there is a permanent record.

## Remote access (cebsolutions.dev)

| Option | Shape | Needs | Verdict |
| --- | --- | --- | --- |
| X1 | Wildcard at GoDaddy + Caddy DNS-01 | GoDaddy API eligibility | Fragile |
| X2 | Move DNS to Cloudflare, wildcard A record | Nameserver change | Clean, recommended |
| X3 | Cloudflare Tunnel to this machine | `cloudflared` service | No ports open; best for agents too |
| X4 | LAN only, `*.localhost` locally | Nothing | Unblocks development today |

Proposed hostnames:

```
fos.cebsolutions.dev            -> FoundationOS itself
oc-<app>.fos.cebsolutions.dev   -> that app's workshop (one origin per app)
```

Why the extra label `fos.`: leaves the apex free for a future marketing page
and keeps the wildcard cert scoped.

Checklist before exposing anything:

1. FoundationOS auth covers every route, including the proxy and the harness.
2. A workshop origin is *not* reachable without a FoundationOS session.
3. Rate limits on instance start and on login.
4. A kill switch that works from a phone.
5. TLS only; no plain HTTP fallback for the workshop origins.
6. Log every instance start/stop with the acting user.

**Threat model in one line:** an exposed workshop is a shell on your machine
behind a login. If the login is weak or a workshop origin leaks, the machine is
gone. This is why F1-F5 in the PRD are **Must**, not "hardening later".

## Auth brokering

The harness has its own auth (401 on the API, pair links). Three ways to get a
browser into it:

- **A. Pair link redirect.** Ask the instance for a one-time link, redirect the
  browser to `/auth/connect/<token>`, let its cookie settle, then send it back
  to the pane. Uses their flow exactly as designed.
- **B. Token injection via proxy.** Our proxy adds the credential on each
  request. Cleaner UX, but we are now holding agent credentials — treat them
  like root.
- **C. Break-glass.** If both fail, the pane offers "open in a new tab and pair
  manually" with a copyable link.

**Lean:** A first (no secret handling), B only if A cannot survive the iframe
navigation.

## Security (non-negotiable)

An agent that can run shell commands **is** remote code execution. Therefore:

1. Bind `127.0.0.1`. Never `0.0.0.0`, never `--remote`, never the tunnel.
2. Only our authenticated server can reach the proxy route. A logged-out
   browser gets the FoundationOS login, not the harness.
3. Per-app origin (P4) so cookies cannot cross apps.
4. Scope is `cwd`-enforced by the instance, and we never start one at the
   workspace root by accident.
5. Show a visible "this agent can edit files" badge on the pane; no silent
   autopilot.
6. Rate-limit instance creation (each one costs money).

## The app-runtime question you raised

You are right that this is really a question about **what an "app" is** in
FoundationOS. Today `launch({ appId })` returns a catalog entry and the app is
a static build in `system/dist`. That is one kind of runtime. Embedding a
harness forces the general shape:

```ts
type Runner =
  | { kind: 'static';  dir: string }                      // today: system/dist
  | { kind: 'dev';     command: string; port: number }     // npm run dev
  | { kind: 'harness'; harness: 'opencode' | 'dsh'; agent: string; dir: string }
  | { kind: 'external'; url: string };
```

Then:
- "Run" opens a `static` or `dev` runner.
- "Open in OpenCode" opens a `harness` runner at the app folder.
- A future "Open in DSH" is a config line, not a new screen.
- The Explorer's "running" dots, the pane switcher and the reaper all work the
  same way for every kind.

This is the piece that makes the harness feel like *an app we host*, which is
exactly the mental model you described.

## What the pane looks like

```
+--------------------------------------------------------------+
| [icon] Weather  ·  workshop: OpenCode  ·  ● running      [x] |
+---------------------------------------------+----------------+
|                                             |  Edge rail     |
|   embedded harness UI                       |  ------------  |
|   (its own chat, files, terminal, browser)  |  Brief/Plan    |
|                                             |  SCRs          |
|                                             |  Run / Stop    |
+---------------------------------------------+----------------+
```

Our shell owns the frame, so "FoundationOS in the side panel" is achieved by
**us being the frame**, not by injecting into their DOM. Injecting into another
origin's DOM is impossible anyway — worth saying plainly so we do not plan
around it.

## Phases

| Phase | Deliverable | Proves |
| --- | --- | --- |
| H0 | `serve --standalone` from an app folder, open in a new tab, stop on demand | The instance model and scoping |
| H1 | Host proxy (`oc-<slug>.localhost:4317`) | One origin per instance, WS works |
| H2 | Iframe pane + supervisor + reaper + status states | "Inside FoundationOS" |
| H3 | Pair-link auth, survives refresh, works on a phone over LAN | Any device |
| H4 | Multiple simultaneous instances, switcher, cost cap | Coordination at scale |
| H5 | Runner abstraction generalised (`static` / `dev` / `harness` / `external`) | One launch model for everything |

H0/H1 are days, not weeks. H3 is where the real unknowns live.

## Open questions

Answered 2026-11-25:

1. ~~One workshop or two?~~ **One per app**, roles are sub-agents inside it.
2. ~~Keep working after close?~~ **Yes** — the UI is only a view.
3. ~~LAN or internet?~~ **Both eventually** — the domain exists; see the
   remote-access section and D11.

Still open:

4. Is the harness UI acceptable with our chrome around it, or do you want a
   stripped layout (hidden nav)? Stripping means rewriting their HTML or
   proxying a modified shell — brittle, version-pinned.
5. Do we show a workshop for an app that has never been built (no
   `system/dist`), or is Workshop always available and Run is what waits?
6. On server restart: resume the last job, or mark it `interrupted`? (Lean:
   mark and offer one-click retry — silent resumption is surprising.)
