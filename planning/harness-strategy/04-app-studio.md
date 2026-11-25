# App Studio, hybrid (D5)

## What it is today

App Studio builds a prompt from the app folder + a chosen action, offers
"Open in OpenCode", and has stages for getting from an idea to a built app.
SCRs can be filed against an app; work items and a worker exist too.

The complaint: it is the worst screen. It asks the user to drive a machine they
cannot see, and hides the thing that actually does the work.

## The split (your choice: B)

| Stage | Owner | Why |
| --- | --- | --- |
| **Brief** — what is this app, who is it for, what does "done" mean | FoundationOS | It is a decision, not a task. Needs your judgement, not an agent's |
| **Plan** — steps, acceptance checks, risks, split into work items | FoundationOS (Edge drafts, you approve) | This is where SCRs and priorities live |
| **Build** — write code, wire files | Harness | It has tools, a terminal, a browser |
| **Run / QA** — start it, click it, screenshot it, report | Harness | The reason we want OpenCode |
| **Publish** — promote to `system/dist` | FoundationOS | It is our release gate, not the agent's |

Everything left of Build is *conversation*; everything from Build on is
*work*. That is also the clean seam for D1.

## The handoff is a file, not an API

This is the important design choice. If the brief can only travel through an
API call, it dies the moment we change harnesses. If it is a file in the app
folder, any harness can read it, you can read it, and it survives everything.

Proposed artifacts, additive only (never restructure existing folders):

```
Weather/
  app.json
  AGENTS.md        # how to work in this app (already a repo convention)
  BRIEF.md         # why, who, done-when          <- written by App Studio
  PLAN.md          # ordered steps + acceptance   <- written by App Studio
  system/
    dist/          # published build (unchanged)
    qa/            # screenshots, logs, reports   <- written by the harness
```

Then "Open workshop" is not a prompt dump. It is: start the harness at
`Weather/`, and its first message is one line — *"Read BRIEF.md and PLAN.md,
then start with step 1."* Short, stable, harness-agnostic.

Why this beats a giant generated prompt (what we do now):

- The agent can re-read it after a context loss.
- QA can write back into `system/qa/` and the next run sees it.
- You can edit the plan without retyping it into a chat box.
- A new harness needs zero integration to understand the job.

## What happens to SCRs and work items

Decision needed: are SCRs the *source* of PLAN.md, or a parallel track?

- **S1. SCRs are the queue.** PLAN.md is generated from open SCRs for the app.
  Approving a plan = the SCR list. One truth, but SCRs must then carry enough
  detail to be actionable.
- **S2. PLAN.md is the queue.** SCRs stay as "things noticed", and planning
  promotes the ones worth doing into PLAN.md. Two objects, clear roles.
- **S3. Merge them.** SCRs become work items with a type (feature/bug/
  enhancement/engineering), which is the same taxonomy you want for PRDs.

You asked for the PRD -> features/bugs/enhancements/engineering tasks flow.
S3 is that flow applied at app scale. It is the most coherent, and the most
work.

**Lean:** S2 now (keeps today's SCRs working), S3 when the PRD workflow is
proven on FoundationOS itself.

## QA loop

The point of the browser is evidence. So define what comes back:

- Harness runs the app, exercises the acceptance checks in PLAN.md.
- Writes `system/qa/<date>-<slug>.md` with pass/fail per check and embeds
  screenshots.
- FoundationOS reads that folder and shows "Last QA: 6/6 passed, 2 hours ago"
  on the app card, with a link to the report.
- A failed check can be turned into an SCR in one click.

Without this, QA is just a chat message that scrolls away.

## What the screen becomes

One page per app, three blocks:

1. **Brief** — short text, editable, saved to BRIEF.md.
2. **Plan** — ordered list with acceptance checks, saved to PLAN.md, plus
   "draft with Edge" and "file as SCRs".
3. **Workshop** — big primary action: open the harness at this folder, with
   live status (not running / starting / ready), plus Run and Publish.

No stages wizard. The stages were hiding the fact that there are only three
things to decide.

## Risks

- **Two sources of truth** (PLAN.md vs SCRs vs harness session). Mitigation:
  PLAN.md is generated, not hand-maintained, once S3 lands.
- **The agent ignores the plan.** Mitigation: acceptance checks are concrete
  and testable, and QA reports against them by name.
- **Users edit BRIEF.md directly and the UI overwrites it.** Mitigation: the UI
  reads before writing, and shows "changed on disk" instead of clobbering.

## Open questions

1. Does the Brief live per app only, or also per feature ("brief for this
   change")? Per-feature is how real work gets scoped.
2. Who writes `AGENTS.md` for a new app — us at creation time, or the first
   planning session?
3. Do you want App Studio to be able to *start* a build without you opening the
   pane (fire and forget), or always require you to watch?
