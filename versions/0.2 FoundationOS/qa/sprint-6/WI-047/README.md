# WI-047 · Nested app descriptors

- `useApps` requests `${fullPath}/app.json`, keys the cache `memberId:fullPath` and returns a map keyed by the full member-relative path; the shelf looks up by the item path. Budget (12 per view, 3 concurrent, priority slot) is unchanged.
- Fixture evidence: root `Weather`, `Projects/Weather` (Weather Lab), `Archive/Weather` (Weather Archive) and Blair's `Journal/Weather` (Desk weather) all resolve to distinct names, briefs and READMEs. `/apps` shows root Weather plus Weather Lab/Weather Archive when those folders are pinned; `Broken`'s empty descriptor stays a folder and is excluded from Apps.
- `useApps.test.tsx` covers full-path probing, three same-named folders in different parents and the 12-call budget.
