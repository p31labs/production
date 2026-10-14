<!-- P31-HEADER
id: p31_fix_plan_p31ca_build_blocker_canon_20261012_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix: p31ca build blocked — missing `@p31ca/canon` wiring + phantom `@p31ca/canon-react` imports

## Symptom

`npm run build` (astro build) fails in "Building server entrypoints" with:

```
[vite]: Rollup failed to resolve import "@p31ca/canon/tokens.css"
  from "src/pages/signup.astro".
```

`src/pages/signin.astro` and `src/pages/signup.astro` (modified 2026-10-09,
auth work-in-progress) import `@p31ca/canon/tokens.css`, `@p31ca/canon-react/styles.css`
and `{ Button } from '@p31ca/canon-react'`.

## Root cause (two independent gaps)

1. **`@p31ca/canon` is not a declared dependency of `apps/p31ca`** and has no
   symlink in `apps/p31ca/node_modules/@p31ca/` (siblings `design-core`, `shared`,
   `ui`, etc. are linked). `MarketingShell.astro` also imports
   `@p31ca/canon/css/all.css` + `@p31ca/canon/theming/page-themes`, so the whole
   hub shell depends on the package without declaring it. The package is built
   (`packages/canon/dist/{css,tokens.css,theming}`) — only the wiring is missing.
2. **`@p31ca/canon-react` does not exist anywhere in the workspace** (no package,
   no portal, no vendor tarball). The signin/signup Button import is a phantom.

## Fix (2026-10-12)

1. `apps/p31ca/package.json` → add `"@p31ca/canon": "workspace:*"` to dependencies.
2. Create the missing symlink `apps/p31ca/node_modules/@p31ca/canon → ../../../../packages/canon`
   (same pattern as its siblings) so the current environment builds without a
   full reinstall. A future `pnpm install` will recreate it from the manifest.
3. `src/pages/signin.astro` + `src/pages/signup.astro` → drop the two
   `@p31ca/canon-react` imports; replace `<Button client:load …/>` with a native
   `<button type="submit" class="btn btn-primary w-full">` (canon recipes.css
   `.btn`/`.btn-primary`, already loaded via the shell's canon CSS). The
   page-level `@p31ca/canon/tokens.css` import is redundant (the shell imports
   `@p31ca/canon/css/all.css`) and was removed too.

## Verification

- `npm run prebuild` green (unchanged verification chain).
- `npm run build` green; `dist/signin/index.html` + `dist/signup/index.html` present.
- Deployed 2026-10-12 (branch `main`): https://a132e3ab.p31ca.pages.dev — https://p31ca.org/ 200, /signin/ + /signup/ 200.
- Follow-up for the auth work-in-progress: when the auth backend lands, re-add a
  Button from an EXISTING package (`@p31ca/controls` or canon `.btn` classes) —
  do not reintroduce `@p31ca/canon-react` until that package is published.