---
name: publish-foundationos-manual
description: Update verified product behaviour and produce visually checked FoundationOS PDF editions from Markdown.
---

# publish foundationos manual

Decide whether the change is verified behaviour (Manual), a future journey (Vision), or a design pattern (Interface). Record version and status near the title. Preserve the author’s Markdown wording and hierarchy for a format-only change. Keep tables narrow enough for a portrait page; use fenced blocks for commands and folder trees.

From Edge on Windows run `.\tools\Run-EdgeTool.ps1 publish` for the whole library, or use `.\tools\Run-EdgeTool.ps1 watch` while editing. Run publish.py on the selected Markdown, or use publish.py --watch during editing to republish changed Product Information files. The shared template owns typography, metadata, tables and code treatment. Check output exists, read extracted text, render each changed document, and inspect the first and last pages for split headings, overflowing commands, orphan lines and page numbers. Follow a representative link when the source contains links.

Review the source and its PDF together. A successful conversion verifies file generation. Visual inspection and working navigation establish that someone can use the published document.
