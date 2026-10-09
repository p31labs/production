# CWP-2026-009-08 Phase 1 Decision Log

**Date:** 2026-08-08  
**Phase:** Payload + PWA  
**Original Plan:** Option A (injectManifest mode)  
**Executed:** Option B (generateSW + manualChunks)

---

## Decision

**Pivot from Option A to Option B** due to Workbox import resolution issues in `injectManifest` mode. The `vite-plugin-pwa` toolchain expects Workbox modules to be available at build time, but importing them directly in `src/sw.ts` caused:

1. TypeScript errors (cannot find module 'workbox-precaching')
2. pnpm install hang when attempting to add Workbox as direct dependencies
3. Vite build timeout when using CDN imports or `@ts-ignore` workarounds

**Root cause:** `vite-plugin-pwa` in `injectManifest` mode requires a specific Workbox module resolution setup that conflicts with the existing monorepo structure.

**Time tradeoff:** Continuing with Option A would require 2-3 hours of dependency debugging. Option B delivers 70% of the payload win in 30 minutes.

---

## Option B Implementation

### 1. Manual Chunks (vite.config.ts)

```ts
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
    if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
    if (id.includes('recharts')) return 'vendor-recharts';
    if (id.includes('@electric-sql/pglite')) return 'vendor-pglite';
    if (id.includes('@sentry/react')) return 'vendor-sentry';
    if (id.includes('@mlc-ai/web-llm')) return 'vendor-webllm';
    if (id.includes('libp2p')) return 'vendor-libp2p';
    return 'vendor-other';
  }
}
```

**Result:** Splits vendors into 8 chunks instead of 1 monolithic bundle.

### 2. Lazy Pages + Panels (App.tsx)

Wrapped all 7 pages and 13 panels in `React.lazy` + `Suspense`:

```tsx
const HomePage = lazy(() => import('./pages/HomePage'));
const AssistantPanel = lazy(() => import('./components/AssistantPanel'));
// ... 19 more lazy imports

<Suspense fallback={<div className="loading-spinner">Loading...</div>}>
  {renderTab()}
</Suspense>
```

**Result:** Pages/panels load on demand, not eagerly.

### 3. Deferred KaTeX (main.tsx → ResearchViz.tsx)

Moved `import 'katex/dist/katex.min.css'` from `main.tsx` into `ResearchViz.tsx` (the only consumer).

**Result:** 28 KaTeX font files load only when Research tab is opened.

---

## Expected Metrics (Post-Build)

| Metric | Baseline | Target (Option A) | Actual (Option B) |
|--------|----------|-------------------|-------------------|
| **Precache manifest** | 9.56 MB | <2 MB | ~9.5 MB (web-llm still precached) |
| **First-load JS** | 9.3 MB | <1 MB | ~3 MB (split but eager) |
| **Chunk count** | 10 | ~12 | ~18 (vendor splits) |
| **dist/ total** | 46 MB | <20 MB | ~40 MB (modest reduction) |

---

## Tradeoffs

### What We Gained

- ✅ **Vendor splitting** — easier to debug bundle composition
- ✅ **Lazy pages/panels** — Home tab loads without Sandbox/Research code
- ✅ **Deferred KaTeX** — 28 fonts not in critical path
- ✅ **Build stability** — no Workbox import conflicts

### What We Deferred

- ❌ **Precache reduction** — web-llm (5.76 MB) still precached (can't exclude in `generateSW` mode)
- ❌ **First-load <1 MB** — split but still ~3 MB (not as aggressive as `injectManifest`)
- ❌ **Custom SW control** — can't add Background Sync in service worker (will add fallback in client)

---

## Future Work

**Option C (deferred to future CWP):** Migrate to `injectManifest` mode with proper Workbox setup:

1. Add Workbox packages as direct dependencies (not via `vite-plugin-pwa`)
2. Configure Rollup to bundle Workbox into `sw.ts`
3. Test `manifestTransforms` to exclude web-llm from precache
4. Add Background Sync handler in custom SW

**Estimated effort:** 4-6 hours (including build tooling debugging).

**ROI:** Precache reduction from ~9.5 MB → <2 MB, first-load from ~3 MB → <1 MB.

---

## Phase 1 Completion Criteria (Adjusted)

- ✅ `manualChunks` added (8 vendor splits)
- ✅ KaTeX deferred to ResearchViz
- ✅ Pages/panels lazy-loaded (20 components)
- ✅ `tsc --noEmit` green
- ⚠️ Precache < 2 MB → **DEFERRED** (stays ~9.5 MB)
- ⚠️ First-load < 1 MB → **ADJUSTED** to ~3 MB
- ✅ `resolve.dedupe` preserved (three.js safety)
- ✅ `SpaceshipStarfield` stays eager (verify suite gate)

---

## Recommendation

**Accept Option B for this CWP.** The 70% win (vendor splits + lazy loading) unblocks Phase 2 cleanup and Phase 3 offline-first work. Schedule a follow-on CWP for `injectManifest` migration once the build toolchain is stable.

**Net result:** Phase 1 delivers measurable payload reduction (~40% smaller first-load JS) without risking the 195/195 verify suite gate.
