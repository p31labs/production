# P31 Sovereign Shell — Manufacturer's Technical Manual

**Version:** 1.0.0
**Document ID:** P31-SHELL-MAN-001
**Classification:** Technical — Manufacturer / OEM
**Last Updated:** 2026-08-12
**Deployment:** https://p31-shell.trimtab-signal.workers.dev
**Maintainer:** P31 Labs — trimtab-signal

---

## 1. Product Identity

### 1.1 Overview
The P31 Sovereign Shell is a Cloudflare Workers-edge application providing a
sovereign identity, mesh-networked, and AI-augmented user interface for the P31
ecosystem. It is the primary visual and interaction layer for operators,
bonding family members, and autonomous agents.

### 1.2 Versioning & Lineage

| Attribute | Value |
|---|---|
| Package | `p31-shell` |
| Package Manager | pnpm |
| Runtime | Vite + React 19 + Cloudflare Workers |
| PWA | Yes (`vite-plugin-pwa`, Workbox) |
| Deployment URL | https://p31-shell.trimtab-signal.workers.dev |
| Worker Name | `p31-shell` |
| Compatibility Date | 2026-07-18 |

### 1.3 Contract Surfaces

| Surface | Type | Notes |
|---|---|---|
| Worker | Cloudflare Worker | Edge routing, health endpoints, ASSETS binding |
| SPA | Vite-built React app | Served via Worker `ASSETS` binding |
| MCP Server | JSON-RPC 2.0 over HTTP | `POST /mcp` |
| WebMCP | Chrome Origin Trial | `navigator.modelContext` (expires 2026-11-16) |
| PWA | Service Worker | Workbox, auto-update, offline |
| Local Storage | zustand/persist | Theme, panels, effects, shell state |
| IndexedDB | `p31-shell-db` (v3) | Threads, notifications, memory, goals, PQC keys |
| PGLite | `idb://p31-shell` | Ledger table (historical state) |
| Sentry | `@sentry/react` | Traces sample rate 0.01 |

---

## 2. Architecture & Data Flow

### 2.1 Component Hierarchy (Top-Level)

```
App
├── ShellProviders (stores, db, mesh, identity, ledger)
├── SpaceshipStarfield (background r3f)
├── Topbar
│   ├── SpoonIcon (SVG)
│   ├── Spoons dial (1–5 + Rest)
│   └── Drawer/Hub/Palette toggles
├── HeaderDrawer (NAV_ITEMS)
├── main.viewport
│   ├── HomePage / BondingPage / DashboardPage / SandboxPage
│   ├── CockpitView → SpaceshipEarth (r3f canvas)
│   ├── ProfilePage
│   └── ResearchPage
├── Overlays (conditional)
│   ├── CommandPalette (⌘K)
│   ├── AssistantPanel (WebLLM + Cloud)
│   ├── AkinatorPanel (PHOS oracle)
│   ├── IdentityPanel / MeshStatusPanel / NodeZeroPanel
│   ├── JusticePanel / SBTPanel / MarketplacePanel
│   ├── McpExplorer / MemberDashboard / NotificationHub
│   ├── InsightsPanel / PassportPanel
│   └── RestOverlay (crisis / full-screen rest)
├── FloatingWindow (sandbox / draggable)
├── Toast (auto-dismiss 3s)
├── #a2ui-container (A2UI host)
├── SW update toast
└── sentryErrorBoundary
```

### 2.2 State Management

#### 2.2.1 Stores (`src/store/`)

| Store | Persist Key | Purpose |
|---|---|---|
| `useAppStore` | `shell-storage` | Tab state (home / bonding / dashboard / sandbox / cockpit / profile / notifications / research) |
| `useShellStore` | zustand persist | Notifications, assistant threads, panel opens, local mode |
| `useThemeStore` | `p31-theme` | 5 themes × 3 ages — OKLCH tokens |
| `useSensoryStore` | `p31-sensory` | Muted, warm light, font, text scale, calm/focus/simple/task |
| `useEffectsStore` | `p31-effects-v1` | Star density/speed, warm stars, dome accent, comet trails, aurora, quantum |
| `usePanelStore` | `p31-panels-v2` | 6 telemetry panels (left: spoon/larmor/node; right: care/ledger/centaur) |
| `useHistoryStore` | in-memory | Undo/redo (spoons, theme, age, panel) — max 30 entries |

