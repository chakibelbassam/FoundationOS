# visible terminal plugin

Native OpenCode tools for the built-in terminal tab, plus the git guardrail. One package, two jobs:

| Tool | What it does |
| --- | --- |
| `terminal_list` | Terminals attached to the session |
| `terminal_create` | Open or reuse a terminal tab, defaulting to the workspace directory |
| `terminal_type` | Type a command, optionally slowly so the owner can watch |
| `terminal_read` | Read the visible screen as evidence |
| `terminal_close` | Close a tab |

The guardrail refuses `git push` to `main`, `master` or `codex/development-workspace`, force-push, `push --all`/`--mirror`, `gh pr merge`, self-approval, `git reset --hard` and `git clean -f`. It runs twice: inside `terminal_type` and as a `tool.execute.before` hook, so a hidden shell call cannot bypass it either.

## Layout

| File | Purpose |
| --- | --- |
| `server.ts` | Tool registration and the execute hook |
| `guard.mjs` | Pure rule function, shared by both entry points |
| `guard.test.mjs` | Rules covered by `node --test` |
| `package.json` | Names the server part so OpenCode loads `server.ts` |

The terminal work itself is not reimplemented here: the tools call `Edge/tools/opencode-terminal.mjs`, the same script the [opencode-terminal skill](../../skills/computer-use/opencode-terminal/SKILL.md) documents.

## Verify

```powershell
node --test Edge/plugins/visible-terminal/guard.test.mjs
node --test Edge/tools/opencode-terminal.test.mjs
```

Then, in a session with this configuration, ask the agent to create a terminal, type `Write-Host ok`, and read it back. A blocked command such as `git push origin main` must fail with the reason instead of running.

## Notes

- The plugin runs inside the OpenCode server, whose `process.execPath` is the OpenCode binary. It spawns the system `node`; set `EDGE_NODE` to override.
- Child processes are asynchronous so a slow command never blocks the server.
- A local plugin is loaded from both `opencode.json` files: the repository root and `Edge/`.
