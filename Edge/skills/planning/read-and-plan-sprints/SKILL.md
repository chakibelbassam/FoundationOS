---
name: read-and-plan-sprints
description: Answer natural-language PI and sprint questions, propose capacity-aware buckets, and make targeted Scrum updates.
---

# read and plan sprints

Interpret “first sprint” in the current conversation’s PI. If the user means the first product version, use PI-01; PI-00 is workspace setup. Say which PI you used. For “what is in the first sprint?”, call scrumWorkSpace query with {"pi":"PI-01","sprint":1}. Render the bucket using [present-scrum-workspace](../present-scrum-workspace/SKILL.md). Keep the sprint’s recorded state separate from its items’ states. If the query is empty, say whether the sprint exists and has zero items.

For a PI list, filter kind=pi. For a PI’s sprints use parent=PI-01 and kind=sprint. For a proposed bucket, inspect readiness and dependency evidence, order by priority, then compare effort grades and stated capacity. Grades are ordinal: do not sum Ef-2 and Ef-4 as hours or points. Explain any carryover.

For “rename this item”, query its ID, patch the title with its revision and reread. For a new item identify its parent sprint and an unused ID, state acceptance, type, priority and effort, then create it. After a conflict, reread and reconcile the user’s intent. A request for a summary performs reads only.
