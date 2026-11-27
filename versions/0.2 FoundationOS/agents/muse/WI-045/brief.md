# Brief · Sprint-6 Phase A · WI-045 to WI-048 (session boundary and four defects)

Role: Muse Spark 1.3 Contributor, model `opencode-go/muse-spark-1.3-contributor` at `xhigh` (highest supported).
Target: `versions/0.2 FoundationOS/FoundationOS/`. Branch `edge-opencode/pi-02-client-foundation`, current head `3f928f5`. Do not run Git, do not edit `qa/`, `agents/` or Scrum records. Keep every change attributable in your report.

Read first: `scrumWorkspace/documents/PI-02/pr-9-acceptance-follow-up.md`, `scrumWorkspace/documents/PI-02/owner-decisions.md`, `versions/0.2 FoundationOS/README.md`, and the work items `WI-045`…`WI-048`.

## Scope for this phase (do not start SVAR, Bento or backgrounds yet)

### WI-045 · Bind workspace preferences to the verified member

- `host/serve.mjs` currently trusts `memberId` in the request body. Derive it instead from the session token:
  - `POST /preferences/load|save` (and the `/api/...` aliases) read `Authorization: Bearer <token>`; call the configured v0.1 server's `GET /profile` with that token; use the returned `id`.
  - Missing/invalid/expired token → 401 JSON `{error}`; never fall back to the body id.
  - Keep the existing preference file shape and keys, so existing saved settings stay readable.
  - Serialize writes across processes: a lock directory (`preferences.lock`) acquired with `mkdir` around read-merge-write, short retry, stale-lock timeout; write temp + rename and keep the last good file on failure. Simultaneous saves from two hosts for different members must both persist.
- Client: `src/api/client.ts` already attaches the token to every request; make sure the preferences calls keep it. Remove the now-redundant `memberId` body field only if the host no longer needs it; keep the client API signature simple.
- Update `tests/host.test.mjs`: auth required, identity comes from `/profile` (a spoofed `memberId` is ignored), invalid/expired token rejected, two hosts saving concurrently preserve both members, failed write keeps the last good file.

### WI-046 · Ignore stale requests after a member switch

- `src/api/client.ts` uses one global token and logs out on any 401. A late 401 from the previous member's request must not clear the new session.
  - Capture the token/generation per request; on 401 call the unauthorized listener only when the request's token is still the active one.
  - Provide `abortActiveRequests()` (or equivalent) called on connect/disconnect; views pass an `AbortSignal` to directory, descriptor and file reads.
- `SessionContext` / `PreferencesContext` must discard stale results after a switch. Reconnecting as the same member restores the URL; a different member starts at Home (existing behaviour).
- Tests: two tokens, stale 401 ignored, active 401 handled once; stale directory/descriptor results discarded.

### WI-047 · Recognize apps in nested folders

- `src/workspace/useApps.ts` probes and caches by bare folder name. Use the full member-relative path for the request (`${path}/app.json`), the cache key (`memberId:path`) and the returned map; `Shelf`/`FolderView` look up by the item's full path.
- Keep the 12-probe budget, three-way concurrency, priority slot, focus and order stability. Two nested Weather folders and a root namesake must all get their own descriptor.
- Add regression coverage for the path-keyed probe/cache and the budget.

### WI-048 · Cancel app-card hover on scroll

- `src/components/AppCard.tsx` only listens for scroll after the card is already revealed. A pending dwell must be cancelled by a scroll of the page **or any nested scrolling surface**.
- Keep deliberate click/tap/Enter/Space activation, keyboard Run focus, Escape order and reduced-motion behaviour.
- Regression test: pointer enters, 500 ms elapses, a scroll event fires, 1000 ms elapses → still closed; pointer exit cancels; a fresh hover after the scroll reveals normally.

## Working rules

- Smallest complete change per item. Keep the existing visual language and MUI usage.
- `npm test`, `node --test tests/host.test.mjs tests/launcher.test.mjs`, `node --test tests/fixtures/seed.test.mjs`, `npm run build` must pass.
- Do not touch `versions/0.2 FoundationOS/qa/` or `agents/`; report results in your reply.
- Report: per item — files changed, behaviour before/after, exact test commands and observed counts, and any assumption. Stop after Phase A so Edge can review before Phase B (SVAR, Bento, backgrounds).
