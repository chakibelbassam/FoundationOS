# v0.2 QA evidence

Curated, secret-free evidence from independent release QA. The owner uses these folders to accept or reject the increment.

## Layout

- `sprint-{n}/{WI-ID}/{scenario}/` — screenshots, logs and a short note of expected versus observed.
- `release/` — final candidate evidence, one folder per run, named with the candidate revision.

## Rules

- Never commit account keys, invitation tokens or session tokens. Redact the Connect field and DevTools auth headers before saving a screenshot.
- Compress PNGs and keep only the frames that show the behaviour. Raw captures and video stay untracked.
- Record viewport, input hardware, browser and candidate revision in the scenario note.
- Link each evidence folder from the work item or its review note so the PI traces to a test.
- A failed scenario keeps its reproduction steps until the retest records the result.
