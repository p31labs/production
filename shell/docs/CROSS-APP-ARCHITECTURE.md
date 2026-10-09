# P31 Cross-App Architecture — Unified Reference

**Version:** 1.0.0  
**Last Updated:** 2026-08-12  
**Status:** Production (v1.0.0 — "The Cage Holds")

---

## 1. High-Level Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER / CLIENT                              │
│                                                                         │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │   P31 Sovereign Shell   │    │    Spaceship Earth      │            │
│  │   (p31-shell Worker)    │◄──►│   (Pages Static App)    │            │
│  │                         │    │                         │            │
│  │  ┌─────────────────┐    │    │  ┌─────────────────┐    │            │
│  │  │ React SPA        │    │    │  │ React SPA       │    │            │
│  │  │ - 9 surfaces     │    │    │  │ - 3D dome       │    │            │
│  │  │ - Command Palette│    │    │  │ - HUD overlays  │    │            │
│  │  │ - MCP Explorer   │    │    │  │ - Dataset layer │    │            │
│  │  └────────┬────────┘    │    │  └────────┬────────┘    │            │
│  │           │             │    │           │             │            │
│  │  ┌────────▼────────┐    │    │  ┌────────▼────────┐    │            │
│  │  │ Zustand Stores   │    │    │  │ Zustand Stores   │    │            │
│  │  │ - useAppStore    │    │    │  │ - shipStore      │    │            │
│  │  │ - useShellStore  │    │    │  │ - datasetStore   │    │            │
│  │  │ - useThemeStore  │    │    │  │ - sovereignStore │    │            │
│  │  └────────┬────────┘    │    │  └────────┬────────┘    │            │
│  │           │             │    │           │             │            │
│  │  ┌────────▼────────┐    │    │  ┌────────▼────────┐    │            │
│  │  │ useCrossAppState │    │    │  │ useCrossAppState │    │            │
│  │  │ (BroadcastCh +   │    │    │  │ (BroadcastCh +   │    │            │
│  │  │  localStorage +  │    │    │  │  localStorage +  │    │            │
│  │  │  HTTP 5s poll)   │    │    │  │  HTTP 5s poll)   │    │            │
│  │  └─────────────────┘    │    │  └─────────────────┘    │            │
│  └─────────────────────────┘    └─────────────────────────┘            │
│           │                             │                                 │
│           │   Cross-App State Sync      │                                 │
│           │   (BroadcastChannel +        │                                 │
│           │    localStorage + HTTP)      │                                 │
│           │                             │                                 │
└───────────┼─────────────────────────────┼─────────────────────────────────┘
            │                             │
            ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                                  │
