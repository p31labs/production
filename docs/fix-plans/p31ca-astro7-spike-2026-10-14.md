<!-- P31-HEADER
id: p31_fix_plan_p31ca_astro7_spike_20261014_v1.0
type: fix-plan
component: apps/p31ca
status: spike-complete (go-with-pin)
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: p31ca Astro 7 / Vite 8 upgrade SPIKE — verdict GO (with cssMinify pin)

**Discovered by:** agent:subagent:astro7-vite8-spike (branch `spike/astro7-vite8`,
timeboxed, NO deploy)
**Discovered at:** 2026-10-14T00:00:00Z
**THE question:** does built CSS preserve `backdrop-filter` /
`-webkit-backdrop-filter` under Vite 8's new default Lightning CSS minifier?
(Vite 8 defaults `build.cssMinify` to `lightningcss`; vitejs/vite#22649 says it
drops the unprefixed `backdrop-filter`, which would erase the hub's glass
language.) **Answer: it does NOT — the default erases the glass. Pinning
`cssMinify: 'esbuild'` restores it byte-clean. Verdict: GO with the pin.**

## 1. Versions landed (apps/p31ca, resolved)

| Package | Before | After |
|---|---|---|
| astro | 6.4.8 | **7.3.8** |
| @astrojs/react | 6.0.6 | **7.0.1** |
| @astrojs/cloudflare (installed, unwired — see config note) | 13.7.0 | **14.3.4** |
| @astrojs/markdown-remark | — (transitive) | **7.3.2** (added) |
| vite | 7.x (transitive) | **8.3.4** (added explicit devDep) |
| esbuild | — (transitive) | **0.28.2** (added devDep — required by Vite 8 for `cssMinify: 'esbuild'`) |
| cookie | — (hoisted 0.7.2) | **2.0.1** (added — see fix #2) |
| wrangler / react / react-dom / tailwindcss | unchanged | unchanged |

Node v24.16.0 (>= 22.12 required by Astro v6+, fine). `@astrojs/check@0.9.10`
× TS 7 peer mismatch remains pre-existing (build is the gate).

## 2. Build result

`npm run build` (prebuild gates → astro build → postbuild checks) — **EXIT 0,
40 page(s) built**, dist = 298 HTML files (v6 baseline 294 + the 4 pages added
since). Gates green: no-HTML-comments, ground-truth, content-sources,
content-consistency, compliance-drift, neurodivergent (source + dist),
WCAG 2.2 (static + runtime).

### Mechanical fixes applied (running log)

1. **`@import "tailwindcss"` (bare) fails under Vite 8 postcss-import.**
   Vite 8 resolves it as a relative file → `ENOENT apps/p31ca/tailwindcss`.
   Fix: `tailwind.build.css:1` → `@import "tailwindcss/index.css";`
   (the v4 package root has no `./index.css` export, so the file-level import
   is what the Vite 8 resolver accepts).
2. **Astro 7 prerenderer crashes: `Named export 'parseCookie' not found`**
   (`astro/dist/core/build/default-prerenderer.js` → `dist/.prerender/`).
   The prerender entry externalizes `cookie`, and Node resolves the app-level
   hoisted `cookie@0.7.2` (CJS, exports only `parse`/`serialize`) instead of
   astro's pinned `cookie@2.0.1` (ESM, exports `parseCookie`/
   `stringifySetCookie`). Fix: added `cookie@^2.0.1` to p31ca dependencies.
3. **Markdown pipeline.** Astro 7's default markdown processor is Sätteri;
   `rehypePlugins` (rehype-mermaid-lite) requires the unified pipeline.
   Fix: added `@astrojs/markdown-remark` + `markdown.processor:
   unified({ rehypePlugins: [rehypeMermaidLite] })` in `astro.config.mjs`.
4. **Vite 8 renames.** `vite.esbuild.jsx: 'automatic'` → `vite.oxc.jsx:
   { runtime: 'automatic' }` (auto-conversion exists but is deprecated; the
   pin is still REQUIRED — without it the raw workspace `.tsx` sources emit
   `React.createElement` with no binding, the same crash the v6 upgrade
   fixed). `build.rollupOptions` → `build.rolldownOptions`; the function-form
   `manualChunks` is deprecated → migrated to rolldown
   `output.codeSplitting.groups` (`three` / `pglite`). Verified: the `three`
   vendor chunk is emitted (`dist/_astro/three.*.js`).
5. **`compressHTML: true`** pinned explicitly (Astro 7's default changed to
   `'jsx'`, which strips inter-inline-element spaces — `true` preserves the
   v6 HTML-aware behavior).
6. **`@astrojs/react` v7 still lacks the `jsx-dev-runtime` export** —
   re-ran the existing `scripts/patch-astrojs-react.mjs` (idempotent; same
   dist layout, patched the store copy).
