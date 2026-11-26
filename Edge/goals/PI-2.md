# Goal — Complete 📦 PI-2 (Client foundation) for FoundationOS v0.2

Edge, own this increment from the first work item through a polished, independently tested release candidate and review-ready GitHub PRs. I’ll be away. Use this prompt as my authorization to carry out the recorded PI-2 work, delegate implementation and QA, fix defects, push scoped branches and open PRs. Make routine decisions yourself and keep going across work items and sprints.

## Start from the actual state

Work from `C:\FoundationOS\FoundationOS Development`. Read the root `AGENTS.md`, `Edge/AGENTS.md`, the relevant Edge skills, and `scrumWorkspace/documents/PI-02/client-increment-plan.md`. Use `scrumWorkSpace` to query PI-02, its five sprint buckets, WorkItem-24 through WorkItem-44, their acceptance criteria, dependencies, notes and linked documents. Use the product vision, interface inventory, procedures and prototype research when a design question arises.

Verify the target before every delegation. PI-2 produces the client under `versions/0.2 FoundationOS/`. Its backend dependency is the separately started, released v0.1 server. The OneDrive prototype is a reference for investigation and selective reuse. Inspect the current checkout, local changes and open PRs before branching. Make sure the implementation checkout contains the reconciled v0.1 baseline and current PI-2 plan. Preserve existing work.

## Own the records and the plan

You own the Scrum lifecycle for this PI: activate PI-02 and each sprint when its turn comes, move work items proposed → ready → active → review → done, and write a note at each transition. Review and done require evidence. Pull-request merges stay with me.

When evidence diverges from the plan, resequence, reprioritise, revise effort, move proposed work between the five sprints, or add and defer items with a recorded reason. Keep the five sprints and existing IDs, and report what changed. The running Scrum server may still enforce the older owner-controlled policy until it is restarted; verify the `manual` records topic before relying on activation.

## Run the team

**Edge owns coordination.** Select the next item, give the contributor a bounded brief, review its output, and give the independent tester the resulting candidate. Continue into the next item when the dependency evidence supports it.

**Muse Spark 1.3 Contributor** is the default for implementation, fixes, research tasks, documentation and other scoped contributor work. Delegate generously. Request Max reasoning effort when supported, otherwise Xhigh, otherwise the highest supported setting. Record the effective setting.

**GLM 5.3 Flash** owns independent QA and testing. Give it the work-item acceptance, version pair, candidate revision, entry point and test data. Let it derive its own checks. Have it reproduce failures and retest Muse’s fixes against the updated candidate.

**GLM 5.3** is the selective architecture and reasoning fallback. Use it for a genuinely large design problem, competing architectural choices with material consequences, or a persistent failure after focused investigation and repair. Give it one precise question, the evidence and what has already been tried. Return implementation to Muse and verification to Flash.

Resolve the exact model IDs and supported effort settings with OpenCode’s model inventory. Edge’s lifecycle skill names `opencode-go/muse-spark-1.3-contributor` and `opencode-go/glm-5.3-flash`. Verify the full GLM 5.3 entry separately. Record the effective model and effort used. If a role is temporarily unavailable, retry and advance independent work. Keep premium GLM 5.3 calls deliberate.

Every delegation includes the titled work item, target folder, acceptance, relevant references, permitted edit scope and expected evidence. Parallelize independent investigation or QA when useful. Give each edit a single owner. Edge runs Git and GitHub operations through the visible OpenCode terminal according to its lifecycle skill.

## Work autonomously and leave a usable trail

1. Read the live item and its dependencies. Follow the recorded delivery order. Distinguish a technical dependency from the previous item in the queue.
2. Have Muse deliver the smallest complete change that satisfies the item. Review it through its normal entry point. Give Flash the resulting candidate for independent verification.
3. For a failure, capture the reproduction, expected and actual behaviour, candidate revision and environment. Send the finding to Muse, then send the fix back to Flash. File distinct confirmed defects through the Scrum workflow. Track each through retest.
4. Answer routine questions using the PI plan, owner decisions, existing code, Edge skills and project knowledge. When evidence leaves a choice open, choose a reasonable reversible default. Add a dated **assumption** note to the relevant Scrum item with the question, chosen answer, reason and how to verify it. Identify it as Edge’s judgement. Put PI-wide assumptions in one linked PI document so I can review them together.
5. Keep resumable handoffs in `Edge/workspace` using `manage-edge-handoff`. Record the current item, branch, candidate revision, agent assignment, latest check and next action. Put durable evidence, decisions and PR links in Scrum. Update the version README, component inventory and other owning documents when the work changes them. Keep credentials and private test data out of notes, screenshots and commits.
6. After a restart, compaction or agent failure, reconcile the handoff with the live records, branches and PRs, then resume. Continue until the delivery condition below is met. If an external dependency genuinely blocks one path, finish all unaffected work and report precisely what remains.

## Recorded product decisions

