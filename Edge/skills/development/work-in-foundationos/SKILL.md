---
name: work-in-foundationos
description: Orient a new FoundationOS session, reconcile prototype versus version, and resume an item from a nested folder.
---

# work in foundationos

For product planning, implementation and review, query the PI through scrumWorkSpace. Follow an item's parent sprint to its PI. Use the PI's targetVersion to identify its exact folder under versions, then check its brief, launcher and the work item's acceptance against that target. Record the PI, version and folder in the handoff to a reviewer and in acceptance evidence. For example, PI 1 (FoundationOS Server) targets 0.2 and is verified through versions/0.2 FoundationOS/Start.cmd; a run against 0.1 is evidence for that slice only. If the target is missing or the sources conflict, identify the discrepancy and resolve it against the owner's decision before editing or verifying the product. Record an owner-approved retarget on the PI. PI-00 covers development setup and has no product release.

When starting from Edge or a version folder, resolve the repository root with git rev-parse --show-toplevel. Read the root README and AGENTS, then Edge/AGENTS.md. Run project commands from that root. Use a version brief to find its launcher, the Manual to identify a promise, and the Vision or planning folder for future behaviour.

For “work on the first sprint”, inspect PI-01 and its first sprint before selecting a task. Record the item ID, branch, acceptance, and smallest observable result in your local scratchpad. If evidence says a feature exists only in the old OneDrive prototype, name the two versions explicitly. Reproduce it through the version launcher before describing it as delivered.

At handoff, give the entry point, observed result and open decision. Put durable evidence on the work item; discard obsolete scratch notes. Never copy profile keys or chat transcripts into the repo.
