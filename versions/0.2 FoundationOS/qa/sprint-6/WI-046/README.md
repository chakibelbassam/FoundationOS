# WI-046 · Ignore stale requests after a member switch

- Every request captures its token and generation. A 401 only ends the session when the request belongs to the still-active token; late responses from a previous member cannot clear the new session.
- `abortActiveRequests()` runs on connect/disconnect; directory, descriptor and reader effects use their own `AbortController`s and ignore aborted/stale results. Preference loads/saves discard results after a member change.
- Client tests cover stale 401 ignored, active 401 handled once, abort without notification and caller-signal propagation.
- Tester retest: member switch and reconnect kept the correct settings/home; Back from an overview now focuses the originating app card (F10 fixed). No stale content observed.
