# Portal Template System

## What Was Created

### Template Directory (`portals/template/`)

Three canonical config files that all 5 React portals (children, parent, teen, meatspace, design) inherit from:

| File | Purpose |
|------|---------|
| `template/vite.config.ts` | Canonical Vite config — uses `SENTRY_PROJECT` and `PORTAL_PORT` env vars for per-portal customization |
| `template/tsconfig.json` | Identical TypeScript config (was already identical across all 5 portals) |
| `template/package.json` | Union of all shared dependencies — the superset of what each portal needs |

### Unified Deploy Script (`portals/deploy-unified.mjs`)

Replaces `deploy-portals.js` with single-portal support:

```bash
# Deploy all portals (same as deploy-portals.js)
node deploy-unified.mjs

# Deploy a single portal
node deploy-unified.mjs children

# Deploy specific portals
node deploy-unified.mjs children parent teen

# Dry-run (stage all without deploying)
node deploy-unified.mjs --dry-run

# Dry-run a single portal
node deploy-unified.mjs --dry-run children
```

Portal names: `children`, `parent`, `teen`, `meatspace`, `design`, `developer`, `institutional`

### Updated React Portal Configs

Each of the 5 React portals now has:

- **`tsconfig.json`** → `{"extends": "../template/tsconfig.json"}` (replaces the 16-line file)
- **`package.json`** → `"extends": "../template/package.json"` added to the top

Portal-specific `package.json` files keep their unique dependencies (e.g., design has `lucide-react`, meatspace lacks `game-engine`).

### Existing Scripts Untouched

- `deploy-portals.js` — still works, no changes made
- Individual portal `pnpm run deploy` scripts — still work

## Architecture

```
portals/
  template/                  ← NEW: master template
    package.json             ← shared deps & scripts
    tsconfig.json            ← shared TS config
    vite.config.ts           ← shared Vite config (env-var driven)
  children/
    package.json             ← extends template, keeps specific deps
    tsconfig.json            ← extends template
    vite.config.ts           ← per-portal (sentry project, port, chunks)
  parent/                    ← same pattern
  teen/                      ← same pattern
  meatspace/                 ← same pattern
  design/                    ← same pattern
  deploy-unified.mjs         ← NEW: unified deploy with single-portal + dry-run
  deploy-portals.js          ← UNCHANGED: original batch deploy
  developer/                 ← UNCHANGED: static portal
  institutional/             ← UNCHANGED: static portal
```

## Notes

- The `extends` field in `package.json` is an npm v9+ feature. pnpm does not support it natively, so the portal-level `package.json` files still list their full dependencies for compatibility. The template serves as the source of truth when updating shared versions.
- `vite.config.ts` is per-portal because each has a unique Sentry project name, dev server port, and optional `manualChunks` config. The template provides the base pattern.
- Static portals (developer, institutional) are not affected — they don't use Vite or the template.
