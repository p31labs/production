# Migration Guide

From portal-local components / old @p31/design-system:

1. Install: workspace dep `"@p31/design-core": "workspace:*"` (this repo) or file path.
2. Load CSS once: `@p31/design-core/css/all.css` (+ optional persona overlay). Delete local token/reset sheets that duplicate base/tokens.
3. Swap imports:
   - local Button/Input/etc → `@p31/design-core/primitives`
   - Topbar/SpoonDial/Glass* → `@p31/design-core/compositions`
   - old `@p31/ui-react` → compositions (same APIs)
4. Delete retired local CSS after visual diff passes.
5. Keep only persona overlay (token remaps) locally — never component forks.

Verification per app: typecheck, vitest, Playwright matrix, axe run.
