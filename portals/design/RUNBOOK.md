# Design Portal — Runbook

## Overview

The design portal (`production/portals/design`) is a Vite + React 19 + TypeScript application that consumes the canonical `@p31/design-core` as a vendored tarball.

## Architecture

```
production/portals/design/
├── vendor/
│   ├── p31-design-core-2.2.0.tgz    # Vendored tarball (pinned)
│   ├── p31-ui-1.3.1.tgz             # Fixed UI dependency
│   └── .sha512                      # SHA512 manifest for sync-vendor
├── src/
│   ├── components/                  # Portal-specific components
│   │   ├── chrome/                  # Topbar, BottomBar, SiteFooter, SiteTopbar
│   │   ├── chrome/__tests__/        # Chrome component tests
│   │   ├── catalog/                 # ComponentCatalog page
│   │   └── icons/                   # P31Icon
│   ├── routes/                      # Page routes (Home, Tokens, Components, etc.)
│   ├── __tests__/                   # Portal tests + setup
│   ├── App.tsx                      # Main app with CommandPalette + SectionStrip
│   └── index.css                    # Portal-specific CSS
├── pnpm-workspace.yaml              # Workspace config with vendored override
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Daily Workflow

### 1. Edit Canonical Design System
Edit the canonical source in `/home/p31/P31-local-workspace/packages/design-core`:
- Tokens: `packages/design-core/src/theming/theme-store.ts`
- Components: `packages/design-core/src/compositions/`
- CSS: `packages/design-core/src/css/`
- Tokens YAML: `cli/tokens/tokens.yml`

### 2. Sync Vendor Tarball
```bash
cd production/portals/design
pnpm sync:vendor
```
This:
1. Packs canonical `design-core` and fixed `p31-ui` into `vendor/`
2. Computes SHA512 of each tarball
3. Compares against `vendor/.sha512` manifest
4. If changed → runs `pnpm update @p31/design-core @p31/ui` to refresh lockfile
5. Updates `vendor/.sha512` manifest

### 3. Verify
```bash
pnpm typecheck   # TypeScript strict mode
pnpm test        # All portal tests (17 tests)
pnpm test:core   # Design-core tests via tarball (31 tests)
pnpm build       # Production build
```

### 4. Deploy
```bash
pnpm deploy      # Wrangler deploy to Cloudflare Pages
```

## Troubleshooting

### "Already up to date" but types fail
The `sync:vendor` script now tracks tarball SHA512 in `vendor/.sha512`. If you see stale types:
```bash
cd production/portals/design
rm vendor/.sha512
pnpm sync:vendor
```

### Missing composition exports
If portal can't import new compositions:
1. Verify `packages/design-core/src/compositions/index.ts` exports the new compositions
2. Verify `packages/design-core/package.json` exports `./compositions`
3. Run `cd packages/design-core && pnpm generate` to regenerate artifacts
4. Run `pnpm sync:vendor` in portal

### Stale lockfile
If `pnpm install` doesn't pick up new tarball:
```bash
cd production/portals/design
pnpm update @p31/design-core @p31/ui
```

## Key Files

| File | Purpose |
|------|---------|
| `vendor/.sha512` | SHA512 manifest for sync-vendor staleness detection |
| `scripts/sync-vendor.mjs` | Vendor sync script with SHA512 tracking |
| `scripts/freeze-baseline.sh` | Freeze baseline for visual regression |
| `src/__tests__/setup.ts` | Test mocks (theme-store, etc.) |
| `pnpm-workspace.yaml` | Workspace config with vendored override |
| `vitest.config.ts` | Portal test config |

## Testing

```bash
# All portal tests
pnpm test

# Design-core tests via tarball
pnpm test:core

# Type checking
pnpm typecheck
```

## Baseline Freeze

Before deploying:
```bash
./scripts/freeze-baseline.sh
```
This captures:
- Frozen dist artifacts (SHA256)
- Locked dependency graph (pnpm-lock.yaml)
- Test results (JSON)
- Source tree inventory

## Common Issues

| Issue | Solution |
|-------|----------|
| Portal types missing new compositions | `pnpm sync:vendor` |
| Tests fail with "Cannot read properties of undefined" | Check `src/__tests__/setup.ts` mock for `theme-store` |
| Build fails with CSS import errors | Check `src/index.css` imports |
| Sync-vendor says "Already up to date" but tarball changed | Delete `vendor/.sha512` and re-run |