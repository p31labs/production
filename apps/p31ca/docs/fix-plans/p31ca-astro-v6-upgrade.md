<!-- P31-HEADER
id: p31_fix_plan_p31ca_astro_v6_upgrade_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: p31ca.org Astro v6 upgrade (H3 — Astro upgrade + Tailwind collapse)

**Discovered by:** agent:subagent:astro-v6-upgrade (executing
`apps/p31ca/docs/UPGRADE-RUNBOOK-KILO.md` §7 H3 with the research-locked
upgrade path)
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** high while in flight (build-breaking); resolved — gates green,
live site verified.

## Migration checklist (what changed, file:line)

| Step | File | Change |
|---|---|---|
| 1 | `package.json` | astro `^5.17.1`→`^6.4.8` (resolved 6.4.8); `@astrojs/react` `^5.0.4`→`^6.0.6`; react/react-dom `^18.3.1`→`^19.3.0`; `@types/react*`→`^19.3.0`; `@astrojs/cloudflare` `^12.6.13`→`^13.4.0` (resolved 13.7.0, latest whose peer allows astro ^6); **removed** `@astrojs/tailwind`; **added** `tailwindcss@^4.3.3` + `@tailwindcss/postcss@^4.3.3`; `wrangler` `^4.85.0`→`^4.149.0` (peer of @cloudflare/vite-plugin behind the adapter) |
| 2 | `astro.config.mjs:1-14` | removed `tailwind()` integration + `viewTransitions: true` (both removed in v6); removed the Cloudflare adapter from the config — see "adapter decision" below |
| 3 | `astro.config.mjs:25-35` | added `vite.esbuild.jsx: 'automatic'` — see "JSX runtime" fix below |
| 4 | `postcss.config.mjs` (new) | `@tailwindcss/postcss` plugin (v4 wiring; `@tailwindcss/vite` deliberately avoided — rolldown-vite incompat, withastro/astro#16542) |
| 5 | `tailwind.build.css` | v3 `@tailwind base/components/utilities` → v4 `@import "tailwindcss"` + `@source "./src"` + `@theme` (full token mapping below) |
| 6 | `tailwind.config.mjs` | superseded shim (no-delete rule keeps the file; nothing loads it) |
| 7 | `src/styles/global.css:1` | imports `../../tailwind.build.css` so every MarketingShell page carries the utilities |
| 8 | `src/content.config.ts` | legacy `type:'content'` collections (REMOVED in v6) → Content Layer API with `glob()` loaders; Zod 4 fix: `z.string().url()` → `z.url()` |
| 9 | `src/layouts/MarketingShell.astro:20,124` | `<ViewTransitions />` → `<ClientRouter />` from `astro:transitions` |
| 10 | `.nvmrc` (new) | `22.12` (Node ≥ 22.12 required; box runs v24.16.0) |
| 11 | `scripts/patch-astrojs-react.mjs:1-11` | doc header updated for the v6 + React 19 pairing; patch itself unchanged (v6 dist layout identical — adds the missing `./jsx-dev-runtime` export, idempotent no-op if present) |

### Audits (clean, no changes needed)

- `Astro.glob()` → `import.meta.glob()`: zero hits in `src/` (routes use
  `getCollection`/Content Layer).
- `import.meta.env`: zero hits in `src/` + `scripts/` — nothing to de-inline;
  the only env usage is `.env` → `PUBLIC_WEBMCP_ORIGIN_TRIAL` read by Astro's
  env loader, no secret-inlining hazard.
- `z.string().email()`: zero hits (only `.url()`, fixed above).
- `ViewTransitions`: only `MarketingShell.astro` (fixed); `transition:persist`
  markers are fully supported by `ClientRouter` — untouched.

## Tailwind v4 wiring (the 54 pages keep their utility classes)

- **Entry:** `tailwind.build.css` → `@import "tailwindcss";` + `@source "./src";`
  + `@theme { ... }`, imported first in `src/styles/global.css`. Content
  detection is pinned by `@source` instead of a JS config scan.
- **Theme mapping** (old `p31Preset` + `tailwind.config.mjs` extend → `@theme`):
  - hub accents: `--color-hubRose`/`--color-hub-rose` `#E8636F`,
    `--color-hubNav`/`--color-hub-nav` `#080810`
  - brand palette (CANON_PALETTE): brand-coral/teal/cyan/amber/lavender/
    phosphorus/phosphor/fuchsia (kebab + camelCase aliases)
  - hub + org appearance colors (CANON_APPEARANCES), incl. glass tokens
  - fonts: `--font-sans` (Inter stack) + `--font-mono` (JetBrains Mono)
- **Key discovery — v4 camelCase resolution:** Tailwind v4.3.3 only resolves
  camelCase class names (`text-hubRose/90`) against **camelCase theme keys**
  (`--color-hubRose`); kebab keys (`--color-hub-rose`) do NOT match camelCase
  markup, and v4 tree-shakes `@theme` vars to only those referenced by
  generated utilities. Verified empirically with the postcss harness
  (`/tmp/opencode/twtest/`). The `@theme` block ships BOTH key forms so
  camelCase (hub markup) and kebab (v3-style) classes both resolve.
- **Legacy files kept, not loaded:** `tailwind.build.config.cjs` + `p31-tw.css`
  (public-page CDN flow — 0 current references, public pages use the runtime
  CDN or `p31-style.css`) and `tailwind.config.mjs` (superseded shim).

## Problems found & fixed (ownership contract)

1. **Dual-React SSR crash (`Cannot read properties of null (reading 'useCallback')`).**
   `zustand` was consumed transitively with no declared dependency, so at SSR
   runtime the prerender chunks resolved it from the OUTER `/home/p31/node_modules`
   tree, whose `react` peer is a different module instance than the store copy
   that `react-dom/server` uses — ReactCurrentDispatcher mismatch → null
   dispatcher. Fix: declared `zustand@^5.0.15` in `package.json` so it resolves
   from the app's node_modules (same store tree as react/react-dom).
2. **`React is not defined` SSR crash (`/treasury` et al.).** Workspace-package
   sources consumed raw via package exports (`@p31ca/ui/chrome` → `./src/*.tsx`)
   fall through to esbuild with the ROOT tsconfig's classic JSX mode, emitting
   `React.createElement` with no binding. Fix: `vite.esbuild.jsx: 'automatic'`
   in `astro.config.mjs` (pins the automatic runtime for every .tsx regardless
   of which tsconfig esbuild discovers).
3. **Cloudflare adapter breaks the static Pages model under v6.** With an
   adapter wired, Astro 6 emits the Workers layout (`dist/server/.prerender` +
   `dist/client` + an `ASSETS` binding — which wrangler additionally rejects
   as a reserved Pages name), so `wrangler pages deploy dist` gets no
   `dist/index.html`. The hub is a static Pages site; the adapter is
   server-runtime-only. Fix: adapter removed from `astro.config.mjs` (kept
   installed at latest per the research path for a future Workers move);
   documented in a config comment.
4. **Stale deploy pointer.** My intermediate adapter build wrote
   `.wrangler/deploy/config.json` → `dist/client/wrangler.json` (deleted with
   the static rebuild) which made `wrangler pages deploy` fail. Removed the
   stale pointer (copy preserved at `/tmp/opencode/wrangler-deploy-config.stale.json`).

## Pre-existing issues (left alone, per runbook)

- `astro check` failure: `@astrojs/check@0.9.10` peers typescript `^5||^6`,
  box has TS `7.0.2` (language-server × TS 7) — pre-existing, BUILD is the
  gate, not fixed. (pnpm `peers check` warning for apps/p31ca is exactly this.)
- `markdown.rehypePlugins` deprecation warning (rehype-mermaid-lite) — a
  warning in v6, not an error; porting to `unified({...})` is a follow-up.
- Zod rollup annotation warnings in the build log — benign comment-stripping
  warnings from zod@4.6.5 internals.

## Verification evidence

- **Prebuild:** green — comment gate clean (0 HTML comments in
  `src/**/*.astro`), ground-truth OK, content freshness/consistency OK,
  compliance mapping in sync, Substack bridge 2 posts.
- **Build:** `npm run build` → EXIT 0, `36 page(s) built in ~44s, Complete!`.
  dist inventory: **294 HTML files, exact parity with the pre-upgrade
  baseline** (zero missing, zero extra).
- **Static checks (`dist/index.html`):** hero title present (×2);
  3 islands; only `<!--astro:end-->` framework markers (no prose comments);
  `ClientRouter` chunk present; `sitemap.xml`, `404.html`, `blog/rss.xml`
  present; Tailwind v4 output verified (`@layer theme,base,components,
  utilities`, `.text-hubRose\/90` → `var(--color-hubRose)`).
- **Deploy:** `npm run deploy` → Success, 547 files, deployment
  `78ada870.p31ca.pages.dev` → live p31ca.org.
- **Live probe (Playwright, chromium from ~/.cache/ms-playwright; script
  `/tmp/opencode/p31ca-probe.mjs`): 30/30 PASS** at 1280×900 and 390×844 —
  0 console errors, 0 page errors; `.posner-topbar`, `.command-fab`,
  `.devpanel__chip`, `canvas.starfield`, `.molecular-heart-layer` present;
  hero title "Ownable Tech Stack for Families That Build"; grids even
  (4-col delta=0px, 2-col delta=0px, collapsing to 1-col at 390); no leaked
  comment text; no rendered HTML comments.

## Rollback

If the live site regresses: `wrangler pages deploy` previous build
(Cloudflare Dashboard → Workers & Pages → p31ca → Deployments), and the
pre-upgrade lockfile state is recoverable from the pnpm store. All source
changes are additive and confined to `apps/p31ca/**` (plus the shared
workspace lockfile, which only re-resolved the p31ca importer's specs).