#### 2.2.2 Store-to-DOM Contract
Sensory/theme stores write data-attributes to `<html>`:

| Attribute | Source |
|---|---|
| `data-theme` | `useThemeStore.theme` |
| `data-age` | `useThemeStore.age` |
| `data-spoons` | `useAppStore.spoons` |
| `data-calm` | `useSensoryStore.calm` |
| `data-focus` | `useSensoryStore.focus` |
| `data-simple` | `useSensoryStore.simple` |
| `data-task` | `useSensoryStore.task` |
| `data-font` | `useSensoryStore.font` |
| `data-text-scale` | `useSensoryStore.textScale` |

#### 2.2.3 Persistence Key Inventory

| Key | Writer | Purpose |
|---|---|---|
| `shell-storage` | `useAppStore` | Current tab |
| `p31-theme` | `useThemeStore` | Theme + age |
| `p31-sensory` | `useSensoryStore` | Sensory preferences |
| `p31-effects-v1` | `useEffectsStore` | Effects settings |
| `p31-panels-v2` | `usePanelStore` | Panel collapsible states |
| `p31-tailscale` | `lib/tailscale.ts` | Tailscale config |
| `p31-imported-identity` | ProfilePage | Imported identity backup |
| `p31-shell-did` | `lib/identity.ts` | Current DID |
| `DID_STORAGE_KEY` | `lib/memory.ts` | Legacy DID fallback |
| `p31-floating-window-*` | FloatingWindow | Position/size per sandbox |

---

## 3. Fabrication (Build Pipeline)

### 3.1 Toolchain

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22+ | Runtime |
| pnpm | 9+ | Package manager |
| TypeScript | 5.x | Type checking |
| Vite | 5.x | Bundler + dev server |
| Vitest | 2.x | Unit tests |
| Wrangler | 3.x | Cloudflare deployment |

### 3.2 Build Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Type check only
pnpm typecheck

# Production build → dist/
pnpm build

# Unit tests (Vitest, jsdom)
pnpm test

# Preview production build
pnpm preview

# Deploy to Cloudflare Workers
pnpm run deploy

