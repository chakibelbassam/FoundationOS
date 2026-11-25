# Edge tools

Run these commands from the repository root. From Edge, use `tools/` in place of `Edge/tools/`. Node 24 serves Scrum. `qa.py` uses Python 3 on Windows. Publishing requires Python 3 with `python-docx` and LibreOffice. Use `--soffice` to specify its executable when needed.

| Job | Tool |
| --- | --- |
| Inspect sprint 1 of PI-01 | `node Edge/tools/scrumWorkSpace.mjs query '{"pi":"PI-01","sprint":1}'` |
| Read one record | `node Edge/tools/scrumWorkSpace.mjs query '{"id":"WI-008"}'` |
| Patch a title | Query the ID and revision, call `update` with `id`, `revision` and `changes`, then reread |
| List drafts | `node Edge/tools/scrumWorkSpace.mjs documents '{"action":"list","scope":"drafts"}'` |
| Create a draft | `documents` with `action:create`, `relativePath`, `revision:0` and `body` |
| Append an item note | `notes` with `action:append`, the item ID and revision, a `requestId` UUID, `kind` and `body` |
| Link a document | `knowledge` with `action:link`, item/reference/document revisions, `relativePath` and `purpose` |
| Check the 0.1 runtime | `python Edge/tools/qa.py 0.1` |
| Publish the product library | `python Edge/tools/publish.py` |
| Regenerate only stale or missing PDFs | `python Edge/tools/publish.py --changed` |
| Automatically republish while editing | `python Edge/tools/publish.py --watch` |
| Publish one Markdown file | `python Edge/tools/publish.py "Product Information/FoundationOS Manual.md"` |

Leave the watcher running during editing. It checks the source and publisher timestamps, writes each successful PDF beside its Markdown and preserves the previous edition on conversion failure. Ctrl+C stops the watcher. Each isolated acceptance run owns its temporary data and processes.

On Windows, from Edge run `.\tools\Run-EdgeTool.ps1 qa 0.1` or `.\tools\Run-EdgeTool.ps1 watch`. The launcher checks installed Python and the Codex desktop runtime. Set `FOUNDATIONOS_PYTHON` to choose an interpreter. For record and document operations, see the [scrumWorkSpace manual](../../scrumWorkspace/README.md).

The launcher prefers a Python that can import `docx` for publishing. On this machine the Codex runtime is under `%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies`, with Python 3.12 and Playwright. `py -3` is Python 3.14 without `python-docx`; `python` and `python3` on PATH are Windows Store shims. The launcher finds the runtime directly and keeps `FOUNDATIONOS_PYTHON` as an override.

For browser QA run `.\tools\Run-EdgeTool.ps1 browser 0.1` from Edge. It starts the version launcher with disposable data, opens and refreshes its status page using headless Microsoft Edge, and shuts down that run. Requires Node, Playwright and the Microsoft Edge browser. The Windows launcher adds the Codex runtime's `node_modules` to `NODE_PATH` when Playwright is present. Future client versions supply their interaction assertions in `verify-browser.cjs` beside `Start.cmd`.
