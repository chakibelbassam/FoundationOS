---
revision: 1
---
# Edge Scrum workspace

## Decision

Use `scrumWorkspace/` for the project's PI, sprint and work-item records and `scrumWorkSpace` for the tool. Keep the SynapsAi-inspired documents, notes and knowledge links, with paths under the same root.

## Storage

- `increments/PI-XX.json`
- `sprints/S-XX-Y.json`
- `work-items/WI-XXX.json`
- `documents/drafts/` and `documents/PI-XX/`
- `notes/RECORD-ID.json`
- `links/WORK-ITEM-ID.json`
- `receipts/REQUEST-ID.json`

## Migration

The flat `scrum/` records moved to grouped storage. `scrum.mjs` remains a compatibility entry point. Legacy flat records remain readable.

## Verification

- The 0.1 server and browser fixtures pass.
- `npm test` passes 12 tests.
- `validate` reports no errors on the migrated store.
- `publish.py --changed` passes.

## Future

A FoundationOS interface can read the same store. Planning, control and access operations are deferred until that interface is designed.
