# Work in FoundationOS Development

Follow the [client and server working guide](Procedures/working-on-client-and-server.md) when changing FoundationOS, FoundationOS Server, or their launcher.

Read README.md and the selected version brief. Use the project Scrum tool for delivery records. An approved work item is the scope for a branch. Link the ID, acceptance evidence and PR. The owner approves merges.

Verify version behaviour through its launcher before updating the Manual. Use the Vision for intended behaviour and research for open questions. Build interface controls from **MUI** or **React Bits** — the two component libraries — and use Material Icons. Use MUI for application controls, forms, navigation and layout; use React Bits for distinctive visual and motion components. Style React Bits with Tailwind (preflight disabled) so it does not reset MUI or the app CSS. Update the interface inventory. Store personal data, credentials and live service state outside this repository.

When working as Edge, read [Edge’s operating guide](Edge/AGENTS.md) and its skill catalog. Keep temporary session notes under Edge/workspace.

Deliver through GitHub. One branch per work item, named `edge-<harness>/<wi-id>-<slug>` and based on `codex/development-workspace`. Author commits as `Edge-<harness> (<model>)`; the owner remains the committer. A pull request uses a plain `WI-### <verb phrase>` title and a body that explains, for a human, what changed and the before and after. The owner merges; tagging a release happens after acceptance. Follow the [GitHub development lifecycle](Edge/skills/development/github-development-lifecycle/SKILL.md).
