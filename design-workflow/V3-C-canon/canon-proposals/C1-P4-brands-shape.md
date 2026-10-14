<!-- P31-HEADER
id: p31_v3c_c1_p4_brands_shape_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: multi-brand-schema.md D-1-P4
-->

# C1-P4 · Adopt `brands/<name>/tokens.json` + `$extends` file shape

**Status:** proposal · **Kind:** canon adoption (RFC-0006 file layout)
**Extracted from:** `design-workflow/V2-D-designv2/multi-brand-schema.md` D-1-P4 (line 183)

## Problem

Canon today stores brands as a single flat `themes.*` group in
`tokens.dtc.json` — no `$extends`, no per-brand files. RFC-0006 prescribes a
parent→child file shape with layered validation.

## Evidence (file:line)

- `design-workflow/V2-D-designv2/multi-brand-schema.md:48-56` — proposed layout: `Base/tokens.json` + `brands/<name>/tokens.json` (11 files, sunlight 23→22 after C1-P1)
- `design-workflow/V2-D-designv2/multi-brand-schema.md:60-67` — brand file shape: `name`, `$extends: ["../../Base/tokens.json"]`, `versionPolicy`, `tokens`
- `design-workflow/V2-D-designv2/multi-brand-schema.md:183` — proposal D-1-P4
- `design-workflow/V2-D-designv2/multi-brand-schema.md:96-125` — migration test: **11/11 themes express with zero value changes** (243 override entries, 0 violations)

## Proposal

When design-core is next edited, adopt on disk:

```
tokens/
  Base/tokens.json          # 23 structural names; defaults = cipher; text default = canonical p31.text
  brands/<name>/tokens.json # override-only, $extends ["../../Base/tokens.json"], versionPolicy
```

The validator (`validates.mjs` → `validates-v3.mjs`) is ready to gate the migration.

## Gate

`node design-workflow/V3-C-canon/validates-v3.mjs` — every brand validates R1–R6.

**Negative control:** `fixtures/neg-three-level.fixture.json` (grandchild `$extends` chain) → FAIL (R5).

## Files touched (adoption time)

- design-core token pipeline + brand files (new layout). **No canon file was modified by this proposal.**