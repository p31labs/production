# fix: build-sovereign.mjs aborts on pre-migration token paths in CSS templates

<!-- P31-HEADER
id: p31_fix_plan_build_sovereign_template_migration_20261011_v1.0
type: fix-plan
component: cli
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`node cli/tokens/build-sovereign.mjs` exits 1 at step `[2/3] Rendering CSS`:

```
ERROR rendering template: Missing token: root.base_unit
```

Nothing is written (verified: zero file changes after the run) — the abort
happens before any output step, so the failure is safe but total: the build is
a no-op today.

## Root cause

The token vocabulary migrated to `p31.*` DTCG (commit `818f9c3`,
`gen-tokens-yml.mjs` now drops the `primitive`/`semantic`/`root`/`scale`/
`spacing`/... groups from `cli/tokens/tokens.yml`), but the build's CSS
templates were never migrated:

- `cli/tokens/component-css-template.css` still references `{{root.base_unit}}`,
  `{{semantic.color.background.default}}`, `{{primitive.color.surface2}}`,
  `{{primitive.blur.standard}}`, etc. — every placeholder is a missing path in
  the current `tokens.yml`.
- `base_unit` now lives at `metadata.canonical_constants.base_unit` in
  `tokens.yml` (16px), not at a `root` token group.
- `cli/tokens/tokens-css-template.css` references the same stale groups.

Discovered 2026-10-11 while verifying the 8 components.yml consumers in
`catalog-pipeline-divergence.md` (consumer #1). This is pre-existing — it
predates the components.yml regeneration, and is unrelated to the catalog
shape. Filed per the ownership contract.

## Consumers blocked by this

1. `build-sovereign.mjs` itself (no CSS/token injection into sovereign HTML,
   no `design-system.json`, no A2UI catalog regeneration).
2. `apps/phos/public/.well-known/design-system.json` regeneration (normally
   step `[6/9]` of build-sovereign). Regenerated directly via
   `export-design-system.mjs` on 2026-10-11 as a stopgap — the well-known file
   is current, but the canonical regeneration path is still broken.
3. `scripts/generate-a2ui-catalog.mjs` (reads `design-system.json`).

## Fix scope (not yet done)

Migrate the template placeholders to the `p31.*` vocabulary (and
`metadata.canonical_constants.*` for the base), then re-run build-sovereign and
confirm the HTML injections are byte-stable across re-runs. Same class of work
as the token deprecation tail already done on the canon side, but for the CLI
template side. Owned by the token-vocabulary-migration arc; kept out of the
catalog-pipeline workstream to avoid a second writer on the same templates.

## Verification done (evidence the abort is safe)

- `git status --short` before/after the failed run: identical (0 file changes).
- `node --check cli/tokens/build-sovereign.mjs` → OK (syntax).