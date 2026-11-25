# SynapsAi and DSH — what to reuse, what to avoid

Evidence gathered 2026-11-25 by reading the bundle at
`SynapsAi - version control\SynapsAi - Bundle` (v0.2.1) and
`deepseek.com/en/harness`.

## What DSH is

DeepSeek Harness: open source (MIT), "everything is a plugin" (Cordis),
desktop app **or** web UI (`npx @deepseek-ai/dsh web`). Ships workspaces,
automation, background tasks, trace/trajectory inspection, and native Agent
Teams. It is the same model family we are already running.

**This changes the harness comparison.** OpenCode is no longer the only
candidate with a web UI:

| | OpenCode 2.4.1 | DSH |
| --- | --- | --- |
| Web UI | `serve` (verified 200 text/html, mobile viewport) | `dsh web` (native) |
| Auth | own (401), pair links | own, authenticated URL |
| Embeddable | no `X-Frame-Options`, no `frame-ancestors` | unknown — must test |
| Extension model | plugins (`plugin add`) | **plugins are the architecture** |
| Work state | none built in | SynapsAi provides scrum + agent hub |
| Browser QA | browser tooling | `delivery-preview-browser` (independent observation) |
| Upgrade cost | pin a CLI version | **per-version guarded native patches** |

## What SynapsAi actually contains

| Package | What it does |
| --- | --- |
| `extensions/synapsai-workspace` | Project identity, capability guidance, trusted workspace bindings |
| `extensions/tool-scrum` | PI / feature / enabler / PBI / bug / SCR / task / sprint records + guarded tools |
| `extensions/agent-hub` | Reusable agents, jobs, delivery stages, candidate isolation, recovery |
| `extensions/tool-agent-hub` | Scoped assign / discuss / submit / check — **no human acceptance authority** |
| `extensions/delivery-preview-browser` | Independent browser observations for reviewing a candidate |
| `client/ui-synapsai-home` | Project overview, Scrum workspace, navigation |
| `client/ui-agent-hub` | Agents, skills, teams, workflows, jobs |
| `bundle/synapsai-app` | Composes it over a DSH Web profile; Muse default |

Storage is project-local and human-readable:
`.SynapsAi/scrum/` → per-item Markdown, `config.yaml` counters, `notes/<id>.md`
journals, `docs/<pi>/`, `docs/drafts/`.

## The part we must copy: the agent contract

`scripts/Scrum-Mcp.mjs` is a stdio MCP server exposing exactly six tools:

```
scrum_access    -> principal, project, allowed operations, expiry
scrum_manual    -> rules for a topic/type before you write
scrum_query     -> list / get / hierarchy, bounded pages, revisions
scrum_validate  -> validate the project against its owner
scrum_mutate    -> create / update with exact observed revision
scrum_receipt   -> reconcile a lost mutation by its request_id
```

Its own initialization text is the design brief:

> "Read scrum_access and scrum_manual first. The Host owns all Scrum storage.
> This external principal has planning authority only. After a lost mutation
> response reconcile its UUID before retrying."

Seven principles worth stealing verbatim:

1. **The host owns storage.** Agents never open files; they call tools.
2. **Access before action.** Capability introspection is the first call.
3. **Self-describing rules.** The manual is queryable, per type and action.
4. **Optimistic concurrency.** Every write carries `expected_revision`.
5. **Idempotent writes.** `request_id` + receipts survive lost responses.
6. **Authority separation.** Agents plan and propose; humans accept.
7. **Finite grants.** 8-hour connector lifetime, per-installation credential,
   disabled on host restart.

These are exactly the properties FoundationOS needs to be "a place that
organizes work" that any agent can plug into. We should implement the same
six verbs, not invent a seventh vocabulary.

## What we must NOT copy: the coupling

SynapsAi works by **patching native DSH source per version**:
`integration/dsh/0.2.1-alpha.1/overrides/...` with guard hashes, a connector
that refuses mismatched commits, separate homes per version, and ports
3082/3083/3084/3085 for different builds. That is the right engineering for a
plugin bundle that must survive a fast-moving alpha. It is the wrong
foundation for FoundationOS, which must stay harness-agnostic.

Also note the vocabulary collision: SynapsAi treats `bug` and `SCR` as two
*item types*. FoundationOS uses "SCR" for the whole request record. If we
adopt their schema naively we will argue about words forever.

## Three reuse paths

| Path | What it means | Saves | Costs |
| --- | --- | --- | --- |
| **R1. Steal the mechanics** | FoundationOS implements the six verbs + revisions + receipts against its own store; SynapsAi is a reference, not a dependency | Nothing to maintain, stays harness-agnostic | We write the store and tools (~the real work) |
| **R2. Reuse the bundle** | DSH + SynapsAi becomes the workshop; FoundationOS embeds it and reads its scrum state | Weeks of work-state UI and delivery pipeline | Version-locked to DSH alpha; patches on every upgrade; two UIs |
| **R3. Hybrid** | FoundationOS owns the canonical work state; a small bridge exposes it over MCP to DSH, OpenCode and others | Best of both; one truth | Bridge must be maintained; DSH's own scrum UI becomes read-mostly or disabled |

**Lean: R1 now, R3 as the target.** R2 only if you decide the SynapsAi UI *is*
the product and FoundationOS becomes its shell.

Reasoning: the six verbs are small. The DSH patch treadmill is not. And the
moment we adopt R2, every "does FoundationOS work with OpenCode?" question
becomes "does it work with this DSH commit?".

## The question that decides R1 vs R2

Do you want SynapsAi's **AgentHub delivery pipeline** (isolated candidate,
independent reviewer, evidence, recovery) inside FoundationOS?

- If **yes**: R2 is almost certainly cheaper — that pipeline is deep, and it
  already exists.
- If **no** (you want planning + SCRs + a workshop, with a human reviewing the
  diff): R1 is enough, and much lighter.

There is no partial version of AgentHub that is worth building. That is the
honest fork.

## Facts we still need

1. Does `dsh web` set `X-Frame-Options` / `frame-ancestors`? (embeddability)
2. Does DSH expose an HTTP API with the same authority model as the MCP
   connector, or is MCP the only external door?
3. Can a DSH plugin read a **foreign** store (our JSON) safely, or must the
   host own it?
4. Does SynapsAi's scrum store survive two concurrent writers (agent + UI)?
   (It has a store lock — verify the failure mode.)
5. What is the licence/attribution obligation if we copy the *mechanics* and
   re-implement? (MIT — fine, but note it.)

## Naming decision this forces

"SCR" cannot mean both "the request form" and "an item type". Proposed
vocabulary in `09-triage-guide.md`: **Work Item** is the umbrella; SCR is the
*intake record* that produces one; types are Feature, Enhancement, Bug,
Development Task. Decide once, then never again.
