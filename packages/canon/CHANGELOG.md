# @p31ca/canon — changelog

## 0.1.0 (published)

Initial release. 256 CSS custom properties emitted; the design-system trio
(`@p31ca/canon`, `@p31ca/design-core`, `@p31ca/ui`) ship independently.

## Unreleased (0.2.0)

### Deprecated (152 tokens)

152 emitted tokens have no consumer anywhere in `design-core/src/css`. They are
marked `$deprecated` (DTCG) in `deprecations.json` and merged into the
`tokens.dtc.json` export. **Removal in v0.3.0.**

Categories:

- `glow-*` / `neon-*` — superseded by the `--p31-accent-*` palette
- `*-alt` — superseded by the primary accent token
- `color-*-{default,muted}` — flattened into the semantic `--p31-accent-*` tier
- default — no consumer, no replacement

Enforcement: `scripts/check-deprecated-tokens.mjs` fails the gate if any
component CSS references a deprecated token. `npm run` `pnpm gate` includes it.

### Fixed

- `token-consumption.mjs` dead-token metric corrected (was class-declaration-only;
  now counts all `var(--p31-*)` references). True dead count is 152, not 162.