---
name: opencode-terminal
description: Run apps, builds, and git work in the OpenCode Desktop built-in terminal tab so the owner can watch the agent type, instead of hidden background shells.
---

# opencode terminal

This is the preferred way to run anything the owner should see: builds, test runs, app launches, and git commands and activities. The terminal lives in the OpenCode Desktop right-hand tab, stays attached to the current session, and keeps showing output after the agent disconnects.

## Procedure

Work from the repository root. The session defaults to `OPENCODE_SESSION_ID`, so the terminal appears in the owner's current tab. Every command takes an optional JSON object as the second argument. Windows PowerShell strips embedded double quotes from native arguments, so on this machine prefer `@path` to a JSON file over inline `'{"..."}'`. Write the file under `Edge/workspace/` (ignored) and pass it like this:

```powershell
'{"ptyID":"pty_persistent_...","text":"npm test"}' | Out-File Edge/workspace/term-args.json
node Edge/tools/opencode-terminal.mjs type '@Edge/workspace/term-args.json'
```

### 1. Reuse or create one terminal per session

```powershell
node Edge/tools/opencode-terminal.mjs list '{}'
node Edge/tools/opencode-terminal.mjs create '{"title":"edge-terminal"}'
```

Reuse the existing terminal when `list` shows one. Create with a plain title the owner recognises. Record the `ptyID` (it starts with `pty_persistent_`).

### 2. Type the command

```powershell
node Edge/tools/opencode-terminal.mjs type '{"ptyID":"pty_persistent_...","text":"npm test","slowMs":90}'
```

The tool mints a fresh single-use ticket, connects as controller, sends the text, presses Enter, waits for the output to settle, and reports the tail. Use `slowMs` 60-120 when the owner is watching so each keystroke lands visibly; omit it for unattended work. Pass `"enter":false` to type without running, and `"settleMs":5000` after slow commands.

### 3. Read the screen to verify

```powershell
node Edge/tools/opencode-terminal.mjs read '{"ptyID":"pty_persistent_..."}'
```

`read` returns the visible text plus cursor position. Quote the observed output as evidence; never claim a command passed without reading it.

### 4. Close what you opened

```powershell
node Edge/tools/opencode-terminal.mjs close '{"ptyID":"pty_persistent_..."}'
```

Leave the session terminal open for follow-ups. Close one-off terminals when done.

## Safety

- Announce before typing when the owner might be watching or using the same terminal. Never type into a terminal the owner is actively using without asking first.
- Typing takes controller from the tab's current holder with takeover, but the tab keeps showing everything. The owner never loses the output.
- Tickets are single-use and expire in 60 seconds; the tool mints one per `type` call, so never reuse or log them.
- Never read, print, or commit the server password from the OpenCode state folder. The desktop CLI already carries credentials.
- Send PowerShell text exactly as it should run; the tool presses Enter with `\r`. For another shell, pass `"command"` at `create` time.
- One command per `type` call. For a sequence, type, read, then type the next step.

## Done when

- The command text and its output are visible in the owner's terminal tab.
- The `read` text is quoted or attached as evidence on the work item.
- No background shell was used for work the owner asked to watch.
