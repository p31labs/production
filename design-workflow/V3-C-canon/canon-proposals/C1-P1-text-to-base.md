<!-- P31-HEADER
id: p31_v3c_c1_p1_text_to_base_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: multi-brand-schema.md D-1-P1
-->

# C1-P1 · Promote `text` into the shared Base structure

**Status:** proposal · **Kind:** canon adoption (design-core routing, not in-place edit)
**Extracted from:** `design-workflow/V2-D-designv2/multi-brand-schema.md` D-1-P1 (line 180)

## Problem

`sunlight` is the only theme pack carrying a 23rd token `text`
(`tokens.dtc.json:6517`, `oklch(0.22 0.015 80)`). The other 10 packs do not have
it. Under RFC-0006, children may override but never introduce structure — this
is canon drift **F1** (evidence: `multi-brand-schema.md:33,37-40`).

## Evidence (file:line)

- `packages/canon/tokens/tokens.dtc.json:6517` — `sunlight.p31.text` (the only pack carrying it)
- `packages/canon/tokens/tokens.dtc.json:79` — canonical `p31.text` (`oklch(0.96 0.005 270)`, the shared default)
- `design-workflow/V2-D-designv2/multi-brand-schema.md:33` — drift token identified
- `design-workflow/V2-D-designv2/multi-brand-schema.md:51` — proposed Base default = canonical `p31.text`
- `design-workflow/V2-D-designv2/multi-brand-schema.md:180` — proposal D-1-P1
- Verified 2026-10-11: `sunlight.p31.text` value **equals** `sunlight.p31.text-primary` — removal loses zero information.

## Proposal

1. Promote `text` into the shared Base structure; the Base default is the
   canonical `p31.text` value (line 79).
2. `sunlight` no longer carries child-introduced structure (drops its
   standalone `text` — value already covered by `text-primary`).
3. Validator `validates.mjs`/`validates-v3.mjs` already models this: union Base
   gives `text` the canonical default (validates.mjs:78-79).

## Gate

`node design-workflow/V3-C-canon/validates-v3.mjs` — after adoption, `sunlight`
must be **22 overrides, ALL PASS** (no R2 `text` violation).

**Negative control:** reintroducing a 23rd name unique to one child → R2 FAIL.

## Files touched (adoption time)

- `packages/canon/tokens/tokens.dtc.json` — remove `/themes/sunlight/p31/text` (patch `C3-F1`)

**No canon file was modified by this proposal.**