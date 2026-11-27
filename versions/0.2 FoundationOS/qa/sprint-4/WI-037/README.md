# WI-037 · Preview and apply settings on real widgets

Candidate `b8459c6`.

| Check | Expected | Observed |
| --- | --- | --- |
| Preview | Change applies immediately to real widgets | Light/Solid changed the whole workspace and the preview card and folder at once; status “Previewing unsaved changes.” |
| Cancel | Restores the applied state | theme returned from Dark to the saved Light; status “Showing your saved settings.” |
| Apply | Persists for the member | status “Saved for this member.”; `preferences.json` updated |
| Reset | Previews defaults without saving | System theme, Glass, Comfortable, On, Target previewed; “Defaults previewed. Apply to keep them.” |
| Failed save | Visible error, last saved values intact | read-only file → “Failed save: The settings could not be saved.” and the saved values remained on disk |
| Three pages | Profile, Appearance, Workspace | all three reachable as tabs; About shows client 0.2 and server v0.1 |
| Back | Returns to the workspace | “Back to workspace” button; an unapplied preview is discarded |

The preview uses the same `AppCard`, `FolderWidget` and Target Cursor as Home, so a choice predicts the real result.
