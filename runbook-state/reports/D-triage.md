# Path D — Reference defect triage (Agent D, re-run at REFERENCE_SHA)

Status: DONE (7 tests passed, findings in /tmp/triage-findings.jsonl)
Verified at: `0757e24044345dfbc2abc71ab439817e4b9115a2`
Method: corrected — dial driven via real SpoonDial clicks; D4 selector fixed to `.badge` case-insensitive; every verdict anchored to the SHA.

## Findings

| ID | Finding | Verdict | Evidence |
|---|---|---|---|
| D1 | Badge tone=success has no fill | **REFUTED** | `background: oklch(0.78 0.18 195 / 0.15)`, `border: oklch(0.78 0.18 195 / 0.3)`, `padding: 2px 8px` — has fill + border. |
| D2 | Footer/nav text collapse | INCONCLUSIVE | `padding: 0px`, `display: block`, `gap: normal`. Not reproducible via computed gap; needs visual confirm. |
| D3 | GlassCard text touching border | **CONFIRMED** | `padding: 0px`, `display: grid`, `gap: 0px` on `.glass-card`. Ticket. |
| D4 | NO LIVE PREVIEW on STABLE | **REFUTED** | `noPreview: 0`, `stableBadges: 34` (case-insensitive `.badge`). All 34 STABLE components render live previews. Earlier 0 was a lowercase bug (catalog status is `'stable'` not `'STABLE'`). |
| D5 | Theme vocab mismatch | **REFUTED** | brandOptions = `[ocean, Garden, Ocean, Aurora, Zen, Volt, Reset]` — same theme ids as header. The old Chameleon palette (Quantum Cyan etc.) is gone. |
| D6 | Status token color shifts | **REFUTED** | STABLE badge `oklch(0.78 0.18 195)` in both ocean and volt. |
| D7 | Motion bound to dial | **CONFIRMED** | `--motion-scale` = 0 (s0), 0.6 (s3), 1.0 (s5); `--p31-spoon-level` = 0/3/5. The dial binds motion. |
| D8 | Calm pill / crisis state | INCONCLUSIVE | s0 has `spoons: "0"`, htmlBg `oklch(0.05 0.008 270)`. Crisis overlay presence confirmed at s0; label semantics not fully measured. |
| D9/D9b | Void background hue | **RESOLVED** | html bg = `oklch(0.05 0.008 270)` — hue **270**, C 0.008 (slightly chromatic). **The /brands "hue-240 void" copy is WRONG on both counts.** |
| D10 | LED chip overlaps focusable | **CONFIRMED** | `LEDBREATH→Clear all` overlap, 124 focusables. WCAG 2.4.11. Ticket. |
| D13 | `@p31ca/design-core/generated` import string | **REFUTED** | `generatedImport: false`. Not shown in UI. |
| D13b | Generated story path leaks | **CONFIRMED** | `./src/generated/CandyHeader.stories.tsx`, Crown, GlassStrong, GlassSubtle, HonestLabel leak into catalog descriptions. Ticket. |
| D14 | Pluralization "1 spoons" | **CONFIRMED** | `/◆ 1 spoons/` present. Ticket. |
| D12 | 15 orphaned generated tests load-bearing | **REFUTED (none)** | All 15 have zero references. Safe to delete (Path A3). |

## Confirmed defects for Wave-2 tickets (5)
D3 (GlassCard padding), D9 (hue-240 copy), D10 (LED overlap), D13b (build-path leak), D14 (pluralization).

## Method corrections (this re-run)
1. Dial driven via real SpoonDial clicks → D7 now CONFIRMED (was INCONCLUSIVE).
2. D4 selector `.badge` + case-insensitive → REFUTED with 34 stable badges (was a false-negative zero-match).
3. Every verdict carries `verifiedAt: 0757e240` — anchored, not folklore.