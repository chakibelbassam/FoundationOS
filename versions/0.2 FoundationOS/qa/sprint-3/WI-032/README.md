# WI-032 · Recognize apps without disturbing the shelf

Candidate `b8459c6`. Fixture: 200 entries, 40 folders (`seed.mjs --large`).

| Check | Expected | Observed |
| --- | --- | --- |
| Shelf before probes settle | 206 usable cards immediately | 206 cards rendered; no spinner blocked the shelf |
| Descriptor request count | at most 12 folders per view | 11 initial probes (the 12th slot is reserved); 3 concurrent workers by code |
| Focused item priority | focused folder probed inside the budget | focusing `Bulk-35` early produced 11 base probes + `Bulk-35` = 12, and Bulk-35 became an app card |
| Order | stable as metadata arrives | `Broken, Bulk-01 … Bulk-40, note-001 …` unchanged |
| Malformed descriptor | folder stays browsable | `Broken` (empty `name`) remained a folder |
| Missing descriptor | folder stays browsable | the remaining Bulk folders stay folders |
| Late response | discarded after the view changes | the effect cancels stale workers; cache is keyed by member and path |

Image: `206-entries-11-probes.jpg` (206 cards, 11 app cards, hovered app face visible).

Concurrency is enforced by the three-worker pool in `src/workspace/useApps.ts`; the run recorded total request count, not simultaneous sockets.
