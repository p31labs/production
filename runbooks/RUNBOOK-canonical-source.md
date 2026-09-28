# RUNBOOK-canonical-source

## When to use
You are about to edit a design-token value, add a token, or touch any of:
`theme-store.ts`, `tokens.css`, `manifest.json`, `tokens.json`, `tokens.yml`.

## Prerequisites
- Know the canonical source. `@p31ca/canon` declares
  `packages/canon/src/theming/theme-store.ts` as the single source of truth.

## Steps
1. Edit the canonical source (`theme-store.ts`).
2. Regenerate: `pnpm gen:tokens` (in design-core) — emits `tokens.css`,
   `manifest.json`, `tokens.json`, and the theme-*.css files.
3. Run the parity gate (`verify-token-parity.mjs`) and `canon-purity`.
4. Re-vendor: `pnpm sync:vendor` in the design portal, then `pnpm install`.

## How to verify
`node scripts/canon-purity.mjs` and the parity gate exit 0; the vendored
tarball's hash changed and the portal build picks it up.

## Common pitfalls
- **Declaring a single source without a parity gate wired to it.** The
  tree had five hand-edited token forms and no gate compared them. The gate
  must be wired to the build, not documented.
- **`tokens.yml` vs `theme-store.ts`.** Two generators read two sources:
  `gen-tokens.mts` reads `theme-store.ts`; `generate-mcp-data.mjs` reads
  `tokens.yml`. They drifted on the neutral hue (270 vs 240). One source.

## Owner + last verified
`Owner: design-core` · `Last verified: 2026-09-28`