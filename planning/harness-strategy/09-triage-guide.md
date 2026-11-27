# Triage Guide v0.2 (source for the PDF)

Status: **DRAFT**. This markdown is the single source; the PDF is generated
from it. This export: `Triage-Guide-v0.2.pdf` (draft). Target:
`Triage-Guide-v1.0.pdf`.

---

## 1. Purpose

One document that answers, without argument: what kind of work is this, how bad
is it, how urgent is it, how hard is it for an agent, what must it contain, who
may change it, and when is it done.

Rules are enforced by schema where possible. A rule that only lives in a PDF
will be ignored.

## 2. Vocabulary

| Term | Meaning |
| --- | --- |
| **Work Item** | The umbrella. Everything tracked is a work item |
| **SCR** | *Software Change Request* — the **intake record**. It captures a request and produces one work item |
| **PRD** | Intent and scope for a body of work. Not a work item |
| **Sprint** | A timebox. One level only (no PI, see section 13) |
| **Epic** | Optional grouping label. Not a level agents must traverse |

`SCR` is the form, not a type. Types are in section 3. One word, one meaning.

## 3. Work item types

### 3.1 Feature

A capability the product did not have. The user could not do this before.

- Needs a new concept, a new surface, or a new store.
- Example: "Add a file previewer" — there was no previewer at all.

### 3.2 Enhancement — two flavours

| Flavour | Meaning | Example |
| --- | --- | --- |
| `new` | Additive ability inside an existing feature, no new architecture | "Preview `.json` files too" |
| `improve` | Make existing behaviour better | "Preview opens on Enter" |

**The worked example that fixes the boundary.** A file previewer exists and
opens `.txt` and `.png` but not `.json`. It was never built to read JSON, never
claimed to. Opening a JSON file fails.

