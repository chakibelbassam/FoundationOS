# 04 — Intake and triage

**Status:** DECIDED (D9, D13) · 25 November 2026

## 1. Three doors, one panel

| Door | Starts as | Typical use |
| --- | --- | --- |
| **Report a problem** | Bug | Something promised or previously working is wrong |
| **Request a feature** | Feature / Enhancement (`new`) | Something that never existed |
| **Ask for a task** | Dev Task / Enabler | Build, test, refactor, docs, infra |

The door **pre-selects** the type; it does not lock it. Triage may correct it,
and the correction is recorded (`typeChangedFrom`) so the taxonomy can be
audited.

Every door opens the **same panel**, with the scope locked to where it came
from. A bug filed from Weather never lands in FoundationOS by accident.

## 2. Fields

**Common**

| Field | Rule |
| --- | --- |
| Title | 5–120 chars, one sentence |
| Description | what and why, no solution required |
| Scope | read-only: `project:<id>` or `foundationos` |
| Priority (proposed) | P-1..P-5, default P-3 |
| Effort (proposed) | Ef-1..Ef-5, optional at intake |
| Attachments | screenshot, log, file; auto-captured route and version |
| Links | duplicate of, related, blocks |

**Conditional**

| Type | Required | Optional |
| --- | --- | --- |
| **Bug** | repro steps, expected, actual | severity 1–5, environment |
| **Feature** | user story, acceptance criteria | out of scope |
| **Enhancement `new`** | which feature it extends, user story, acceptance | — |
| **Enhancement `improve`** | current behaviour, desired behaviour, why | metric |
| **Enabler** | what it unblocks (item ids) | — |
| **Dev Task** | what must happen, why no user-visible change | — |

The form renders only the fields the chosen type needs. Switching type clears
fields that no longer apply, after a confirm if they contain text.

## 3. Edge drafts, human confirms

- Edge can pre-fill from context: current route, app version, the last error,
  a screenshot, the conversation so far.
- The draft is visibly marked "drafted by Edge — review before submitting".
- Edge never submits on its own. The human presses **Submit**.
- An agent can create an item through the protocol (`fos_*`) with
  `status: proposed`; it lands in triage, not in Ready.

## 4. Triage

A human with `admin` or `owner` on the project confirms:

1. **Type** — is it a bug, or a feature that was never promised?
2. **Severity** (bugs only) — Sev 1..5.
3. **Priority** — P-1..P-5, ordered by impact, not effort.
4. **Effort** — Ef-1..Ef-5, by agent difficulty (`12`).
5. **Definition of Ready** — acceptance is testable, dependencies are known,
   no open decision blocks it.

Outcomes: **Ready**, **Needs info** (with a question), **Duplicate** (link),
**Won't do** (with a reason). A `member` can propose; only `admin`/`owner`
confirm. A viewer cannot file.

## 5. Severity and priority are different

| | Severity (bugs only) | Priority (all) |
| --- | --- | --- |
| Answers | how bad is the breakage | when do we do it |
| Values | Sev 1 (data loss / security) … Sev 5 (cosmetic) | P-1 (now) … P-5 (someday) |
| Changed by | triage, then only with a note | triage and planning |

A Sev-1 cosmetic bug is still P-4. A P-1 feature can be Sev-less. Conflating
them is how "urgent" loses meaning.

## 6. Evidence

- Every item can carry evidence: diff, test output, screenshot, log, recording.
- Evidence is attached to the item, not pasted into the description.
- A **Done** transition requires at least one evidence row, unless the item is
  `dev-task` with a documented reason.
- Evidence is immutable; a correction is a new row.

## 7. States

```
draft → submitted → triaged → ready → in-progress → review → done
              ↘ needs-info ↗         ↘ blocked ↗
              ↘ duplicate
              ↘ wont-do
```

- `draft` is local until Submit.
- `needs-info` returns to `triaged` when the question is answered.
- `blocked` records what blocks it (item, decision, person).
- `wont-do` keeps the item and the reason; it is not deleted.

## 8. Standards

- The panel is a side sheet on desktop and a full page on mobile; it never
  covers the list's scroll position (§1.3).
- Focus moves to the first field on open and returns to the trigger on close
  (§2.1).
- Validation is inline, announced, and does not clear the form.
- The type selector is a radio group, not a dropdown, so the options are
  visible.
- The generated Triage Guide PDF is linked from the panel footer.

## 9. Acceptance

1. Filing a bug from Weather pre-fills scope and route; it cannot be changed to
   FoundationOS.
2. A feature refuses repro/expected/actual; a bug requires them.
3. A member can submit; only an admin/owner can move it to Ready.
4. A stale revision on triage shows the conflict, not a silent overwrite.
5. `wont-do` keeps the item and its reason.
6. Keyboard only: open, fill, submit, close, with focus restored.

## 10. Open questions

1. Should effort be visible on the board card? (Lean: yes, as a small chip —
   it changes what people pick up.)
2. Can a reporter edit after submit, or only comment? (Lean: comment; edits go
   through triage.)
3. Do we need a "security" flag separate from Sev-1? (Lean: no; Sev-1 plus a
   label.)
