# P31 Shell — Baseline Metrics (Pre-CWP-2026-009-08)

**Captured:** 2026-08-08  
**Commit:** 3afe1ee  
**Purpose:** Establish measurement baseline before payload/cleanup/offline polish.

---

## Build Artifacts

| Metric | Value | Notes |
|--------|-------|-------|
| **dist/ total** | 46 MB | Includes sourcemaps (20 MB) |
| **dist/ non-sourcemap** | 27 MB | Actual deployed assets |
| **Precache manifest size** | 9.56 MB | 35 entries precached by Workbox |
| **First-load JS** | 9.3 MB | Total JS downloaded on first visit |
| **Chunk count** | 10 | No code splitting, all eager |

---

## Precache Breakdown (Top 10)

| Size | Asset | Type |
|------|-------|------|
| 5.76 MB | `assets/index-DT0Ab8E6.js` | web-llm (lazy but precached) |
| 3.01 MB | `assets/index-RfIJ8nR_.js` | Main app chunk |
| 0.40 MB | `assets/libp2pMesh-CaQe7nfV.js` | libp2p mesh |
| 0.09 MB | `assets/index-ZMsod5pp.css` | Styles |
| 0.03 MB | `assets/KaTeX_*.woff2` | KaTeX fonts (28 files, eager) |

---

## Code Metrics

| Metric | Value |
|--------|-------|
| **Total source files** | 152 |
| **Total LOC** | 19,397 |
| **App.tsx LOC** | 445 (9 useEffect hooks) |
| **Dead weight** | ~1,500 LOC (ship.backup/, empty dirs) |

---

## Test Coverage

| Metric | Value |
|--------|-------|
| **Unit test files** | 9 (`lib/__tests__`) |
| **Component tests** | 0 |
| **Verify suite checks** | 195 (scripts/verify-shell.cjs, 1,230 lines) |
| **Verify status** | ✅ 195/195 green |

---

## Known Issues

- **Precache bloat:** 5.76 MB web-llm chunk precached despite lazy import
- **No code splitting:** All pages/panels mount eagerly in App.tsx
- **KaTeX eager:** Fonts loaded in main.tsx for single consumer (ResearchViz)
- **Volatile sync queue:** Mesh writes in-memory, lost on disconnect
- **Monolithic verify suite:** 1,230-line single file, hard to extend

---

## Target State (Post-CWP)

| Metric | Target | Strategy |
|--------|--------|----------|
| **dist/ total** | <20 MB | `injectManifest` + vendor splitting |
| **Precache manifest** | <2 MB | Exclude web-llm, runtime cache on demand |
| **First-load JS** | <1 MB | React.lazy + manualChunks |
| **Verify suite** | 210/210 green | Split into 22 modules, add T/U/V sections |
| **Offline durability** | Zero write loss | PGLite outbox + Background Sync |