7. **Cloudflare adapter:** stays installed at 14.3.4 but NOT wired in
   `astro.config.mjs` (same rationale as v6 — an adapter forces the Workers
   output layout and breaks `wrangler pages deploy dist`). No deploy was
   performed in this spike.

## 3. The backdrop-filter findings (THE question)

Input CSS (source of truth): `src/styles/topbar.css:26-27` pairs
`backdrop-filter` + `-webkit-backdrop-filter` on `.posner-topbar`, and
`src/styles/molecular-dome.css` pairs them on `.command-fab` /
`.dome-overlay` / `.molecular-heart-layer` variants.

### 3a. Default minifier (Lightning CSS, Vite 8 default) — GLASS BROKEN

```
.posner-topbar{...;-webkit-backdrop-filter:blur(20px)saturate(150%);...}
.command-fab{...;-webkit-backdrop-filter:blur(16px);...}
```

→ **the unprefixed `backdrop-filter: blur(20px) saturate(150%)` is DROPPED
from every rule that also carries the `-webkit-` twin.** Only the prefixed
property survives. This is exactly vitejs/vite#22649 /
parcel-bundler/lightningcss#695. (Where the source has ONLY the unprefixed
property — e.g. Tailwind `backdrop-blur-*` utilities, `journey.css` — it
survives; the mangle triggers specifically on the pair.) Count in
`dist/_astro/MarketingShell.*.css`: 49 `backdrop-filter` vs 22
`-webkit-` occurrences — under esbuild: 73 vs 27 (the delta is the dropped
unprefixed glass).

### 3b. Pinned minifier (esbuild, Vite 7 default) — GLASS INTACT

```
.posner-topbar{...;backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%)}
.command-fab{...;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);...}
```

→ **both properties survive, byte-comparable to the Vite 7/v6 output.**

### 3c. Not affected either way

Inline `style="..."` attributes (Header.astro `backdrop-filter: blur(12px)`,
GlassCard.astro `backdrop-filter: var(--p31-glass-blur)`) are HTML, not CSS
— the minifier never touches them; verified present in built HTML.

## 4. Verdict

**GO — with the esbuild pin.** Astro 7 + Vite 8 builds cleanly (40 pages,
gates green, all mechanical fixes above), but ONLY if
`vite.build.cssMinify: 'esbuild'` is pinned. The Lightning CSS default
silently deletes the hub's glass (topbar, dome overlay, command panel —
every rule written as the standard + `-webkit-` pair). Do NOT ship Astro 7
on the Lightning CSS default.

### Exact pin (already in `astro.config.mjs` on the branch)

```js
vite: {
  build: {
    cssMinify: 'esbuild',   // + `esbuild` must be an explicit devDependency
  },
},
```

Vite 8 no longer bundles esbuild, so `esbuild@^0.28.2` was added to
devDependencies (this is the documented Vite 8 requirement for
`cssMinify: 'esbuild'`).

## 5. Other breakage (fixed above; brief)

- Bare `@import "tailwindcss"` — Vite 8 postcss-import no longer resolves
  it (fix: `tailwindcss/index.css`).
- `cookie@0.7.2` hoisting breaks Astro 7's prerenderer (fix: explicit
  `cookie@^2.0.1`).
- Vite 8 renames: `esbuild.jsx` → `oxc.jsx` (pinned), `rollupOptions` →
  `rolldownOptions` (function-form manualChunks deprecated → codeSplitting).
- Astro 7 `compressHTML` default flips to `'jsx'` (pinned back to `true`).
- Non-blocking warnings: `INEFFECTIVE_DYNAMIC_IMPORT` (lumiIntent — benign),
  chunk >500 kB warning (pre-existing, three.js), Zod annotation warnings
  (pre-existing).
- NOT exercised (spike scope): `astro check` (pre-existing TS 7 ×
  @astrojs/check peer gap), live browser probe, deploy. The Rust compiler's
  stricter HTML produced ZERO unclosed-tag errors on the 40-page build.

## 6. Rollback / branch state

- **Branch:** `spike/astro7-vite8` (from commit `6f15c87`) — see last commit
  hash below; NOT merged, NOT deployed.
- Revert = drop the branch; the lockfile re-resolution is the only
  workspace-level file changed (`pnpm-lock.yaml`).
- No files were deleted; `tailwind.config.mjs` / `tailwind.build.config.cjs`
  remain as archaeology.

## 7. Follow-ups (filed, not done)

1. Watch vitejs/vite#21954 / #22649 + parcel-bundler/lightningcss#695 — when
   upstream lands, re-test the default minifier and drop the pin.
2. `markdown.remarkPlugins/rehypePlugins` deprecation is now resolved via
   `unified()`; no further action.
3. Before a real deploy: render-gate probe at 3 viewports × themes per the
   kilo runbook (spike did not run the browser probe).