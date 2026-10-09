# fix: migrate portals off `@p31ca/design-core/css/tokens.css` export (removed by SSOT Path A)

<!-- P31-HEADER
id: p31_fix_plan_design_core_tokens_css_consumer_migration_20261009_v1.0
type: fix-plan
component: packages/design-core
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

Path A of the SSOT consolidation (2026-10-09) deleted
`packages/design-core/src/css/tokens.css` and removed the
`"./css/tokens.css"` subpath export from `@p31ca/design-core`'s `package.json`.
Tokens now ship from `@p31ca/canon/tokens.css` (`@import '@p31ca/canon/tokens.css'`
in `design-core/src/css/index.css:19`).

Four portals still import the removed subpath directly:

- `portals/children/src/index.css:6` — `@import '@p31ca/design-core/css/tokens.css';`
- `portals/parent/src/index.css:6` — `@import '@p31ca/design-core/css/tokens.css';`
- `portals/teen/src/index.css:6` — `@import '@p31ca/design-core/css/tokens.css';`
- `portals/chat/src/main.tsx:6` — `import '@p31ca/design-core/css/tokens.css';`
- `portals/qpj/src/__tests__/token-audit.test.ts:19` — resolves the subpath via `require.resolve`

These work **today only because** each portal pins the frozen
`vendor/p31-design-core-3.0.0.tgz` snapshot, which still contains the file.
The next `sync-vendor` repack will drop it and every import above breaks with a
loud module-resolution failure.

## Fix

Per portal:
1. Change the import from `@p31ca/design-core/css/tokens.css` to
   `@p31ca/canon/tokens.css`.
2. Add `"@p31ca/canon": "file:vendor/p31ca-canon-0.1.0.tgz"` to `dependencies`
   and copy `packages/canon/p31ca-canon-0.1.0.tgz` into `vendor/` (same pattern
   as `portals/design` and `portals/shell`).
3. For `portals/qpj/src/__tests__/token-audit.test.ts:19`, point the resolve at
   `@p31ca/canon/tokens.css`.

The migration is loud-fail-safe: it must land before (or with) the next
`sync-vendor` in each portal, never after.

## Evidence

- `git ls-files packages/design-core/src/css/tokens.css` → empty (untracked dir,
  file deleted).
- `packages/design-core/package.json` exports contain no `./css/tokens.css`
  entry.
- Built design portal `dist/assets/vendor-design-core-*.css` contains canon's
  `oklch(65% 0.18 285` violet and no `oklch(61% 0.219 293` baseline duplicate.
- `portals/design` (the migrated consumer) passes 33/33 contract-parity tests.
- `packages/canon/scripts/verify-token-parity.mjs` → `✅ PARITY OK` (0 missing,
  0 divergences, 1 intentional research glow).