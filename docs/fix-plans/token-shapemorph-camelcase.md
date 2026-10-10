# fix: --p31-motion-shapeMorph-duration is camelCase; the rest of the token set is kebab-case

<!-- P31-HEADER
id: p31_fix_plan_token_shapemorph_camelcase_20261009_v1.0
type: fix-plan
component: packages/canon
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

Exactly one token breaks the kebab-case naming convention:
`--p31-motion-shapeMorph-duration` (DTCG `motion.shapeMorph.duration`). Every
other token is kebab-case. Surfaced by `check-token-parity.mjs`, whose initial
CSS regex `[a-z0-9-]` failed to match the uppercase `M`.

## Evidence

```bash
grep -oE -- '--p31-[a-zA-Z0-9-]+' packages/canon/dist/tokens.css | sort -u | grep -E '[A-Z]'
# --p31-motion-shapeMorph-duration   (the only one)
```

## Fix

Rename `shapeMorph` → `shape-morph` in the token source (theme-store.ts / the
motion group), regenerate, and note the breaking CSS change in CHANGELOG. It is
a breaking rename for any consumer reading the camelCase property, so stage it
with the v0.3.0 removal release rather than a patch.

## Impact

- Cosmetic / convention, but it makes the token set's naming machine-checkable
  (the parity gate and any future lint can then assume lowercase-only).