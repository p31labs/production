# fix: token-consumption.mjs dead-token count misses :root/@keyframes/[data-theme] usage

<!-- P31-HEADER
id: p31_fix_plan_token_consumption_dead_count_20261009_v1.0
type: fix-plan
component: packages/canon/scripts/token-consumption.mjs
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

`token-consumption.mjs` reports "162 dead tokens", but 10 of those are actually
referenced — in `:root`, `@keyframes`, `[data-theme]`, and `@media` blocks, which
the script's consumption scan does not see. The true dead count is **152**.

## Evidence

The script builds `classVars` only from CSS class declarations:

```js
for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) { ... }
```

A `var(--p31-base)` in `:root { ... }` or a `[data-theme="garden"]` block is
not a class declaration, so it is not counted as consumed. `dead` is then
`emitted - allConsumed`, over-counting by the 10 tokens used only in non-class
blocks (`--p31-base`, `--p31-ambient-blur`, `--p31-duration-slow`,
`--p31-font-base`, `--p31-space-base`, etc.).

Surfaced while generating `packages/canon/deprecations.json` (2026-10-09):
`check-deprecated-tokens.mjs` (which scans *all* `var()` references) flagged
several "dead" tokens as still referenced.

## Fix

Split the two metrics:

1. **Per-component over/under-claims** — keep `classVars` (class-level is the
   contract's scope; a token used in `:root` is not a component claim).
2. **Dead-token count** — compute `allConsumed` from *every* `var(--p31-*)`
   reference in `design-core/src/css`, not just class declarations.

## Impact

- The prior arc's "147" and the re-derived "162" were both inflated by the
  same bug. The authoritative dead count is **152** (emitted 256 − referenced
  104), reflected in `deprecations.json`.