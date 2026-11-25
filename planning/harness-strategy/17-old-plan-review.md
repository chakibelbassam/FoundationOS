# Review of the earlier ChatGPT plan

Status: analysis of the plan you shared, mapped against everything we have
learned since (DSH/SynapsAi, OpenCode `serve`/`agent`/`worktree`, Cloudflare
wildcard rules). Verdicts only; nothing here is implemented.

## 1. What carries over unchanged

| Old plan item | Verdict |
| --- | --- |
| Scrum board **inside** FoundationOS, not SynapsAi | Yes. AgentHub is out; scrum records only (`09`) |
| Link each SCR to a stable project/app ID | Yes — `scope: app:<id>` in the schema |
| Capture the **source revision at assignment** | Yes — git base commit (`14`) |
| Keep findings, patch, tests and uncertainty on the SCR | Yes — evidence attachments |
| Severity, priority and acceptance stay human-controlled | Yes — authority matrix (`09` §11) |
| Design so an external board could own a record later | Yes — `externalRef` field, unused in v1 |
| Auto-start the server after boot; private origin listener | Yes (`15`) |
| Local access still works if the tunnel drops | Yes |
| App execution on an origin separate from the workspace session | Yes — one origin per app (`03`) |
| Patch + tests + artifact returned for review | Yes |
| Apply only after review, and only if the target revision matches | Yes — stale check (`14` §4) |
| Restore launcher focus when returning from an app | Yes — Interface Standards §2.1 |
| Release checks as acceptance tests | Yes — model for PRD success criteria |

That is a strong plan. Most of it survives.

## 2. What changed, and why

| Old plan | Now | Why |
| --- | --- | --- |
| `os.cebsolutions.dev` as a **public directory** independent of the PC | Skip for v1 | It exists to route **multiple servers**. One PC does not need it (`15` §7) |
| Cloudflare tunnel + full DNS at Cloudflare | Same, but **first-level** hostnames only | Universal SSL does not cover `*.fos.example.com` (`15` §2) |
| Hermes runs the coding job | OpenCode runs it | Hermes is chat-only in our integration; OpenCode has tools, worktrees, ACP (`16`) |
| Fresh Linux container per job | **Question** — worktree + scoped process first | Docker/WSL2 on this PC is heavy; worktrees give isolation and review (`14`) |
| Muse Spark Contributor + training scope | **Question** — still relevant? | Depends on which provider/model we settle on |
| GPT-6 Luna / Terra model lanes | **Question** | I cannot verify those names; model-specific lanes may be obsolete |
| "One coding job at a time" on the low-spec PC | Still true, but **per app**, not global | A lock per app folder; QA can run alongside (`14` §5) |
| QR invites, accounts, session revocation | **Question** — conflicts with single-user scope | This is multi-tenant work (`06` N1) |
| Codex pairing | **Question** — still a client? | OpenCode may have replaced it |

## 3. Points that need your answer

1. **Model lanes.** Are "GPT-6 Luna" and "GPT-6.1 Terra" models you still use,
   or names from an earlier setup? Should the plan be model-agnostic and only
   name profiles (`edge-chat`, `studio`, `qa`)?
2. **Containers.** Is a container per job still required, or is a git worktree
   plus a scoped process acceptable for v1? Containers are the strongest
   isolation but the slowest feedback loop on Windows.
3. **Accounts and invites.** The old plan has QR invitations and account
   isolation. Our PRD says single user. Which is right for the next release?
4. **Codex.** Is Codex still a target client, or is OpenCode the only harness?
   This changes whether we build a second connector.
5. **Muse Spark / training.** If a provider may train on inputs, do we still
   need a per-project "approved for this provider" flag and a block before
   submission? This is a data-governance decision, not a coding one.
6. **Visual polish track.** Tiles, covers, banners, PS4-style rows — is that a
   separate PRD running in parallel, or should it wait until the workshop and
   work items exist?
7. **Directory.** Confirm we skip the multi-server directory for v1.
8. **Job concurrency.** "One coding job at a time" globally, or one per app?

## 4. What the old plan was missing (now covered)

- **Typed work items** with the Feature / Enhancement / Bug / Enabler / Dev
  Task distinction, and the promise-vs-absence rule (`09`).
- **Priority and effort scales** as separate axes (`09`, `12`).
- **Intake UX** — three doors, one schema, Edge drafts the fields (`13`).
- **Agent protocol** — six `fos_*` tools so any agent can plug in (`10`).
- **Concurrency and corruption** — atomic writes, locks, revisions (`14`,
  `10` §4).
- **Approvals in both surfaces** — harness UI or our rail (`01` D3).
- **Notifications** for work that continues after the tab closes (`01` D13).
- **The AgentHub decision** — explicitly out, scrum only (`01` D8).

## 5. How the old plan maps to the docs

| Old section | Doc |
| --- | --- |
| "Start with a Scrum board inside FoundationOS" | `09`, `10`, `13` |
| "Visual polish" | Not in this PRD — separate track (question 6) |
| "Put the home PC online" | `15` |
| "Let Hermes implement an SCR" | `16` (harness), `14` (worktree), `03` (workshop) |
| "Release checks" | `06` §8 |

## 6. One correction worth recording

The old plan says Hermes produces the patch "using Muse". In our code Hermes
is a **chat completions gateway with no tool access** — it cannot edit files or
run tests. That is not a criticism of the plan; it is a discovery from reading
`providers/hermes.mjs`. Any plan that expects Hermes to produce a patch needs a
worker around it. OpenCode removes that middle layer.

## 7. The one thing the old plan got better than us

It insisted on **a disposable copy of the selected source revision** for every
job. That is exactly right, and it is why `14` puts worktrees at the centre
rather than bolting review on afterwards.
