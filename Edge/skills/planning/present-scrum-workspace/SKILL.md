---
name: present-scrum-workspace
description: Present FoundationOS Scrum records to the owner in Markdown, including sprint buckets, work-item details, linked evidence and answers about design decisions.
---

# Present the Scrum workspace

Use the [scrumWorkSpace component collection](../../../../Product%20Information/Interface/Components/Agent%20Output/scrumWorkSpace.md) whenever discussing Scrum records with the owner. Its conversational naming and status conventions apply across workflows.

1. Resolve the record in context. Query the PI and its target, the parent sprint and the relevant work items as needed. Use the PI plus numeric sprint query for a bucket and follow pagination. Distinguish record status, evidence and owner acceptance.
2. Choose the matching component. Keep one-field answers short. Render every named record with its actual title, every status with its icon and label, and every sprint row with its completion checkbox.
3. For a rationale question, read the item's description and acceptance, parent sprint and PI as relevant. Use knowledge references, document backlinks, scoped document and draft listings, and dated decision or investigation notes to find the reasoning. Read relevant enablers and their evidence when the item depends on them. Follow the sources until the question is answered or the recorded trail ends.
4. Answer in plain language and quote the decisive passages using the collection's rationale component. Attribute brainstorming to its source and distinguish proposals, adopted decisions, later changes and your own interpretation. Verify quotations against the source and keep titles and revisions current.

Use [read-and-plan-sprints](../read-and-plan-sprints/SKILL.md) for planning operations and [manage-scrum-knowledge](../manage-scrum-knowledge/SKILL.md) for notes, drafts and references. A question about existing work is read-only.