# Verify suite (Playwright, run against the live deploy)
NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs
```

### 3.3 Build Outputs

| Artifact | Approx size | Notes |
|---|---|---|
| `dist/index.html` | — | Entry point |
| `dist/assets/*.js` | ~270–280 KB (gzip) | Vendor + app chunks |
| `dist/assets/*.css` | — | Tailwind + global |
| `dist/sw.js` | — | Workbox service worker |

### 3.4 Bundle Budgets

| Bundle | Approx gzip |
|---|---|
| vendor-react | ~43 KB |
| vendor-three | ~116 KB |
| index | ~111 KB |
| **Total** | **~270–280 KB** |

---

## 4. Deployment & Configuration

### 4.1 Wrangler Configuration (`wrangler.toml`)

```toml
name = "p31-shell"
main = "src/worker.ts"
compatibility_date = "2026-07-18"

[assets]
directory = "./dist"
binding = "ASSETS"

[observability]
enabled = true
```

### 4.2 Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_SENTRY_DSN` | Worker secret | Sentry error tracking |
| `VITE_RELAY_URL` | Worker secret | Mesh relay endpoint |
| `VITE_LLM_KEY` | Worker secret | (optional) LLM API key |

### 4.3 Worker Routes (`src/worker.ts`)

| Method | Path | Handler |
|---|---|---|
| GET | `/api/health` | `{ status: 'ok', version: '1.0', service: 'p31-shell' }` |
| GET | `/api/duna/stats` | `{ members: 1, active: 0, target: 100 }` |
| GET | `/api/shell-state` | Cross-app state snapshot (in-memory `shellStateStore`) |
| POST | `/api/shell-state` | Merge cross-app state into in-memory store |
| GET | `/api/status` | Dependency health (checks `spaceship-earth.pages.dev/api/health`) |
| GET | `/mcp/health` | `{ status: 'ok', version: '1.0' }` |
| POST | `/mcp` | JSON-RPC 2.0 — `lib/mcpServer.handleMcpRequest` (dynamic import) |
| OPTIONS | `/mcp` | CORS preflight |
| * | `/*` | `ASSETS.fetch(request)` (SPA fallback) |

### 4.4 Cross-App State (Phase 7-C)

**Status:** Production (v1.0.0 — "The Cage Holds")

The Shell and Spaceship Earth share state in real-time via a 3-tier sync mechanism:

**Tier 1: Same-Browser (BroadcastChannel)**
- Channel: `p31-cross-app-state`
- Instant sync between Shell ↔ Spaceship tabs
- Payload: `{ spoons, sensory, dataset, source, timestamp }`

**Tier 2: Same-Device (localStorage)**
- Key: `p31-cross-app-state`
- Persists across tab closes / browser restarts
- Hydrated on app boot

**Tier 3: Cross-Device (HTTP Polling)**
- Shell → `GET https://spaceship-earth.pages.dev/api/spaceship-state` (every 5s)
- Spaceship → `GET https://p31-shell.trimtab-signal.workers.dev/api/shell-state` (every 5s)
- In-memory per-instance stores (Worker RAM)
- Future: Durable Objects / KV for persistent cross-instance sync

**Hook:** `src/hooks/useCrossAppState.ts` — `createCrossAppState()` initializes the sync pipeline.

**UI Signals:**

| App | Component | Signal |
|-----|-----------|--------|
| Shell | `CockpitHUD.tsx` (top-right badge) | `ship: X/5` — spaceship's spoon level |
| Spaceship | `HUDShell.tsx` (top-right pill) | `shell: X/5` — shell's spoon level |
| Shell | `CommandPalette.tsx` | 3 cross-app tools (see §5.4.3) |

**Command Palette Tools (Cross-App):**

| Command | Purpose |
|---------|---------|
| `cross-app:spaceship-state` | Fetch spaceship's current state JSON |
| `cross-app:load-personal` | Send personal-constellation dataset to spaceship |
| `cross-app:status` | Unified health check for both apps |

### 4.5 CSP Headers (Production)

Set via `public/_headers` + Worker `ASSETS`:

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.p31ca.org https://mcp-x402-gateway.p31ca.org https://p31-design-mcp.trimtab-signal.workers.dev https://federation.p31ca.org https://zenodo.org; frame-src 'none'; object-src 'none'; base-uri 'self'; require-trusted-types-for 'script'
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.p31ca.org https://mcp-x402-gateway.p31ca.org https://p31-design-mcp.trimtab-signal.workers.dev https://federation.p31ca.org https://zenodo.org; frame-src 'none'; object-src 'none'; base-uri 'self'; require-trusted-types-for 'script'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

**CSP Layers:**
- Shell: **Enforced** (Worker + `_headers`)
- Spaceship: **Report-Only** (`public/_headers`)

### 4.6 PWA Manifest

- `registerType: 'prompt'`, `injectRegister: null` (manual).
- Workbox runtime caching: Google Fonts CacheFirst, CDN assets.
- Automatic SW update prompt via `useRegisterSW`.

---

## 5. Assembly & Integration

### 5.1 Module Wiring

#### 5.1.1 Main Entry (`src/main.tsx`)

```tsx
// 1. Pre-paint theme restore (read localStorage 'p31-theme')
// 2. Sentry.init({ tracesSampleRate: 0.01 })
// 3. configure({ profilePrefix: 'shell:' })  — sovereign core
// 4. createRoot(root).render(<ErrorBoundary><App /></ErrorBoundary>)
```

#### 5.1.2 App Root (`src/App.tsx`) — Bootstrap Order

1. `registerShellCommands()` — command registry.
2. `requestPersistentStorage()`.
3. `getDB()` + `runMigrations(db)` — PGLite setup.
4. `connectLedgerAppender()` — ledger table.
5. `ensureDid()` — identity bootstrap.
6. `getLedgerForToday(did)` + `hydrateFromLedger(rows)` — restore history.
7. `beforeinstallprompt` → expose `__p31_installPrompt`.
8. `ping()` + `listTools()` — MCP health.
9. `connectMesh()` + `connectKenosisMesh()` — mesh onboarding.
10. `createCrossAppState()` — initialize cross-app state sync (Phase 7-C).
11. Store subscriptions → DOM attributes.
12. Undo/redo subscriptions; spoon-forecast notifier (10-minute dip-ahead);
    mobile swipe navigation; double-tap assistant toggle; crisis dismiss.
13. Render layout + overlays.

Verify-gated hooks (exposed only when `__P31_VERIFY__` is set):

| Hook | Purpose |
|---|---|
| `__p31_assistantMode` | Assistant mode switcher |
| `__p31_insights` | Insights panel control |
| `__p31_pwa` | PWA update trigger |
| `__p31_haptics` | Haptic feedback control |
| `__p31_runCommand` | Command execution |
| `__p31_quantum` | Quantum FX toggle |
| `__p31_fxLayers` | Cosmos FX toggle |
| `__p31_larmor` | Larmor oscillator state |

### 5.2 Identity & Cryptography

| Module | Purpose |
|---|---|
| `lib/identity.ts` | `did:key` Ed25519; `p31-shell-did` localStorage |
| `lib/keri.ts` | KEL inception/rotation/delegation, CESR encoding |
| `lib/pqc.ts` | ML-DSA-65 (via `@noble/post-quantum`), ledger-bridge |
| `lib/memory.ts` | IndexedDB `p31-shell-db` v3 — threads, memory, goals, PQC keys |

### 5.3 Mesh Integration (`lib/mesh/`)

| File | Purpose |
|---|---|
| `mesh.ts` | Verify hooks, heartbeat (Ed25519 + ML-DSA-65 signature) |
| `libp2pMesh.ts` | libp2p WebRTC + Noise, `BROS_SIGNALING` endpoint |
| `sync.ts` | 500 ms batched sync (spoons, unread, notifications) |

Exposed globals: `__p31_meshSync.peers`, `__p31_meshTransport`, `__p31_meshVerify`,
`__p31_meshHeartbeat.sign(ts)`, `__p31_meshKEL`.

### 5.4 MCP / WebMCP Agent Layer

#### 5.4.1 MCP Server (`lib/mcpServer.ts`)
- JSON-RPC 2.0, `protocolVersion: '2026-07-28'`.
- Tools from `commands.getOpenAIFunctionDefinitions()`.
- Endpoints: `POST /mcp` (JSON-RPC), `GET /mcp/health`.

#### 5.4.2 MCP Registry (`lib/mcpRegistry.ts`)
Registered server families (subject to the honest tool count — see §11.1):

| Server | Purpose |
|---|---|
| shell | Shell commands (Ed25519 + ML-DSA-65 verified) |
| design-mcp | Design tokens, layout |
| justice | Justice hub evidence |
| marketplace | Marketplace operations |
| crypto | ML-DSA-65, X-Wing KEM, SD-JWT, Taler, x402 |
| bros | Persona tools |

#### 5.4.3 WebMCP (`hooks/useWebMCP.ts`)
- Chrome Origin Trial tokens: `p31ca.org`, `phosphorus31.org`.
- Expires: 2026-11-16 (Chrome 149–156).
- Tools: `shell:openPanel` (dispatches `shell:openPanel` CustomEvent),
  `shell:setSpoons` (updates spoon level).
- Globals: `__p31MCPTools`, `__p31MCPExec`.

### 5.5 Dashboard / HUD Boards

#### 5.5.1 Cockpit View (SpaceshipEarth.tsx)
- `@react-three/fiber` Canvas; dome geometry: icosahedron geodesic
  (detail 1/2 by device).
- `DOME_RADIUS: 3.2`, `INNER_RADIUS: 2.7`, `PORT_COUNT: 40`,
  `SEGMENTS_PER_EDGE: 14` (low) / `20` (high), `PIXEL_RADIUS: 0.018`,
  `PIXEL_GAP: 0.004`.
- Node orbs from port centroids (`SOURCE_NODE` mapping).
- Larmor oscillator (WebAudio, 172.35 MHz → 863 Hz).

#### 5.5.2 Telemetry Panels (`usePanelStore`)
- Left rail (0–2): Spoon Gauge, Larmor Engine, Node Inspector.
- Right rail (0–2): Proof of Care, Sovereign Ledger, Centaur Engine.

#### 5.5.3 NeoPixel Panel + Frame (shell)
> The right-rail "NeoPixel" panel (`data-panel="hardware"`,
> `RightHardwareHUD.tsx`) writes `useLedStore` (`p31-led-v1`, persisted) —
> modes, speed, brightness, primary/palette colors. The dome renders a port of
> spaceship-earth's ShaderMaterial `NeoPixelFrame` (`src/features/ship/
> NeoPixelFrame.tsx`, sized to the shell dome) that consumes that store; the
> shader math is byte-identical to spaceship-earth and always renders (no
> low-end gate). `uFrozen` dims the frame to gray during calm/rest. Hardware
> dispatch (Web Bluetooth → Node Zero) lives in spaceship-earth
> (`LedController` → `neoPixelBridge`). See §10.1 (E-01).

---

## 6. Interface Specifications

### 6.1 DOM Contract (`data-testid`)

| `data-testid` | Component | Purpose |
|---|---|---|
| `duna-board` | DunaBoard | HUD display |
| `system-board` | SystemBoard | Health display |
| `led-controller` | LedController | NeoPixel controls (spaceship-earth) |
| `tetra-visualizer` | TetrahedronVisualizer | Research viz |
| `spoon-tide-legend` | DashboardPage | Spoon-tide legend |
| `sparkline-caption` | DashboardPage | Sparkline caption |
| `spoon-gauge` | SpoonGauge | Spoon budget gauge |
| `profile-export` | ProfilePage | Identity export button |
| `profile-import` | ProfilePage | Identity import button |
| `rotate-pqc` | ProfilePage | Rotate ML-DSA-65 button |

### 6.2 Window Globals (`window.__p31*`)

| Global | Source | Purpose |
|---|---|---|
| `__p31MCPTools` | webmcp.ts | Registered MCP tools |
| `__p31MCPExec` | webmcp.ts | MCP execution interface |
| `__p31_meshSync` | mesh/libp2pMesh.ts | Mesh peer & broadcast |
| `__p31_quantum` | QuantumFX.tsx | Quantum FX toggle |
| `__p31_fxLayers` | CosmosFX.tsx | Cosmos FX toggle |
| `__p31_larmor` | useLarmor.ts | Larmor oscillator state |
| `__p31_toggleLarmor` | useLarmor.ts | Toggle Larmor audio |
| `__p31_domeVertices` | DomeGeometry.tsx | Dome vertex data |
| `__p31_domeStructure` | DomeGeometry.tsx | Dome metadata |
| `__p31_domePosnerNodes` | DomeGeometry.tsx | Posner nodes |
| `__p31_led` | DomeGeometry.tsx | NeoPixel LED snapshot |
| `__p31_activeNode` | NodeActions.tsx | Active node ID |
| `__p31_voice` | useVoiceInput.ts | Speech recognition |
| `__p31_taskHistory` | cognitive.ts | Task history |
| `__p31_persistGoal` | cognitive.ts | Goal persistence |
| `__p31_runCommand` | commands.ts | Command execution |
| `__p31_nodeZero` | nodeZero.ts | Node Zero pairing |
| `__p31_meshVerify` | mesh.ts | Mesh verification |
| `__p31_meshHeartbeat` | mesh.ts | Mesh heartbeat signature |
| `__p31_meshKEL` | mesh.ts | Mesh KEL chain |
| `__p31_keri` | keri.ts | KERI operations |
| `__p31_insights` | insights/ | Insights panel |
| `__p31_haptics` | App.tsx | Haptic feedback |
| `__p31_effects` | useEffectsStore | Effects settings |
| `__p31_bonding` | bonding/ | Bonding state |
| `__p31_assistantMode` | App.tsx | Assistant mode |
| `__p31_analytics` | App.tsx | Analytics |
| `__p31_shellStore` | App.tsx | Shell store state |
| `__p31_projectNode` | DomeGeometry.tsx | Projection node |
| `__p31_mobile` | App.tsx | Mobile touch settings |
| `__p31_installPrompt` | App.tsx | PWA install prompt |
| `__p31_meshTransport` | mesh.ts | Transport type |
| `__p31_pwa` | App.tsx | PWA update trigger |
| `__P31_VERIFY__` | verify-shell.cjs | Verify-mode flag |

### 6.3 Custom Events

| Event | Dispatcher | Detail | Purpose |
|---|---|---|---|
| `shell:openPanel` | useWebMCP.ts | `{ panel: string }` | Open a panel by ID |
| `p31:shell-spoons` | Topbar.tsx | number (0–5) | Spoon level change |

### 6.4 MCP JSON-RPC Tools (Partial List)

| Tool | Category | Description |
|---|---|---|
| `spoons:set` | System | Set spoon level (1–5) |
| `crisis:check` | System | Crisis status |
| `grounding:54321` | Assistant | Grounding exercise |
| `meltdown:plan` | Assistant | Crisis de-escalation |
| `next:action` | Cognitive | Next action inference |
| `mesh:connect` | Mesh | Initiate mesh connection |
| `tailscale:status` | Mesh | Tailscale status |

---

## 7. Calibration & Tuning

### 7.1 Spoon System

| Spoon Level | Meaning | Visual |
|---|---|---|
| 0 | Rest / crisis | Full-screen RestOverlay |
| 1 | Low | Reduced motion, muted |
| 2 | Moderate | Default |
| 3 | Engaged | Full dome FX |
| 4 | High | All FX, Larmor active |
| 5 | Peak | Max brightness, speed |

- Forecast: 14-day spoon-tide, dip-ahead detection (≥3 of 14 days), cache 5 min.

### 7.2 Theme System (`useThemeStore`)

| Theme | Ages | Basis |
|---|---|---|
| garden | child / teen / adult | Green |
| ocean | child / teen / adult | Blue |
| aurora | child / teen / adult | Purple |
| zen | child / teen / adult | Neutral |
| volt | child / teen / adult | Amber |

Sensory transforms: `muted` → chroma × 0.45; `warmLight` → blend toward hue 60 @ 0.5.

### 7.3 Larmor Engine (`useLarmor.ts`)

| Parameter | Value |
|---|---|
| Base frequency | 172.35 MHz → 863 Hz (³¹P Larmor × 5) |
| Harmonic | 863 Hz · Φ⁻¹ |
| Gain range | 0.02–0.08 (coherence-coupled) |
| Waveform | Sine oscillator |

### 7.4 Dome Effects (`useEffectsStore`)

| Setting | Options | Default |
|---|---|---|
| `starDensity` | low / medium / high | medium |
| `starSpeed` | low / medium / high | medium |
| `warmStars` | boolean | false |
| `domeAccent` | boolean | true |
| `cometTrails` | boolean | true |
| `aurora` | boolean | true |
| `quantum` | boolean | true |

`calm` overrides all motion via `--p31-speed-factor`.

---

## 8. Testing & Quality Control

### 8.1 Verify Suite (`scripts/verify-shell.cjs`)

```bash
NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs
```

| Environment | Default | Purpose |
|---|---|---|
| `P31_VERIFY_BASE` | `https://p31-shell.trimtab-signal.workers.dev` | Deploy URL |
| `VISUAL_TEST` | unset | Enables visual regression checks |

Runtime counts (verified against the script's `check(` call graph — 195 tokens
in file, 1 function definition, 194 static invocations, 8 mutually-exclusive
branches):

| Mode | Checks Executed |
|---|---|
| Standard | 186 |
| `VISUAL_TEST=1` | 187 |

> **Note:** `docs/RUNBOOK.md` cites 154/155 — that figure is stale. The source
> of truth is `scripts/verify-shell.cjs` (186/187).

Sections:

| Section | Checks | Purpose |
|---|---|---|
| A | 12 | Repo preflight (file existence, configs) |
| B | 2 | Deploy fingerprint |
| C | 15 | App load + verify hooks |
| D | 2 | Navigate to Cockpit |
| E | 6 | Dome geometry |
| E2 | 3 | Dome structure (continued) |
| F | 7 | Node actions |
| G | 11 | HUD boards |
| H | 5 | Identity panel |
| I | 25 | Touch targets / mobile |
| J | 4 | Sandbox window |
| K | 5 | Sandbox:open |
| L | 6 | Sandbox persistence |
| M | 9 | Research panel |
| N | 3 | Notification hub |
| O | 2 | Profile panel |
| P | 8 | Crisis/rest overlay |
| Q | 3 | Spoon gauge |
| R | 63 | Dashboard gates |
| S | 3 | Visual regression (VISUAL_TEST only) |

Key gates (Dashboard): `data-testid="spoon-tide-legend"` (3 colors),
`data-testid="sparkline-caption"` (caption present), `color-scheme: dark`.

Key gates (Profile): Export Identity, Import Identity, Rotate ML-DSA-65, Show
full keys toggle.

Exit codes: 0 = pass; 1 = one or more checks failed; 2 = suite error.

Known flakes (do not chase):

- a2ui `.glass-card` mount gate (cold start).
- Posner-24O saw `24O=false` load timing.
- Zenodo feed returning 0 papers.
- PWA SW registration may flake on cold start — re-run verify.

### 8.2 Unit Suite (Vitest)

```bash
pnpm test
```

Unit tests live under `src/lib/__tests__/` (identity, cognitive, geodesic,
coherence, economy, cognitiveGate, zoneLog, zoneStore, tetra, …).
Shell: 21 unit tests. Spaceship Earth: 224 unit tests.

### 8.3 CI (`vitest` + `tsc --noEmit` + `wrangler deploy`)
`pnpm typecheck` (`tsc --noEmit`) and `pnpm test` (`vitest run`) must pass
before `pnpm run deploy` (`wrangler deploy`).

---

## 9. Operation & Maintenance

### 9.1 Health Endpoints

| Endpoint | Expected Response |
|---|---|
| `/api/health` | `{ status:'ok', version:'1.0', service:'p31-shell', timestamp:'…' }` |
| `/api/duna/stats` | `{ members:1, active:0, target:100 }` |
| `/mcp/health` | `{ status:'ok', version:'1.0' }` |

### 9.2 Sentry Monitoring
- DSN via `VITE_SENTRY_DSN` (Worker secret); traces sample rate 0.01.
- Captures React errors, network failures, MCP errors.

### 9.3 PWA Updates
- Auto-update via Workbox (`clientsClaim: true`); user prompt via
  `useRegisterSW` (`needRefresh` state); offline mode: cached assets +
  IndexedDB.

### 9.4 Database Migrations
- IndexedDB `p31-shell-db` v3. Stores: threads, notifications, memory,
  spoons-history, identity-keys, pqc-keys, goals. Migration: `runMigrations(db)`
  in App bootstrap.
- PGLite `idb://p31-shell`, table `ledger` (historical state). Appender:
  `connectLedgerAppender()` (INSERT on state change). Hydration:
  `getLedgerForToday(did)` → `hydrateFromLedger(rows)`.

---

## 10. Troubleshooting & Errata

### 10.1 Known Gaps (Current State)

| ID | Component | Issue | Resolution |
|---|---|---|---|
| E-01 | NeoPixel Panel (shell) | Right-rail "NeoPixel" panel was presentational only — local `useState`, not persisted, not wired to dome rendering, no `__p31_led` hook | **Resolved:** panel drives a ported spaceship-earth `NeoPixelFrame` shader (always rendered, no low-end gate) via persisted `useLedStore`; `__p31_led` hook exposed; hardware dispatch remains in spaceship-earth |
| E-02 | RUNBOOK.md verify counts | Cites 154/155; actual is 186/187 | Update RUNBOOK.md to match `scripts/verify-shell.cjs` |
| E-03 | Verify target | BASE default points at production; local runs require `P31_VERIFY_BASE` override | Add to deployment checklist |
| E-04 | `state-sync.js` | Referenced in older docs but not present in repo | Confirm with SRE; remove reference if legacy |
| E-05 | MCP tool count | Manifests occasionally overstate tool counts | Reconcile against `lib/mcpRegistry.ts` |

### 10.2 Common Failures

| Symptom | Likely Cause | Action |
|---|---|---|
| Verify suite fails Section C | Hooks not exposed — `__P31_VERIFY__` not set | Verify `addInitScript` in test runner |
| Verify suite flake on a2ui | Cold start / network | Re-run; known flake |
| Panel not opening | `shell:openPanel` event not dispatched | Check `useWebMCP` registration |
| Spoons not persisting | `useAppStore` hydration mismatch | Check localStorage `shell-storage` |
| Mesh peers 0 | Signaling server unreachable | Check `BROS_SIGNALING` URL |
| Larmor no audio | AudioContext suspended (needs user gesture) | Click to resume (Chrome policy) |

### 10.3 Errata — Verify Shell Count Reconciliation

Source: `scripts/verify-shell.cjs`

| Metric | Value |
|---|---|
| `check(` tokens (file) | 195 |
| Function definition (line 26) | −1 |
| Static invocations | 194 |
| Mutually-exclusive branches | −8 |
| **Standard runtime** | **186** |
| **VISUAL_TEST=1 runtime** | **187** |

Mutually-exclusive branches: Section A catch vs try; Section F `if` vs `else`
(3 each); Research dots `if` vs `else`; Section S visual runs only with
`VISUAL_TEST=1`.

---

## 11. Safety, Accessibility & Compliance

### 11.1 Accessibility (WCAG 2.2)

| Feature | Mechanism | Standard |
|---|---|---|
| Reduced motion | `data-calm` + `--p31-speed-factor` | WCAG 2.3.3 (Pause, Stop, Hide) |
| Spoon-adaptive disclosure | QuantumFX phases (low/mid/full) | WCAG 2.4.7 (Focus Visible) |
| Font scaling | `data-text-scale` (standard/comfort) | WCAG 1.4.4 (Resize Text) |
| High-contrast font | `data-font` (hyperlegible) | WCAG 1.4.6 (Enhanced Contrast) |
| Crisis/rest mode | RestOverlay (full-screen pause) | WCAG 2.2.2 (Pause, Stop, Hide) |
| Undo history | ⌘Z / Ctrl+Z + topbar chip | W3C COGA o4p02 |

### 11.2 Sensory Modes

| Mode | Effect |
|---|---|
| `calm` | Freezes all ship motion, reduces stars |
| `muted` | Chroma × 0.45 (desaturated colors) |
| `warmLight` | Amber tint (hue 60 @ 0.5) |
| `focus` | Hides non-essential UI |
| `simple` | Minimalist layout |
| `task` | Task-first UI, hides panels |

### 11.3 Privacy & Security

- Identity: `did:key` Ed25519 — all-local, no external key escrow.
- Cryptography: ML-DSA-65 (PQC) for signing, X-Wing KEM for encryption.
- Mesh: WebRTC-Direct (libp2p) — no central server after signaling.
- Data: all state persists locally (IndexedDB, localStorage).
- Telemetry: opt-in (`p31-telemetry='1'`) — no default tracking.

### 11.4 Compliance References

| Standard | Fulfillment |
|---|---|
| WCAG 2.2 Level AA | All sensory + keyboard requirements met |
| W3C COGA o1p04 / o4p02 | Task panel, undo history |
| GDPR (EU) | All data local; telemetry opt-in |
| COPPA (US) | Kids mode blocks telemetry |
| CWP-2026-014 | Telemetry script sourced from p31ca.org |

---

## 12. Appendices

### Appendix A: Command Quick Reference

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build → `dist/` |
| `pnpm typecheck` | TypeScript check only |
| `pnpm test` | Vitest unit tests |
| `pnpm run deploy` | `wrangler deploy` |
| `node scripts/verify-shell.cjs` | Playwright E2E suite |
| `NODE_PATH=… node scripts/verify-shell.cjs` | Verify with `NODE_PATH` override |
| `node scripts/validate-mcp-manifest.mjs` | Validate MCP tool manifest |
| `node scripts/deploy-person.sh` | Deploy persona variant |
| `node scripts/duna-counter.mjs` | DUNA counter helper |

### Appendix B: Data Dictionary — Key State Fields

| Field | Store | Type | Description |
|---|---|---|---|
| `tab` | useAppStore | Tab | Current bottom nav tab |
| `spoons` | useAppStore | 0–5 | Spoon level |
| `love` | useAppStore | number | LOVE balance |
| `notifications` | useShellStore | Notification[] | Notification queue |
| `assistantThreads` | useShellStore | Thread[] | Assistant threads |
| `panelOpen` | useShellStore | Record<string, boolean> | Panel open states |
| `theme` | useThemeStore | Theme | Current theme |
| `age` | useThemeStore | Age | Current age mode |
| `calm` | useSensoryStore | boolean | Reduced motion |
| `starDensity` | useEffectsStore | `'low'\|'medium'\|'high'` | Starfield density |

### Appendix C: Verify-Gate Matrix

| Gate ID | Section | Description | Testid / Hook |
|---|---|---|---|
| G-01 | A | package.json present | File existence |
| G-02 | A | vite config present | File existence |
| G-03 | A | wrangler config present | File existence |
| G-04 | C | `__p31_quantum` exposed | Window hook |
| G-05 | C | `__p31_fxLayers` exposed | Window hook |
| G-06 | D | Cockpit Canvas mounts | DOM presence |
| G-07 | E | Dome geometry vertices | `__p31_domeVertices` |
| G-08 | G | Duna board renders | `data-testid="duna-board"` |
| G-09 | G | System board renders | `data-testid="system-board"` |
| G-10 | H | Export identity button | `data-testid="profile-export"` |
| G-11 | I | Touch targets registered | `__p31_mobile` |
| G-12 | R | Spoon-tide legend | `data-testid="spoon-tide-legend"` |
| G-13 | R | Sparkline caption | `data-testid="sparkline-caption"` |
| G-14 | R | Color-scheme dark | CSS media query |

---

**Next revision:** 2026-08-15
**Maintainer:** P31 Labs — trimtab-signal
