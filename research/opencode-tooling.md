# OpenCode tooling for Edge

Scouted 25 November 2026. This records what Edge now has, what was deliberately left out, and what to add next. It is equipment for the development checkout, not a promise about the product.

## Installed

| Piece | Where | Why |
| --- | --- | --- |
| Edge skills pointer | `opencode.json` in the repository root and in `Edge/` | The 13 Edge skills load for any session started there |
| `scrumWorkSpace` MCP | both configs | PI, sprint and work item records as tools, not shell calls |
| `context7` MCP (remote) | both configs | Version-correct docs for React, MUI, Node and everything else we build on |
| `visible-terminal` plugin | `Edge/plugins/visible-terminal` | Native `terminal_*` tools plus the git guardrail |
| `opencode-terminal` skill + tool | `Edge/skills/computer-use`, `Edge/tools` | The procedure and the tested CLI the plugin calls |

A session started from `C:\FoundationOS` also gets the skills, because `C:\FoundationOS\opencode.json` points at the same Edge folders. That file is machine-local on purpose; the repository configs are the durable copy.

## MCP decisions

Context cost is measured in characters of tool definitions loaded before any work happens. The figures below are from a November 2026 survey that ran 15 servers and measured each one.

| Server | Cost | Decision |
| --- | --- | --- |
| Context7 | 2 tools, ~5k chars | **Installed.** Fixes the most common agent error: confidently using an API that changed after training. |
| GitHub | 46 tools, ~49k chars | **Skipped.** `gh` already covers it, and the MCP would hide git work from the terminal the owner asked to watch. Revisit only if an agent needs Actions or security alerts. |
| Playwright | 25 tools, ~19k chars | **Later.** The repository already has `browser-qa.cjs`, `Run-EdgeTool browser`, and the desktop browser. |
| Chrome DevTools | 33 tools, ~30k chars | **Later.** For performance work once a real client renders something. |
| Filesystem | 16 tools, ~14k chars | **Skipped.** Native file tools already exist and a second root scoping adds ambiguity. |
| Memory | 9 tools, ~8k chars | **Skipped.** scrumWorkSpace is the durable memory. |
| Sentry, Supabase, Figma, Linear | varies | **Later**, or never. Add only when the product has deployments, a database, designs, or an issue tracker. |

Rule applied: a server earns its context only if it answers something nothing else in the session answers.

## Plugin decisions

Plugins run inside the OpenCode server and can add tools, hooks, commands, agents, skills, MCP servers, permissions and VCS providers. Two were worth building now and one package covers both:

1. **Native terminal tools.** The terminal stopped being "a script the agent shells out to" and became `terminal_list`, `terminal_create`, `terminal_type`, `terminal_read`, `terminal_close`. Any session with the config gets them, without knowing the ticket header or the PowerShell quoting workaround.
2. **Git guardrail.** `git push` to `main`, `master` or `codex/development-workspace`, force-push, `push --all`/`--mirror`, `gh pr merge`, self-approval, `git reset --hard` and `git clean -f` are refused by code. It is checked in `terminal_type` and in a `tool.execute.before` hook, so a hidden shell call cannot dodge it.

Considered and not built: a desktop notification plugin (OpenCode Desktop already notifies), an auto-formatter plugin (the `formatter` config field already does this), and a policy plugin that reviews every command with a model (cost and latency for little gain over explicit rules).

## Skill scouting

The 13 existing skills cover delivery, planning, interface design, verification, publishing, handoff and Scrum knowledge. Against what PI-01 will need, three gaps stand out:

| Gap | Why it matters now | Order |
| --- | --- | --- |
| Architecture decision records | The next conversation is architecture. Decisions need a durable, dated home with the alternatives that lost. | First |
| Reviewing a diff | PRs exist, but no skill says how to review one for correctness, security and missing tests. | Second |
| Debugging a failure | Triage classifies a report; nothing covers reproducing and isolating a defect. | Third |

Not needed yet: dependency upgrades (no dependencies of our own), performance profiling (nothing renders), release notes (the GitHub lifecycle already produces them).

## Risks

- MCP tools and page content are untrusted input. A docs server returning a poisoned example is still just text; the guardrail, not the prompt, is what stops a bad command.
- Context7 entries are community-contributed and Upstash says it cannot guarantee accuracy. Cite the version used.
- The plugin runs in the server process. It spawns asynchronous children only; blocking spawn was fixed during this work because it froze the server.
- The local config in `C:\FoundationOS` is not in git. Recreate it from the repository config on another machine.

## Verify

```powershell
node --test Edge/tools/opencode-terminal.test.mjs
node --test Edge/plugins/visible-terminal/guard.test.mjs
npm test
```

Then ask a session to create a terminal, type `Write-Host ok`, read it back, and try `git push origin main`, which must be refused with a reason.

## Sources

- OpenCode V2 docs: skills, instructions, MCP servers, plugins, plugin server API
- `corsair.dev` "Best MCP servers in 2026: 15 measured for context cost and risk", 17 November 2026
- `github.com/anomalyco/opencode` protocol and handler sources for the PTY ticket and WebSocket contract
