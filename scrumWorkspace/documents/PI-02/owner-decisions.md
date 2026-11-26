---
revision: 1
---
# 📦 PI-2 owner decisions · 26 November 2026

The owner recorded these decisions while PI-02 was still proposed. They apply to the five sprints and all work items. The [increment plan](client-increment-plan.md) keeps the delivery detail.

## Lifecycle and reorganisation

- Edge owns the Scrum lifecycle: activate the PI and each sprint when its turn comes, move work through proposed → ready → active → review → done, and write a note at each transition. Review and done need evidence.
- Pull-request merges stay with the owner.
- Edge may resequence, reprioritise, revise effort, move proposed work between the five sprints, and add or defer items with a recorded reason. The five sprints and existing IDs are maintained.
- The running Scrum server may still enforce the older owner-controlled policy until it is restarted.

## Settings

| Control | Values | Default |
| --- | --- | --- |
| Theme | System, Light, Dark | System |
| Surface | Solid, Glass | Glass |
| Density | Comfortable, Compact | Comfortable |
| Motion | On, Off, Follow system | On |
| Cursor | System, Target | Target |

- First run applies the defaults. Each is a per-member choice, stored by member id under the current Windows user's application-data directory and kept across a client restart on a different port.
- Motion stays on when Windows requests reduced motion unless the member chooses Off or Follow system. Off and Follow system are tested.
- Glass is the default surface, so any mid-flip bleed is a first-run defect.

## Motion quality

- Motion is a deliverable, not a side effect. WI-044 records a token table for hover, menus, the card face and the flip, with easing and timings, and applies it across the card, folder hover, menus and route changes.
- Acceptance includes 60 fps with no layout shift or text jitter on a busy background, and reduced-motion variants that keep every action.
- WI-044 runs after WI-034 and before WI-035. The interface inventory links the spec.

## Release bar

- Only Sev-1 blocks the release. A failure of a stated PI acceptance criterion counts as Sev-1. Sev-2 to Sev-5 findings are fixed when cheap or recorded for owner review.
- Target current Edge and Chrome with WCAG AA contrast: 4.5:1 for text and 3:1 for interface components, in Solid and Glass.
- Descriptor discovery probes visible folders only: at most 12 per view, 3 concurrent, cached for the session, activated item first. Fixture: 200 entries with 40 folders; the shelf stays usable before probes settle.

## Technical defaults

- App identity uses one fixed Material icon in v0.2; an optional descriptor icon is later work.
- A non-text or oversized file shows an unavailable state with its type and size. v0.2 has no download.
- The launcher requires `/status.version` `0.1` and a known schema, and shows expected and found.
- A refresh returns to Connect. A Disconnect item sits in the username menu. The last member id stays in sessionStorage at the client origin, never in the URL.

## Sessions, credentials and test data

- The client accepts an existing member session token in memory only. Account keys, invitation tokens and session tokens never enter the repository, notes, logs, screenshots or preferences. A leaked session is revoked.
- The version README documents the admin → invitation → account → session sequence. The operator helper reads a key securely and prints a token without writing it.
- QA uses disposable stores through `FOUNDATIONOS_DATA` and a client data-directory override, never the owner's installation.

## Evidence folders

- QA evidence: `versions/0.2 FoundationOS/qa/`, curated and secret-free.
- Contributor artifacts: `versions/0.2 FoundationOS/agents/{role}/{WI-ID}/`.
- Raw captures, builds, dependencies and anything holding a credential stay untracked.