- **Enhancement (`new`)**, not a bug: nothing was promised, nothing regressed.
- It becomes a **Bug** only if the feature *claimed* general support ("preview
  any file") or previously worked and stopped.

**Rule: promise vs absence.**

| Situation | Type |
| --- | --- |
| Exists, worked, now fails | Bug |
| Exists, documented/claimed, never worked | Bug |
| Exists, never claimed to do this | Enhancement (`new`) |
| New capability, needs new concept | Feature |
| No user-visible change | Enabler or Dev Task |

### 3.3 Bug

Behaviour differs from what was specified, promised or reasonably expected.
Requires repro, expected and actual.

If a crash or data loss happens in a path nobody specified, still file a bug —
"the app must not crash" is an implicit promise. Then fix the spec.

### 3.4 Enabler

Work that unlocks other work but delivers no user-visible behaviour on its own.

Examples: expand the storage model for future features, add a build pipeline,
introduce a plugin seam, upgrade a dependency that unblocks two features.

- Must name what it **unblocks** (`unblocks: [ids]`).
- Must not be used as a hiding place: if it changes what users see, reclassify.
- Distinct from Dev Task: an enabler exists *because* other items are blocked;
  a dev task exists because the work itself must happen (QA, docs, install).

### 3.5 Development Task

Needed work with no direct user-visible change: build an app from a brief, run
QA, install a library, refactor, spike, docs.

Subtypes: `build`, `qa`, `spike`, `refactor`, `infra`, `docs`, `dependency`.

### 3.6 Classification order

Ask in this order, stop at the first yes:

1. Does it unlock other work and change nothing for users? -> **Enabler**
2. Is it work that must happen with no user-visible change? -> **Dev Task**
3. Did something that was promised or previously worked break? -> **Bug**
4. Is the capability absent entirely? -> **Feature**
5. Otherwise -> **Enhancement** (`new` if additive, `improve` if refining)

## 4. Severity — Sev 1 to Sev 5 (bugs only)

Impact, not urgency. 1 is worst.

| Sev | Name | Definition | Response |
| --- | --- | --- | --- |
| **1** | Critical | Data loss, security, unusable product. No workaround | Stop other work, same day |
| **2** | Major | Core flow broken; painful workaround | Next working session |
| **3** | Moderate | Wrong in a specific case; easy workaround | Current sprint |
| **4** | Minor | Cosmetic or wording; does not block | Next sprint |
| **5** | Trivial | Typo, alignment, nitpick | Batched backlog |

Severity is set at triage. Only a human may raise it. An agent may propose with
a written justification.

## 5. Priority — P-1 to P-5 (all types)

Order of work. **P-1 is the most urgent.** Independent of severity and effort.

| P | Meaning |
| --- | --- |
| **1** | Do now; blocks a release or another item |
| **2** | Next in the queue |
| **3** | Scheduled, not urgent (default) |
| **4** | Low; when convenient |
| **5** | Someday |

Defaults: P-3. Never leave priority empty. A Sev-5 typo can be P-1 the day before
a demo; that is normal and correct.

## 6. Effort — Ef-1 to Ef-5 (all types)

How hard the item is **for an agent**, where **Ef-5 is the hardest** and
**Ef-1 the easiest**. Full rubric and reasoning: `12-effort-rubric.md`.

| Ef | One line |
| --- | --- |
| **5** | New subsystem or algorithm, cross-cutting, ambiguous, hard to verify |
| **4** | Multi-file feature with new logic and some ambiguity |
| **3** | Contained change following an existing pattern; tests can prove it |
| **2** | Mechanical but wide: rename a field through the stack, copy a pattern |
| **1** | One line, one constant, one label |

Effort is required at triage. An **Ef-5 must be split** into pieces of Ef-3 or
easier before it enters a sprint. Effort never sets order; priority does.

## 7. The intake form

Common fields:

```
id, title, description, type, scope (foundationos | project:<id>), createdBy,
workspaceId, projectId?, visibility (derived from project grant),
createdAt, priority P-1..P-5, effort Ef-1..Ef-5, status, assigneeId?, links
```

Conditional fields:

| Type | Required extra |
| --- | --- |
| Bug | `userStory`, `reproSteps`, `expected`, `actual`, `severity`; `environment` auto-captured; `frequency` optional |
| Feature | `userStory`, `acceptance[]`, `outOfScope` |
| Enhancement | `userStory`, `acceptance[]`, `currentBehaviour`; optional `reproSteps`, `expected`, `actual` |
| Enabler | `goal`, `acceptance[]`, `unblocks[]` |
| Dev Task | `goal`, `steps[]`, `definitionOfDone`, `dependsOn[]` |

`reproSteps`, `expected`, `actual` are **required for bugs**, **optional for
enhancements** (your JSON example has a real repro even though nothing was
promised), and **forbidden for features, enablers and dev tasks**. Forcing them
onto a feature is how forms become fiction.

## 8. Three intake templates

The user sees three doors, not one twelve-field form (`13-intake.md`):

| Door | Produces | Minimum input |
| --- | --- | --- |
| **Report a problem** | Bug | What happened + what you expected |
| **Request a feature** | Feature or Enhancement | What you want to do |
| **Ask for a task** | Dev Task or Enabler | What needs doing |

Behind the doors it is one schema. Edge fills what it can from the sentence,
the current screen and the app, then the user confirms.

## 9. Definition of Ready

- [ ] Type passes the section 3.6 order
- [ ] Scope explicit: FoundationOS or a named app
- [ ] Acceptance testable (bugs: expected vs actual is enough)
- [ ] Priority P-1..P-5 set; bugs also have severity Sev 1-5
- [ ] Effort Ef-1-Ef-5 set; Ef-5 split first
- [ ] Evidence or reproduction exists for bugs
- [ ] No dependency on an open decision

Failing any of these = `needs-info`, not `ready`.

## 10. Workflow

```
Draft -> Triaged -> Ready -> In Progress -> In Review -> Done
             |          |          |            |
             +----------+----------+------> Blocked
             |
             +--> Won't Do / Duplicate
```

- **Draft -> Triaged:** type/priority/effort proposed.
- **Triaged -> Ready:** DoR passes.
- **In Progress:** one owner, one writer per app folder.
- **In Review:** evidence attached; no evidence, no review.
- **Done:** human acceptance only.
- **Reopened:** acceptance failed; cite the failing criterion.

## 11. Authority matrix

| Action | Agent | Automation | Human |
| --- | --- | --- | --- |
| Create draft | yes | yes | yes |
| Propose type / severity / priority / effort | yes | no | yes |
| Confirm triage | no | no | **yes** |
| Move to Ready | no | no | **yes** |
| Claim and work | yes (scoped) | yes | yes |
| Attach evidence | yes | yes | yes |
| Move to Done | **no** | no | **yes** |
| Publish a build | **no** | no | **yes** |
| Delete | no | no | **yes** |

**With accounts (D15), "Human" splits into roles.** Under T3 hybrid, roles are
**per project**: a user is always owner of their personal workspace, and holds
an `admin` / `member` / `viewer` grant on a shared project. Server roles
(owner/admin/member) govern the machine and never substitute for a project
role. The authority above is the *maximum* for a human with that project role;
roles narrow it:

| Role | Create / propose | Confirm triage | Ready / Done | Publish | Delete | Invite / roles |
| --- | --- | --- | --- | --- | --- | --- |
| **Owner** | yes | yes | yes | yes | yes | yes |
| **Admin** | yes | yes | yes | yes | yes | yes |
| **Member** | yes | no | no | no | no | **yes, ≤ own role** |
| **Viewer** | no | no | no | no | no | no |

The invite ceiling is D18: a member may add a member or a viewer, never an
admin. The project channel is the lobby, so adding someone there is the same
act as granting the role; the confirm names what access is being given or
removed.

Agents are **principals**, never roles. An agent's grant is bounded by the
role of the human who created it, and can only be `read` or `read+propose`.

## 12. Measurements

Lead time, WIP, reopen rate, escape rate, blocked age. Read monthly or delete.

## 13. Open questions

1. ~~PI~~ **Answered:** PI is removed; one timebox, Sprint (D9, `06` §7).
2. Should effort be visible on the board, or hidden behind details to avoid
   people prioritising by effort? (Lean: visible as a small chip — `04-intake`
   §10.)
3. Is `Won't Do` a status or an archive? (Lean: a status; the item is kept with
   its reason.)
4. Do we need `Incident` as a separate type, or is a Sev-1 bug enough? (Lean:
   no; Sev-1 plus a label.)
5. Should an enabler require at least one linked unblocked item at creation?
   (Lean: yes — otherwise it is a dev task in disguise.)
