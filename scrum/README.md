# Development Scrum records

Use foundation-scrum query and save from OpenCode at the Development root. The local equivalent is node Edge/tools/scrum.mjs query. Pass a JSON argument, or pass a single dash to read JSON from stdin. PI-00 tracks development setup. Read its status and PI-01 before selecting work.

Save a PI, a sprint with its PI parent, or an item with its sprint parent. Set revision to zero when creating and supply the current revision on update. Each item needs type, acceptance, priority (1 highest) and effort (2 hardest admitted, 5 easiest). If a session loses a write response, query the ID before retrying. An interrupted write can leave a lockdir. Check that its writer has exited, verify the last record, then remove only the stale lock directory.

The local adapter uses SynapsAi's Markdown validation, parentage, evidence and revision principles. The JSON files are the FoundationOS project’s own storage format.
