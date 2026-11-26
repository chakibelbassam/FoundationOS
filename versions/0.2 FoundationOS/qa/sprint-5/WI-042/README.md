# WI-042 · Resolve release-blocking findings

Candidate after the fixes: branch `edge-opencode/pi-02-client-foundation`, commit recorded on PR #9 after the retest.

## F1 · Interface boundaries below 3:1 (Sev-1, independent review)

**Confirmed.** The old `--fo-border` was 14%/22% ink and `--fo-glass-border` was referenced but never defined, giving a white edge on near-white Glass.

**Fix.** Both boundary tokens are now the solid ink `#5f7088` in light and dark, used by the card and folder faces, the glass border, secondary action buttons and Settings options. Folder and app graphics keep their accent tints because their labels carry identification (Sev-4, recorded for the owner).

**Measured WCAG ratios for the new boundary:**

| Adjacent fill | Ratio |
| --- | --- |
| Light page `#eef2f8` | 4.49 |
| Light card `#ffffff` | 5.05 |
| Light glass worst `#d5e0f5` | 3.80 |
| Dark page `#0b1220` | 3.71 |
| Dark card `#141d2e` | 3.34 |
| Dark glass `#162034` | 3.22 |

All at or above the owner's 3:1 interface bar. Focus rings were already 4.92–10.34. Text remains 4.91–17.28.

**Evidence:** `glass-borders-fixed.jpg`, `solid-borders-fixed.jpg` (Settings Appearance preview, Solid, light), `dark-glass-borders-fixed.jpg` (Blair, dark Glass, compact), plus the computed styles `border-color: rgb(95, 112, 136)` and `--fo-border: #5f7088` read from the running client.

## F2 · Turn-frame note (Sev-3, evidence correction)

The three frames were captured from a turn deliberately slowed to 1600 ms by overriding `--fo-dur-flip`; the shipped turn is 520 ms. The release and WI-044 notes now say so, and the 900 ms frame sample is described as including the settle.

## F4 · Stale long-username image (Sev-4)

The old `320-long-username.jpg` showed the pre-fix wrap. It was replaced by `320-long-username-final.jpg`, which shows `alexandr…` and points to `release/11-320-long-name.jpg`.

## F6 · Missing-file image not cited; type-and-size state (Sev-5)

The release README now cites `08-missing-file.jpg`. A non-text or oversized state cannot occur through v0.1, which stores UTF-8 text up to 64 KiB and exposes no size; this is recorded as assumption 9 rather than implemented.

## F3 · Text jitter (Sev-4)

Recorded as an evidence limit: paused frames show no wrap, size change or reflow, but no per-frame video was captured. Not claimed as verified.

## Retest

Independent retest requested from GLM 5.3 Flash against the new tokens and images; result appended to `../../agents/qa/WI-041/report.md`.
