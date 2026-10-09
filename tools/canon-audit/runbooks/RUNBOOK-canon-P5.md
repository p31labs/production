# RUNBOOK-canon-P5 — Registry + marketplace UI

**Purpose:** Ship the shadcn-schema `registry.json` + extend the design portal
catalog with a **Chrome** category and live previews. **Owner:** marketplace
maintainer. **Depends on:** P2. **Blocking for:** P9.

## Steps

1. Author `packages/design-core/registry.json` in the shadcn schema:
   ```json
   { "$schema": "https://p31ca.org/schema/registry.json",
     "name": "p31ca", "homepage": "https://design.p31ca.org",
     "items": [
       { "name": "Topbar", "type": "registry:component", "category": "chrome",
         "files": [{"path": "src/compositions/Topbar.tsx", "type": "registry:component"}],
         "dependencies": ["react"], "registryDependencies": ["Crown","SpoonDial","CrisisOverlay"],
         "status": "stable" },
       { "name": "SidebarNav", "type": "registry:component", "category": "chrome",
         "files": [{"path": "src/compositions/SidebarNav.tsx", "type": "registry:component"}],
         "status": "stable" }
       // ... all 33 genui + all canon chrome
     ] }
   ```

2. Generate from `genui/catalog.json` + `compositions/index.ts` so it stays in sync
   (`scripts/gen-registry.mjs`).

3. Extend `production/portals/design/src/routes/Catalog/`:
   - add a **Chrome** category to `CATEGORIES`
   - add `SAFE_RENDERERS` entries for all canon chrome (live previews, not token-tiles)
   - each card: live preview, props, token deps (linked to TokenExplorer), variants,
     `import { X } from '@p31ca/design-core/compositions'` snippet

4. Add the `p31ca` CLI install path (minimum: `add`, `list`, `diff`).

## Gate
```
node -e "const r=require('./packages/design-core/registry.json');
  if(r.items.filter(i=>i.category==='chrome').length<8) process.exit(1);
  console.log('PASS: chrome entries present')"
curl -s http://localhost:5180/catalog | grep -q "Chrome" && echo PASS
```

## Negative control
A registry entry with no matching file fails `verify-registry.mjs --strict`.

## Rollback
```
git checkout HEAD -- packages/design-core/registry.json production/portals/design/src/routes/Catalog/
```