<!-- P31-HEADER
id: p31_fix_plan_canon_v2_design_core_legacy_layer_quarantine_20261012_v1.0
type: fix-plan
component: packages/design-core
status: open
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: quarantine design-core pre-canon CSS into `@layer legacy`

**Discovered by:** agent:subagent:canon-v2 (the vessel-contract build)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (cascade-contract gap; no runtime bug today)

## The bug

Canon v2 ships the cascade order
`@layer legacy, canon.tokens, canon.components, canon.layout, shell, face;`
(`packages/canon/src/css/layers.css`) and all NEW canon CSS is layered. But
the pre-canon stylesheets inside design-core are still unlayered:

- `src/css/recipes.css` (`.glass-panel`, `.topbar`, `.btn`, …)
- `src/css/layout.css` (`.shell`, `.viewport`, …)
- `src/css/chrome.css`, `src/css/shell.css`, `src/css/suite.css` equivalent
- `src/css/canon.css` and `src/css/all.css` — unlayered `:root` token
  overrides

Unlayered author CSS beats every layer, so these legacy rules always win over
the layered canon v2 — which defeats the cascade contract exactly where
portals mix legacy classes with `[data-p31=…]` surfaces.

## Why it was not flipped in the canon v2 wave

Wrapping those files in `@layer legacy { … }` in place would flip the cascade
under every live portal that imports them today (their own unlayered
stylesheet would suddenly beat the design-core recipes). That flip must land
per-face, as each portal ports onto canon v2 — the same face-by-face migration
the ADR (`docs/enterprise/design-system/canon-v2.md`) prescribes.

## The fix

During the portal port wave, per portal:

1. Switch the portal's CSS entry to import
   `@p31ca/canon/css/layers.css` first, then `@p31ca/canon/css/tokens.css`
   and `@p31ca/design-core/css/canon-v2.css`.
2. Wrap the portal's own legacy imports in `@layer legacy { … }` (or a
   `legacy.css` that lives inside the layer).
3. Delete legacy classes face-by-face as their surfaces move to
   `[data-p31=…]` components.
4. When the last portal has ported, wrap the remaining design-core
   pre-canon files themselves in `@layer legacy` and delete the dead classes.

Until then, `canon-v2.css` must not rely on beating unlayered legacy rules;
the ADR documents this as the interim state of the migration.