<!-- P31-HEADER
id: p31_fix_plan_p31ca_astro7_spike_20261014_v1.0
type: fix-plan
component: apps/p31ca
status: resolved (merged + deployed 2026-10-14, evidence in §8)
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
   performed in this spike. **Executing agent (2026-10-14) re-verified this
   empirically on the merge branch — see §3d: both wiring variants fail the
   build, and the 13.7.0 pin is peer-incompatible with Astro 7.**

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

### 3d. Adapter wiring attempt (2026-10-14, executing agent — empirical)

The execute task asked to wire `@astrojs/cloudflare@14.3.4` per the 14.x
notes, with a fallback pin to 13.7.0. Both paths were tested honestly:

- **14.3.4 wired (default):** `astro build` **fails (EXIT 1)** — the
  workerd prerenderer emits `dist/server/.prerender/wrangler.json` with an
  `ASSETS` binding and wrangler refuses: *"The name 'ASSETS' is reserved in
  Pages projects."*
- **14.3.4 wired + `prerenderEnvironment: 'node'`:** **fails (EXIT 1)** —
  prerender crash (`document is not defined` in the prerender entry). In
  BOTH variants `dist/` flips to `client/` + `server/` with **no
  `dist/index.html`** — exactly the layout break that kills
  `wrangler pages deploy dist`.
- **13.7.0 pin:** registry metadata shows peerDependencies
  `astro: ^6.3.0` — 13.7.0 **cannot run on Astro 7.3.8** without breaking
  the peer contract; and 13.0.0 already removed Pages support
  (PR #15480). The "working 13.x adapter with Astro 7" premise is false on
  both counts.

**Decision (honest fallback): keep 14.3.4 installed but unwired** — the
14.x docs state *"If you're using Astro as a static site builder, you don't
need an adapter."* The hub is a static Pages deploy; the adapter remains a
devDependency for a future Workers-runtime move. Config restored to the
committed spike state (unwired) before build/deploy.

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

### 6a. EXECUTING ROLLBACK PLAN (written pre-deploy, 2026-10-14)

If the live verification (§8) fails after deploy:

```bash
cd /home/p31/production
git reset --hard 6f15c87          # main back to the pre-spike base
cd apps/p31ca
npm run prebuild && npm run build # rebuild the previous state
npx wrangler pages deploy dist --project-name p31ca --branch=main --commit-dirty=true
```

Faster alternative (no git reset needed): Cloudflare Dashboard →
Workers & Pages → p31ca → Deployments → rollback to the last good
deployment, or
`npx wrangler pages rollback <deployment-id> --project-name p31ca`.

**Capability check:** `wrangler pages deployment list --project-name p31ca`
succeeds against this workspace's Cloudflare credentials (verified
2026-10-14 pre-deploy), and `git reset --hard 6f15c87` is a local-history
operation — both legs of the rollback are executable from this machine.

## 7. Follow-ups (filed, not done)

1. Watch vitejs/vite#21954 / #22649 + parcel-bundler/lightningcss#695 — when
   upstream lands, re-test the default minifier and drop the pin.
2. `markdown.remarkPlugins/rehypePlugins` deprecation is now resolved via
   `unified()`; no further action.
3. Before a real deploy: render-gate probe at 3 viewports × themes per the
   kilo runbook (spike did not run the browser probe).

## 8. RESOLUTION — merged + deployed (2026-10-14, executing agent)

### 8a. Merge

`spike/astro7-vite8` merged into `main` from base `6f15c87` —
**clean fast-forward, zero conflicts** (the spike's 5 files are the only
delta: p31ca config/package/tailwind import, lockfile, this fix-plan).
`main` = `1593044`.

### 8b. Adapter decision (final)