- **Settings defaults.** Theme System, surface Glass, density Comfortable, motion On, cursor Target. First run applies them; each is a per-member choice stored by member id.
- **Motion.** Motion stays on when Windows requests reduced motion unless the member chooses Off or Follow system. WI-044 owns the tokens, timings, easing, 60 fps and no-layout-shift acceptance, and the reduced-motion variants. Glass is the default surface, so any mid-flip bleed is a first-run defect.
- **Release bar.** Only Sev-1 blocks. A failure of a stated PI acceptance criterion counts as Sev-1. Record every Sev-2 to Sev-5 finding for me. Target current Edge and Chrome with WCAG AA contrast (4.5:1 text, 3:1 interface components) in Solid and Glass.
- **Descriptor budget.** Probe visible folders only: at most 12 per view, 3 concurrent, cached for the session, activated item first. Fixture: 200 entries with 40 folders; the shelf stays usable before probes settle.
- **App identity.** One fixed Material app icon in v0.2; an optional descriptor icon is later work.
- **Files.** Non-text or oversized files show an unavailable state with type and size; v0.2 has no download.
- **Server check.** Require `/status.version` `0.1` and a known schema; show expected and found.
- **Member switching.** A refresh returns to Connect. Add a Disconnect item to the username menu. Keep the last member id in sessionStorage at the client origin, never in the URL.

## Sessions, evidence and test data

- The client accepts an existing member session token in memory only. Never write account keys, invitation tokens, session tokens or personal files into the repository, notes, logs, screenshots or preferences. Revoke a leaked session.
- Document the admin → invitation → account → session sequence in the version README. The operator helper reads a key securely and prints a token without writing it.
- Run QA against disposable stores with `FOUNDATIONOS_DATA` and a client data-directory override, never my real installation.
- Keep curated, secret-free QA evidence under `versions/0.2 FoundationOS/qa/` and contributor artifacts under `versions/0.2 FoundationOS/agents/{role}/{WI-ID}/`. Ignore raw captures, builds and dependencies.

## Verify the product I expect

**Use OpenCode’s built-in browser for all interactive browser QA.** Open the URL printed by the actual launcher. Use isolated test data. Do not launch Chrome or silently substitute an external browser. If Flash cannot access the built-in browser directly, let Flash design the test and evaluate the evidence while Edge operates that browser. If browser access is unavailable, record the gap and continue the checks that can run.

Verify the complete Weather journey. Start v0.1 first, launch the built v0.2 client separately on a free port, connect one active member, find Weather, reveal **Run · Open · More**, open its overview, read its README, refresh, reconnect and return with Back to the originating action. In v0.2, Run explains runtime availability. Open visits the overview.

Give the essential components real attention:

- **App card and Glass.** Test a quick pointer pass, roughly one second of hover, deliberate activation, held Enter, Escape and rapid reversal. Inspect intermediate flip frames on a busy background. Check text legibility, stationary neighbours, the first focus on Run after keyboard reveal, and the reduced-motion face change. Judge timings against the WI-044 token table.
- **Folders and Target Cursor.** Check nested folders, arrow boundaries, scroll and focus restoration. Verify which control the brackets frame over a widget, its decorative icon and a separate action button. Check lock-on during transitions, loading, menu dismissal, resize and input changes. Record physical stylus observations separately from emulation. Use the keyboard to verify the directional model intended for later controller work.
- **Profile and Settings.** Use one active profile. Under the same Windows login, save different theme, surface, density, motion and cursor choices for two members. Fully restart the client on a different port and reconnect as each member. Verify that each gets their own settings and home. Exercise Apply, Cancel, Reset and a failed save.
- **Independent release QA.** Protect the fifth sprint for visual review, defect fixes and retesting. Cover desktop, 390 px and 320 × 600, plus revoked sessions, stale responses, missing files, malformed app descriptors and unavailable servers. Check the first-run Glass surface, the motion timings and the per-member defaults. Attach evidence from the final candidate. State which hardware and surfaces were actually tested.

## Deliver and stop

Follow the repository’s work-item branch and PR conventions. For dependent items whose predecessors await owner merge, use reviewable dependent branches or stacked PRs, document their base and review order, and verify the combined candidate. Keep moving without requiring me to merge intermediate PRs. Monitor required CI, fix actionable failures and mark passing PRs ready for review.

**Your unattended delivery is complete when all 21 planned items have been carried through their acceptance checks, release-blocking findings have been fixed and independently retested, the combined v0.2 candidate has passed its release journey, and the delivery PRs are open and review-ready.** Link every item to its evidence and PR. You own the Scrum transitions and attach the evidence; I own the merges.

Finish with one report containing the tested version pair and candidate revision, the five sprint outcomes, the status of all 21 items, PR links in review order, CI and independent QA results, assumptions you made, and any remaining device limitations or owner actions. A scaffold, an intermediate PR, or a passing unit suite alone is a checkpoint. Continue through release review.
