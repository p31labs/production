# fix: Workbench.css hardcodes oklch/hex color fallbacks (token-conformance blocker)

<!-- P31-HEADER
id: p31_fix_plan_workbench_colors_20261006_v1.0
type: fix-plan
component: portals/shell
status: resolved
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

## Symptom

`npm run gate` (portal root) fails before it reaches typecheck:

```
src/shell/Workbench.css:42: forbidden pattern /\boklch\(/
src/shell/Workbench.css:48: forbidden pattern /#[0-9a-fA-F]{3,8}\b/
2 token-conformance violations.
```

## Evidence

`portals/shell/src/shell/Workbench.css:42,48` — raw literals used as `var()`
fallbacks:

```css
background: var(--p31-glass-border, oklch(100% 0.02 60 / 0.12));
background: var(--p31-accent, #e2b74b);
```

Both tokens are defined once in `src/index.css:45,51` and every other shell
stylesheet consumes them **without** a fallback (`index.css:114,144,...`), so
the fallbacks are redundant duplication of the token value — the exact drift the
scanner exists to catch. Discovered while running the Wave 7 verification
sweep; file predates the wave (mtime Oct 5).

## Fix

Drop the literal fallbacks: `var(--p31-glass-border)` / `var(--p31-accent)`.
The tokens are defined on `:root` by the shell's own stylesheet, so there is no
unstyled-fallback scenario the literal was protecting against.

## Verification

`node scripts/token-conformance.mjs` → clean; then the full portal gate
(`npm run gate`: conformance → tsc → vitest → build).