**@astrojs/cloudflare stays at 14.3.4, installed but unwired.** Empirically
verified on the merge branch (§3d): wiring it — default or
`prerenderEnvironment: 'node'` — fails the build (EXIT 1) and flips
`dist/` to `client/`+`server/` (no `dist/index.html`), which breaks the
Pages static deploy. The 13.7.0 pin is not viable on Astro 7 (peer
`astro ^6.3.0`; Pages support removed in 13.0.0, PR #15480). The hub is a
static Pages site — per the 14.x docs, *"If you're using Astro as a static
site builder, you don't need an adapter."* 14.3.4 remains a devDependency
for the future Workers-runtime move.

### 8c. Build + gates (pre-deploy)

`npm run prebuild` (7 gates) → `npm run build` (**40 pages, EXIT 0**) →
`npm run postbuild` (neurodivergent --dist + WCAG --runtime) — **all
green**. Built CSS glass intact: 73 `backdrop-filter` + 27
`-webkit-backdrop-filter` in `dist/_astro/MarketingShell.CXd8njN6.css`
(matches spike §3b byte counts).

### 8d. Deploy (ONE deploy, 2026-10-14 ~13:03 UTC)

`npx wrangler pages deploy dist --project-name p31ca --branch=main
--commit-dirty=true` — **EXIT 0, 611 files**. Production URL:
**https://15c5b8ea.p31ca.pages.dev** (live at https://p31ca.org).
(Note: one pre-flight failure resolved mechanically — a stale
`.wrangler/deploy/config.json` left by the §3d wiring experiments pointed
at the nonexistent `dist/client/wrangler.json`; moved aside, never
deleted, then deploy went green.)

### 8e. Live verification (all on https://p31ca.org)

- **Pages 200:** 36/36 routes spot-checked, including the 5 adopted
  (`/`, `/sovereign-vs-saas/`, `/verify/`, `/runbook/`, `/research/`), all
  8 `/apps/*` (mcp, cli, governance, loom, lumi, meatspace, qpj,
  spaceship-earth), arcade, journey, enterprise, security, compliance,
  about/team/press/hire/get-involved, annual-report, financials, treasury,
  donate, ways-to-give, faq, blog, accessibility, privacy, terms, signin,
  signup, docs. `/404/` correctly 308→404 page. `/api/health` returns the
  404 page — same behavior on the previous production deployment
  (pre-existing static-Pages behavior, not a regression).
- **verify:perf (desktop preset, per lighthouserc.json CI config):**
  FCP 924 ms (≤1800 ✓) · LCP 941 ms (≤2500 ✓) · TTFB 16 ms (≤800 ✓) ·
  **TBT 134 ms (≤200 ✓)** · CLS 0.047 (≤0.1 ✓) · **score 0.95 (≥0.9 ✓)**.
  `npm run verify:perf -- --json .lh/report.json` — **PASS, EXIT 0**.
  (Cold-edge first runs were over budget — FCP 4124/LCP 5136/score 0.68 —
  and converged within two warm runs; the previous deployment shows the
  same cold-start behavior, TBT 35961 cold. Desktop warmed TBT range
  87–134 ms across 3 runs.)
- **e2e five-dollar-stack:** `PLAYWRIGHT_BASE_URL=https://p31ca.org
  PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test
  e2e/five-dollar-stack.spec.ts` — **5/5 passed (38.9s)**, each with the
  console-clean sniffer green.
- **Console errors:** 0 across a 12-page Playwright sweep (home, 8 apps
  pages, arcade, verify, sovereign-vs-saas).
- **Glass screenshot verdict (the esbuild pin in production):** Playwright
  probe on the live site — computed `backdrop-filter:
  blur(20px) saturate(1.5)` on `.posner-topbar`; **18 live glass
  elements** on `/`; pixel-diff of the topbar screenshot with
  `backdrop-filter` forced off **differs** (sha256 on: `88d3de68…`, off:
  `73a13f7d…`) — the blur is genuinely rendering, not just present in
  CSS. Live-served `MarketingShell.CXd8njN6.css` byte-check: 73
  `backdrop-filter` occurrences.

### 8f. State

- `main` = `1593044` (spike merged); working tree also carries two
  pre-existing unrelated modifications (`STATE.md`,
  `workers/mcp-registry/.dev.vars`) left untouched per workspace rules.
- No files deleted. Adapter installed-unwired per §8b. Rollback plan §6a
  remains executable (both legs capability-checked).