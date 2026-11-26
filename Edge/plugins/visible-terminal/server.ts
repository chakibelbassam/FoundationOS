import { Plugin } from "@opencode/plugin"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { evaluateGitGuard } from "./guard.mjs"

// Native tools for the visible OpenCode Desktop terminal tab, plus the
// git/GitHub guardrail. The terminal work itself lives in
// Edge/tools/opencode-terminal.mjs so the skill, the CLI and this plugin all
// share one tested implementation.

function resolveToolScript(ctx) {
  const project = ctx.location?.project
  const roots = [project?.canonical, project?.directory, ctx.location?.directory].filter(Boolean)
  for (const root of roots) {
    const candidate = path.join(root, "Edge", "tools", "opencode-terminal.mjs")
    if (fs.existsSync(candidate)) return candidate
    const nested = path.join(root, "FoundationOS Development", "Edge", "tools", "opencode-terminal.mjs")
    if (fs.existsSync(nested)) return nested
  }
  return undefined
}

export default Plugin.define({
  id: "edge.visible-terminal",

  async setup(ctx) {
    const script = resolveToolScript(ctx)
    if (!script) {
      console.warn("visible-terminal: Edge/tools/opencode-terminal.mjs not found; terminal tools disabled")
      return
    }

    // The plugin runs inside the OpenCode server, whose process.execPath is the
    // OpenCode binary. Spawn the system node that the CLI tool is written for.
    const nodeBinary = process.env.EDGE_NODE ?? "node"

    const run = (command, args) =>
      new Promise((resolve, reject) => {
        const file = path.join(os.tmpdir(), `edge-term-${process.pid}-${Date.now()}.json`)
        fs.writeFileSync(file, JSON.stringify(args))
        const child = spawn(nodeBinary, [script, command, "@" + file], { windowsHide: true })
        let out = ""
        let err = ""
        const timer = setTimeout(() => child.kill(), 180_000)
        child.stdout.on("data", (chunk) => (out += chunk))
        child.stderr.on("data", (chunk) => (err += chunk))
        child.on("error", (error) => {
          clearTimeout(timer)
          fs.rmSync(file, { force: true })
          reject(error)
        })
        child.on("close", (code) => {
          clearTimeout(timer)
          fs.rmSync(file, { force: true })
          if (code === 0) resolve(out.trim())
          else reject(new Error(err.trim() || out.trim() || `exit ${code}`))
        })
      })

    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "terminal",
        description:
          "The OpenCode Desktop terminal tab that the owner can watch. Prefer it over hidden shell calls for builds, tests, app launches and git.",
      })

      editor.add({
        name: "list",
        description: "List the persistent terminals attached to a session, with their ptyID, title and status.",
        input: {
          type: "object",
          properties: { session: { type: "string", description: "Session ID; defaults to the calling session" } },
          additionalProperties: false,
        },
        options: { namespace: "terminal", codemode: true },
        execute: async (input, context) => ({
          content: await run("list", { session: input.session ?? context.sessionID }),
        }),
      })

      editor.add({
        name: "create",
        description: "Open a terminal tab for the session, or reuse the existing one. Returns the ptyID.",
        input: {
          type: "object",
          properties: {
            session: { type: "string" },
            title: { type: "string", description: "Plain label the owner recognises, e.g. edge-terminal" },
            cwd: { type: "string" },
            command: { type: "string", description: "Shell executable; defaults to the user's shell" },
          },
          additionalProperties: false,
        },
        options: { namespace: "terminal", codemode: true },
        execute: async (input, context) =>
          ({
            content: await run("create", {
              session: input.session ?? context.sessionID,
              title: input.title,
              cwd: input.cwd ?? ctx.location?.directory,
              command: input.command,
            }),
          }),
      })

      editor.add({
        name: "type",
        description:
          "Type text into a terminal and press Enter. Use slowMs (60-120) when the owner is watching so each keystroke lands visibly.",
        input: {
          type: "object",
          properties: {
            ptyID: { type: "string" },
            text: { type: "string", description: "One command, exactly as it should run" },
            slowMs: { type: "number", description: "Delay between characters in milliseconds" },
            enter: { type: "boolean", description: "Press Enter after typing; defaults to true" },
            settleMs: { type: "number", description: "How long to collect output before returning" },
          },
          required: ["ptyID", "text"],
          additionalProperties: false,
        },
        options: { namespace: "terminal", codemode: true },
        execute: async (input) => {
          const blocked = evaluateGitGuard(input.text)
          if (blocked) throw new Error(blocked)
          return {
            content: await run("type", {
              ptyID: input.ptyID,
              text: input.text,
              slowMs: input.slowMs,
              enter: input.enter,
              settleMs: input.settleMs,
            }),
          }
        },
      })

      editor.add({
        name: "read",
        description: "Read the visible screen of a terminal so the result can be quoted as evidence.",
        input: {
          type: "object",
          properties: { ptyID: { type: "string" } },
          required: ["ptyID"],
          additionalProperties: false,
        },
        options: { namespace: "terminal", codemode: true },
        execute: async (input) => ({ content: await run("read", { ptyID: input.ptyID }) }),
      })

      editor.add({
        name: "close",
        description: "Close a terminal tab and stop its shell. Leave the session terminal open for follow-ups.",
        input: {
          type: "object",
          properties: { ptyID: { type: "string" } },
          required: ["ptyID"],
          additionalProperties: false,
        },
        options: { namespace: "terminal", codemode: true },
        execute: async (input) => ({ content: await run("close", { ptyID: input.ptyID }) }),
      })
    })

    // Guardrail: refuse the operations the owner reserved for themselves,
    // whichever tool tries to run them.
    await ctx.tool.hook("execute.before", (event) => {
      const tool = String(event.tool ?? "")
      if (!/shell|bash|powershell|terminal/i.test(tool)) return
      const input = event.input ?? {}
      const text = typeof input.command === "string" ? input.command : typeof input.text === "string" ? input.text : ""
      const blocked = evaluateGitGuard(text)
      if (blocked) throw new Error(blocked)
    })
  },
})

