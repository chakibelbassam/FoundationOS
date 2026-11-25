# Harness routing and memory (D1 + D2)

> **2026-11-25 update:** `16-harness-decision.md` recommends **OpenCode for
> both** chat and App Studio (the M1/M2 hybrid collapses into one engine with
> file memory). This document remains the analysis of the options; read the
> recommendation first, then use this for the reasoning.

## The shape: a registry, not an env var

Today one variable picks one engine for the whole product. That cannot express
"Hermes for chat, OpenCode for App Studio, DSH for that one job".

A registry is a small config file the server reads, plus per-conversation
overrides:

```jsonc
// system/agents.json  (proposed, not implemented)
{
  "agents": {
    "edge": {
      "label": "Edge",
      "harness": "hermes",
      "scope": "conversation",       // Home, or the open project
      "memory": "hermes",
      "tools": "read",               // read | auto | ask
      "surfaces": ["chat", "find", "tasks", "voice"]
    },
    "studio": {
      "label": "App Studio",
      "harness": "opencode",
      "scope": "app",                // always the pressed app folder
      "memory": "workspace+session",
      "tools": "auto",
      "surfaces": ["app-studio"],
      "ui": "embedded"               // embedded | tab | native
    }
  },
  "routing": [
    { "when": "surface == 'app-studio'", "use": "studio" },
    { "when": "job == 'build' || job == 'qa'", "use": "studio" },
    { "default": "edge" }
  ]
}
```

Precedence, in plain words:

1. **A pin** the user set on this conversation ("use OpenCode here") wins.
2. **The surface** decides ("I am in App Studio, so I am in the workshop").
3. **The job** can promote ("Build this" said in chat -> offer the workshop).
4. **The default** catches everything else.

Rule 3 is deliberately an *offer*, not a hijack: it is the same principle as
D6-B. The user sees "This looks like build work — open the workshop?" and can
ignore it.

## What "different agents" actually buys us

An agent in this design is not a personality; it is a bundle:

| Field | Why it exists |
| --- | --- |
| harness | Which engine runs the turn (hermes / opencode / dsh) |
| scope | What folder it may touch — Home, a project, one app |
| memory | Where continuity comes from (see below) |
| tools | read / auto / ask (D3) |
| model | Cheap model for chat, strong model for build |
| surface | Which UI renders it |
| ui | native drawer, embedded harness, or new tab |

Adding an agent is then a config entry plus (maybe) a provider file — not a
new screen. That is the "easy mechanism" you asked for.

## Memory: the actual options

We keep conflating three different things. Separate them and the decision
gets small.

| Layer | What it is | Who owns it today |
| --- | --- | --- |
| **L1 Transcript** | Every message, per scope, as JSON | Us (`edge/store.mjs`), already shared by both providers |
| **L2 Project memory** | Durable, human-readable facts: decisions, conventions, gotchas | Nobody yet — but the repo already uses `AGENTS.md` / `MEMORY.md` |
| **L3 Engine memory** | The harness's own recall (embeddings, summaries, session state) | Hermes has it; OpenCode has sessions + `AGENTS.md` + plugins |

### Option M1 — Hermes owns L3, we own L1, L2 stays light

Chat runs on Hermes, so chat gets good recall for free. Before handing work to
OpenCode, we send a **brief** (not the whole history): goal, decisions,
constraints, files. OpenCode keeps its own session per app.

- Cost: lowest. Nothing to build beyond the brief.
- Risk: two memories that disagree. User says "like we discussed" in the
  workshop and the workshop has never heard of it.
- Fix: the brief is generated from L1/L2, and every handoff writes a line
  back into L2 ("handed to studio: <goal>").

### Option M2 — L2 becomes the product's memory

Memory is **files in the workspace**, and every harness reads them:
`AGENTS.md` (how to work here), `MEMORY.md` (what we know), `DECISIONS.md`
(what we chose and why). Harnesses that support project instructions pick
these up natively; the rest get them pasted into the brief.

- Cost: medium. Needs a curator (who writes/compacts these?) and a size budget,
  or they rot into 400-line walls nobody reads.
- Win: portable. Switch from Hermes to OpenCode to DSH and memory survives.
  It is also inspectable and reviewable — you can read what Edge believes.
- Risk: files drift from reality; concurrent writers clobber each other.

### Option M3 — One memory service, any harness (plugin or MCP)

A small service (OpenCode plugin, MCP server, or our own sidecar) exposes
`remember/search/forget` over a single store. Every harness is a client.

- Cost: highest. Retrieval quality, ranking, write policy, privacy.
- Win: one truth, engine-independent, survives every future swap.
- Risk: this is exactly the "build a memory system from scratch" you said you
  do not want. It is also the thing most likely to be mediocre for months.

### M4 — Adopt DSH because its plugins already solve it

Only worth it if DSH's memory plugin is *actually* better than M1's freebie.
See the DSH questions below.

**Lean:** M1 now + M2 as the bridge, with M3 as the endgame *only if* a third
harness appears. Concretely: Hermes keeps chat memory; every handoff writes a
short brief into L2; the workshop reads L2 and keeps its own session.

**What would change the lean:** if OpenCode's session model plus a memory
plugin is genuinely good (it has `plugin add`, sessions per project, and
`AGENTS.md` loading), then M1 collapses into "OpenCode everywhere" — your
preferred outcome. That is worth a *time-boxed spike*, not a guess.

## Questions only you can answer

1. **What does Hermes memory actually retain?** Per user? Per project? Does it
   survive a server restart? Can we read/export it? If we cannot inspect it,
   M1 makes us dependent on a black box.
2. **DSH** — what is it exactly (a DeepSeek-based harness?), and which plugins
   did you build for it? Specifically: does one of them do memory, and one do
   browser QA? If yes, it is a serious candidate for the workshop seat.
3. **When you say "talk about projects, files"** — do you expect Edge to
   remember *across* projects (a global assistant) or only inside the open
   folder? Scope decides whether memory is one store or many.

## Failure modes to design for now, not later

- **Split brain:** two engines, two truths. Mitigation: single transcript, and
  handoffs are explicit artifacts, never "it remembers".
- **Silent scope creep:** an agent reads/writes outside its folder. Mitigation:
  scope is enforced server-side (already true for Edge; must stay true for
  embedded harnesses).
- **Runaway cost:** every agent instance spends tokens. Mitigation: idle
  shutdown, per-scope concurrency cap, visible "who is running".
- **Stale memory:** L2 grows forever. Mitigation: size budget + compaction step
  in the handoff path.