│                                                                         │
│  ┌─────────────────────────┐         ┌─────────────────────────┐        │
│  │  p31-shell Worker       │         │  spaceship-relay Worker │        │
│  │  (Edge Runtime)         │         │  (Edge Runtime)         │        │
│  │                         │         │                         │        │
│  │  Routes:                │         │  Routes:                │        │
│  │  - GET  /api/health     │         │  - GET  /health        │        │
│  │  - GET  /api/duna/stats │         │  - GET  /api/spaceship-│        │
│  │  - GET  /api/shell-state│◄───────►│         state          │        │
│  │  - POST /api/shell-state│  Cross- │  - POST /api/spaceship-│        │
│  │  - GET  /api/status     │  app    │         state          │        │
│  │  - POST /mcp            │  state  │  - GET  /api/status    │        │
│  │  - OPTIONS /mcp         │  sync   │  - POST /session/start │        │
│  │  - ASSETS.fetch (SPA)   │         │  - POST /session/beat  │        │
│  │                         │         │  - WS   /ws (signaling)│        │
│  │  Security:              │         │  - OPTIONS /* (CORS)   │        │
│  │  - HSTS                 │         │                         │        │
│  │  - CSP (enforced)       │         │  Security:             │        │
│  │  - CORS allowlist       │         │  - HSTS                │        │
│  │  - Permissions-Policy   │         │  - CSP (report-only)   │        │
│  │                         │         │  - CORS allowlist       │        │
│  └─────────────────────────┘         └─────────────────────────┘        │
│            │                                         │                   │
│            │   Static Assets                         │   KV + D1           │
│            │   (dist/)                               │   (telemetry)       │
│            ▼                                         ▼                   │
└─────────────────────────────────────────────────────────────────────────┘
            │
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                                  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Federation   │  │ Love Ledger  │  │  Status      │  │ Gateway     │  │
│  │ Bridge       │  │ Worker       │  │  Worker      │  │ (x402)      │  │
│  │ (DID/VC)     │  │ (D1 + LOVE)  │  │  (D1 health) │  │ (MCP toll)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
│                                                                         │
│  + p31-design-mcp, p31-justice-hub, bros, dads, crypto-mcp, ...       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cross-App State Flow

### 2.1 Sync Mechanisms (3-tier)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CROSS-APP STATE SYNC                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Tier 1: Same-Browser / Same-Tab                                   │
│  ───────────────────────────────────────                            │
│  BroadcastChannel('p31-cross-app-state')                            │
│  - Instant sync between Shell ↔ Spaceship tabs                     │
│  - Payload: { spoons, sensory, dataset, source, timestamp }        │
│                                                                     │
│  Tier 2: Same-Device / Cross-Session                               │
│  ─────────────────────────────────────────                         │
│  localStorage (key: 'p31-cross-app-state')                         │
│  - Persists across tab closes / browser restarts                   │
│  - Hydrated on app boot                                            │
│                                                                     │
│  Tier 3: Cross-Device / Remote                                     │
│  ─────────────────────────────────────────                         │
│  HTTP Polling (5s interval, configurable)                          │
│  - Shell → GET https://spaceship-earth.pages.dev/api/spaceship-state│
│  - Spaceship → GET https://p31-shell.trimtab-signal.workers.dev/    │
│                api/shell-state                                     │
│  - In-memory per-instance stores (Worker RAM)                      │
│  - Future: Durable Objects / KV for persistent cross-instance sync │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 State Schema

```typescript
interface CrossAppState {
  spoons: number;           // 0–5 spoon level
  sensory: {
    muted: boolean;
    calm: boolean;
    warmLight: boolean;
    font: 'standard' | 'hyperlegible';
    textScale: 'standard' | 'comfort';
  };
  dataset?: string;         // Active dataset ID
  source?: string;          // Active source key
  timestamp: number;        // Unix ms
}
```

---

## 3. UI Signal Map

| App | Component | Signal | Data Flow |
|-----|-----------|--------|-----------|
| **Spaceship Earth** | `HUDShell.tsx` (top-right pill) | `shell: X/5` | Reads `crossState.spoons` from `useCrossAppState` |
| **Shell** | `CockpitHUD.tsx` (top-right badge) | `ship: X/5` | Reads `crossState.spoons` from `useCrossAppState` |
| **Shell** | `CommandPalette.tsx` | 3 cross-app tools | `cross-app:spaceship-state`, `cross-app:load-personal`, `cross-app:status` |

---

## 4. Security Header Matrix

| Header | Shell (p31-shell) | Spaceship (spaceship-earth) |
|--------|-------------------|----------------------------|
| `Strict-Transport-Security` | ✅ `max-age=31536000; includeSubDomains; preload` | ✅ Same |
| `X-Content-Type-Options` | ✅ `nosniff` | ✅ Same |
| `X-Frame-Options` | ✅ `DENY` | ✅ Same |
| `Referrer-Policy` | ✅ `strict-origin-when-cross-origin` | ✅ Same |
| `Permissions-Policy` | ✅ `geolocation=(), microphone=(), camera=(), payment=()` | ✅ Same |
| `Content-Security-Policy` | ✅ **Enforced** (Worker + _headers) | ✅ Report-Only (Pages _headers) |
| `CORS` | ✅ Exact origin allowlist (no wildcard + credentials) | ✅ Same |
| Sourcemaps | ✅ Disabled (`sourcemap: 'hidden'`) | ✅ Same |

### CSP Directives (Shell — Enforced)

```
default-src 'self'
script-src 'self' 'wasm-unsafe-eval'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' data: https://fonts.gstatic.com
img-src 'self' data: https: blob:
connect-src 'self' https://api.p31ca.org https://mcp-x402-gateway.p31ca.org https://p31-design-mcp.trimtab-signal.workers.dev
worker-src 'self' blob:
frame-src 'self' blob:
object-src 'none'
base-uri 'self'
```

---

## 5. Deployment Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  1. tsc     │────►│  2. vitest  │────►│  3. vite    │────►│  4. wrangler│
│  --noEmit   │     │  run        │     │  build      │     │  deploy     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Type-check         Unit tests         Bundle + PWA         Live deploy
  (both apps)        (224+ tests)       (dist/)              (Worker + Pages)
```

### Commands

```bash
# Shell (Worker + SPA)
cd /home/p31/production/shell
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
npx wrangler deploy

# Spaceship Earth (Pages)
cd /home/p31/production/packages/spaceship-earth
npx tsc --noEmit
npx vitest run
npx vite build
npx wrangler pages deploy dist --project-name=spaceship-earth --commit-dirty=true
```

---

## 6. File → Component → Store → API Map

### Shell

| File | Component | Store | API |
|------|-----------|-------|-----|
| `src/App.tsx` | Root, tab router, overlays | `useAppStore`, `useShellStore` | `/api/shell-state`, `/api/status` |
| `src/components/Topbar.tsx` | Header, spoon dial, drawer toggle | `useShellStore` | — |
| `src/components/HeaderDrawer.tsx` | Surface tab selector | `useAppStore`, `useShellStore` | — |
| `src/components/CommandPalette.tsx` | ⌘K fuzzy search | `useShellStore` | `/mcp` (tools) |
| `src/components/CockpitHUD.tsx` | 3D dome HUD | `useCrossAppState` | `/api/spaceship-state` |
| `src/hooks/useCrossAppState.ts` | Cross-app state sync | `BroadcastChannel` + `localStorage` | `/api/shell-state` |

### Spaceship Earth

| File | Component | Store | API |
|------|-----------|-------|-----|
| `src/App.tsx` | Root, Canvas, HUD | `useShipStore`, `useSovereignStore` | `/api/spaceship-state`, `/api/status` |
| `src/cockpit/OuterDome.tsx` | Geodesic shell (480 edges) | `useShipStore` | — |
| `src/hud/HUDShell.tsx` | HUD container + CrossAppIndicator | `useCrossAppState` | `/api/shell-state` |
| `src/hooks/useCrossAppState.ts` | Cross-app state sync | `BroadcastChannel` + `localStorage` | `/api/spaceship-state` |

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Worker + Static Assets** (Shell) | Single deployment unit; edge logic + SPA served from one Worker |
| **Pages + Separate Worker** (Spaceship) | Pages for static hosting efficiency; separate Worker for relay/signaling |
| **In-memory state stores** | Simple, fast; future migration to Durable Objects for cross-instance persistence |
| **5s HTTP polling** | Reliable cross-device sync without WebSocket complexity |
| **BroadcastChannel + localStorage** | Zero-dependency same-browser sync; works across tabs |
| **CSP Report-Only → Enforced** | Phased rollout: monitor first, enforce when clean |
| **require-trusted-types-for removed** | App uses `innerHTML` in React; Trusted Types policy not yet implemented |

---

## 8. Quick Reference

### Live URLs

| App | URL | Status |
|-----|-----|--------|
| P31 Sovereign Shell | https://p31-shell.trimtab-signal.workers.dev | ✅ Live |
| Spaceship Earth | https://spaceship-earth.pages.dev | ✅ Live |
| Federation Bridge | https://federation.p31ca.org | ✅ Live |
| Status Dashboard | https://status.p31ca.org | ✅ Live |

### Verify Commands

```bash
# Shell (run twice before deploy)
NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs

# Spaceship (headless Chrome)
NODE_PATH=/home/p31/node_modules node scripts/verify-spaceship.cjs

# Cross-app sync
node scripts/cross-app-sync.cjs

# E2E smoke
node scripts/e2e-smoke.cjs
```

### Test Counts

| Suite | Tests | Status |
|-------|-------|--------|
| Shell vitest | 21 | ✅ Pass |
| Spaceship vitest | 224 | ✅ Pass |
| Shell verify | 186/187 | ✅ Pass |
| Cross-app sync | 15/15 | ✅ Pass |

---

**Maintainer:** P31 Labs — trimtab-signal  
**Next Review:** 2026-08-19
