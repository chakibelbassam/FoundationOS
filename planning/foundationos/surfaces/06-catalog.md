# 06 — The catalog

**Status:** EXPLORING (D16, D17) · 25 November 2026

The catalog is **distribution**, not sharing. A published app is a reviewed
snapshot; an install is a copy. Nobody gets a live window into someone else's
project.

## 1. The three verbs

| Verb | What happens | Who |
| --- | --- | --- |
| **Submit** | An app project's snapshot enters the review queue | Project owner |
| **Review** | An admin checks the manifest, permissions and content | Server admin |
| **Install** | A new project is created from the approved snapshot | Any member |

## 2. Submitting

From an app project: **Publish → Submit to catalog**.

| Field | Rule |
| --- | --- |
| Name, description | From the manifest; editable in the submission |
| Version | Semver; must be greater than the last approved version |
| Permissions | Declared, not inferred: network, filesystem, clipboard, notifications |
| Secrets | Must be absent; the scan blocks a snapshot that contains `.env` |
| License | Required; SPDX id or "private" |
| Screenshots | 1–5, captured from the running app |
| Entry point | `static` or `build`; a server-side entry point is a separate review |

The snapshot is a **copy** of `repo/` at a commit, minus `.git`, secrets and
anything gitignored. The original repo, history and members are never exposed.

## 3. Review

An admin sees a checklist, not a diff:

- [ ] Manifest parses; version is new.
- [ ] Permissions are declared and match what the app does.
- [ ] No secrets, tokens or personal data in the snapshot.
- [ ] License is present and compatible.
- [ ] Screenshots match the app.
- [ ] Entry point is `static`/`build`; if server-side, it is flagged.
- [ ] Dependencies are pinned; no `postinstall` that fetches code.

Outcomes: **Approve**, **Reject** (reason required), **Request changes**
(returns to the submitter with a note). Every outcome is audited and notified.

Approval is governance, not a security audit. The UI says so.

## 4. Installing

- Creates a **new project** (`kind: app`) in the installer's workspace.
- Copies the snapshot, runs `git init` + one commit, writes
  `catalogEntryId` and `version` into the manifest.
- The install is independent: edits, members and secrets are the installer's.
- The upstream link is informational; there is no auto-update.

## 5. Updating

- A new approved version appears as "Update available" on installed projects.
- Applying an update is a **diff review** (same machinery as the merge queue),
  not a silent replace.
- If permissions changed, the update requires a fresh review and a fresh
  accept from the installer.
- A rejected update leaves the installed copy untouched.

## 6. States

| State | Visible to | Actions |
| --- | --- | --- |
| `draft` | submitter | edit, submit, discard |
| `submitted` | submitter, admins | withdraw |
| `in-review` | admins | approve, reject, request changes |
| `changes-requested` | submitter | edit, resubmit |
| `approved` | everyone | install |
| `rejected` | submitter, admins | read reason, resubmit later |
| `withdrawn` | submitter | — |

## 7. The security fork

An app that runs **server-side code** is not a template; it is code execution
on the host. Two honest options:

| Option | Means | Cost |
| --- | --- | --- |
| **Static only** (v1) | No server-side entry point; apps are client-side | Limits what can be published |
| **Sandboxed** | Server-side apps run in a container with a declared permission set | Real work: images, limits, networking, secrets |

v1 leans **static only**. The moment a catalog app can run a server process,
"approve" stops being a content review and becomes a security boundary. That
decision is not made yet.

## 8. Standards

- The review queue is a table with a detail sheet; approving does not move the
  row out from under the cursor (§1.2).
- Checklist state is text + checkbox, not colour (§2.2).
- Rejection reasons are required and shown verbatim to the submitter.
- Empty queue: "Nothing waiting for review."

## 9. Acceptance

1. A submitted app with a `.env` is blocked before review.
2. An approved app installs as a new project with its own git history.
3. A rejected app cannot be installed; the reason is visible to the submitter.
4. A permission change forces re-review before an update applies.
5. An admin cannot approve their own submission without a second admin
   (or an explicit owner override, audited).

## 10. Open questions

1. Static-only in v1, or sandbox from the start? (Lean: static only; revisit
   when someone needs a server.)
2. Should installs be able to pull upstream updates automatically? (Lean: no;
   review the diff.)
3. Can a catalog entry be unlisted without deleting installed copies? (Lean:
   yes — unlist, keep installs.)
4. Do we need ratings or download counts? (Lean: no; this is a small server,
   not a marketplace.)
