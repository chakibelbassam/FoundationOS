---
name: manage-scrum-knowledge
description: Create or revise project drafts, append durable item notes, and trace references through scrumWorkSpace.
---

# Keep planning knowledge tied to the work

Use a draft for an evolving brief, a note for a dated observation about one record, and a reference when an item depends on a document. Keep temporary thinking in Edge/workspace until it has value for the project. The Manual is published product information, so a Scrum draft can inform a change there through the documentation workflow.

For “draft an outline for this PI”, query the PI, then list documents in the intended scope. Use the canonical relative path returned by the tool when revising. A new draft such as drafts/outline.md starts with revision zero. Include the user journey, evidence available and one open decision. For an existing document, read it and use its observed revision to update. An edit conflict requires rereading and reconciling the newer wording.

For “add a finding on this item”, read the item and any referenced document. Append a note with the item ID and revision, note kind, Markdown body and a stable request UUID. On a lost response, reconcile that UUID before resubmitting. Add an explicit reference when the document is evidence or an investigation input. Use the observed item, document and reference revisions required by the tool. Read backlinks to answer “what would this draft change affect?”

Read the [workspace tool manual](../../../../scrumWorkspace/README.md) for operation names, destinations and field values. Use the `manual` operation before an unfamiliar write, run `validate` after a migration or failed write, and recover a lost create or update by its `receipt` request ID. Return the saved path or item ID and revision. Drafting and linking leave product acceptance with the reviewer.
