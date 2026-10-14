<!-- P31-HEADER
id: p31_v3c_c1_f1_sunlight_text_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: multi-brand-schema.md finding F1
-->

# C1-F1 · Canon drift: child-introduced structure — `sunlight.p31.text`

**Status:** proposal · **Kind:** canon-drift finding → contribution proposal
**Extracted from:** `design-workflow/V2-D-designv2/multi-brand-schema.md` finding F1 (lines 33, 37-40)

## Finding

`sunlight.p31.text` (`tokens.dtc.json:6517`, `oklch(0.22 0.015 80)`) exists in
**no other pack** (10/10 packs lack it; verified 2026-10-11). Under RFC-0006,
children may override but not introduce structure. `validates.mjs --strict`
(intersection Base) proves R2 catches it:
`[R2] text: override name 'text' does not exist in the parent chain`.

## Evidence (file:line)

- `packages/canon/tokens/tokens.dtc.json:6517` — `sunlight.p31.text`
- `packages/canon/tokens/tokens.dtc.json:79` — canonical `p31.text` (shared default)
- `design-workflow/V2-D-designv2/multi-brand-schema.md:33` — drift token identified
- `design-workflow/V2-D-designv2/multi-brand-schema.md:37-40` — F1
- `design-workflow/V2-D-designv2/multi-brand-schema.md:180` — D-1-P1 (resolution)

**Value-preservation check (2026-10-11):** `sunlight.p31.text` == `sunlight.p31.text-primary`
(both `oklch(0.22 0.015 80)`) → removal loses **zero** information.

## Proposal (resolution, two options — pick A)

- **A (preferred):** promote `text` into shared Base with canonical `p31.text` default; `sunlight` drops its standalone `text` (see C1-P1). Patch: `C3-F1`.
- **B:** drop `sunlight.p31.text` entirely in favor of `text-primary`.

## Gate

Patch `C3-F1` applies clean to a canon copy; token-audit passes on the patched copy.

**Negative control:** a patch that instead *adds* `text` to all 10 other packs → not this proposal (value change across packs, §11 stop condition).

**No canon file was modified by this proposal.**