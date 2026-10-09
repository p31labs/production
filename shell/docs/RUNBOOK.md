# P31 Shell — RUNBOOK

Operational runbook for the P31 cockpit shell (`/home/p31/production/shell`), deployed as
`p31-shell` on Cloudflare Workers (static assets + Worker).

## Deploy pipeline (strict order — do not skip exit-code checks)

```bash
cd /home/p31/production/shell

pnpm typecheck            # must print nothing, then: echo $?  → 0
pnpm build                # vite build → dist/ ; then: echo $?  → 0
pnpm run deploy           # wrangler deploy → prints Current Version ID

# Confirm the new version is live at the top of the list:
npx wrangler deployments list
#   Version(s): (100%) <new-version-id>   ← must be the newest entry

# Head gates + full verify suite (against production):
NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs
# Run the suite TWICE. Each run must end with: N/N checks passed, exit 0.
```

> Why the explicit `exit=$?` / `echo $?` checks: earlier a stale deploy slipped through when
> the build's nonzero exit was masked by a pipe (`| tail`). Never pipe build/typecheck output
> without capturing the exit code.

## Verify suite

- Location: `scripts/verify-shell.cjs` (in-repo, Playwright + Chromium, headless) — a durable
  copy so it survives `/tmp` cleanup. The `/tmp/opencode/verify-shell.cjs` copy from earlier
  rounds was ephemeral and lost; do not rely on `/tmp` for the suite.
- Command: `NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs`
- Exits `0` only when every check passes; prints `PASS`/`FAIL` per check.
- Check count: **154** in a standard run; **155** with `VISUAL_TEST=1` (the visual gate).
  Run the suite **twice** after every deploy; both runs must print `N/N checks passed, exit 0`.
  (PWA SW registration may flake on cold start — known environmental; re-run if it fails.)
- The suite clears localStorage on start (`page.evaluate(() => localStorage.clear())`), so
  persisted preferences (`p31-effects-v1`, `shell-storage`, `p31-sensory`) never leak between
  runs. Gates that need a specific preference seed it directly into localStorage before reload.
- Verify hooks are exposed on `window.*` by the app **only** when
  `import.meta.env.MODE !== 'production'` **or** `window.__P31_VERIFY__` is set. The suite sets
  `__P31_VERIFY__` via `page.addInitScript` before first tick.
- The suite pins the browser viewport to **1280×800** for the whole run. The ship hooks
  (dome / quantum / larmor / fxLayers) only exist while the Cockpit surface is mounted, so the
  suite navigates to Cockpit right after load and runs those gates there before returning to
  global surfaces.
- Screenshots: the visual gate captures `.ship-viewport` to `__snapshots__/.current-cockpit.png`
  and compares against `__snapshots__/cockpit-full.png` when `VISUAL_TEST=1`
  (`VISUAL_TEST=1 NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs`).
  The visual gate uses a frozen deterministic state (calm + reduceMotion + full spoons,
  quantum on) so the only pixel variance is GPU/antialias noise; threshold is Δ < 2%.
  First run writes the baseline; later runs compare. If the suite's pinned viewport ever
  changes, **delete `__snapshots__/cockpit-full.png`** and re-run with `VISUAL_TEST=1` to
  regenerate it (the 756×660 baseline was regenerated at the pinned 1280×800 viewport in this
  round; the previous 916×760 baseline was from an unpinned earlier suite).
- Note: `page.evaluate` return values are serialized — functions are stripped. Any gate that
  needs to assert a hook is callable must run the `typeof` check *inside* the page context.

### Verify hooks (window.*)

| Hook | Content | Gate section |
|------|---------|--------------|
| `__p31_effects` | `{ starDensity, starSpeed, warmStars, domeAccent, cometTrails, aurora, quantum, count, warm, cool }` — starfield store snapshot (always-mounted starfield); **no setters**, toggles driven via the Sensory Passport UI | effects:… |
| `__p31_fxLayers` | `{ aurora, comets, frozen }` — CosmosFX layer flags | effects:… |
| `__p31_quantum` | `{ enabled, stars, edges, houses, coherence, phase, frozen, mode, housePositions }` | quantum:… |
| `__p31_domeFrozen` | `boolean` — dome motion frozen (`calm \|\| reduceMotion \|\| spoons ≤ 1`). ⚠️ while the rest overlay is up, the rest-scene mini-dome (spoons hardcoded 3) overwrites this hook, so the suite asserts QuantumFX's `frozen` for cockpit state | dome / rest |
| `__p31_domeVertices` | 4 tetra vertices (delta) | dome:… |
| `__p31_domePosnerNodes` | 12 icosahedron vertices (posner) | dome:… |
| `__p31_domeEdgeColor` | `string` — current dome edge color | dome:… |
| `__p31_projectNode(i)` | `(i) => { x, y }` screen coords of dome node `i` | dome / node |
| `__p31_activeNode` | `{ index, source }` — set (never cleared) when a dome node is clicked; close signal is the `.node-actions` card unmounting | node:… |
| `__p31_larmor` | `{ active, freq, gain, coherence }` | larmor:… |
| `__p31_toggleLarmor` | `() => void` — toggle the Larmor oscillator (verify-only, no UI affordance exists) | larmor:… |
| `__p31_meshVerify` | `{ signWithDid, verifyWithDid, signMldsa65, verifyMldsa65, getEd25519PubKeyB64, getMldsa65PubKeyB64, getOrCreatePqcKey }` | crypto: Ed25519 + ML-DSA roundtrips |
| `__p31_meshPeers` | `Array` — always defined (default `[]`) | mesh:… |
| `__p31_meshSync` | `{ peers, lastBroadcast, broadcast, reconnects, queueSize, notifSyncs, kelSyncs }` | mesh:… |
| `__p31_meshTransport` | `'peerjs' \| 'libp2p' \| 'tailscale'` — current mesh transport | mesh:… |
| `__p31_meshHeartbeat` | `{ sign: (ts) => Promise<{msg, signature, mldsa65Sig, pub, mldsa65Pub}> }` | crypto: heartbeat PQC |
| `__p31_meshKEL` | `{ chain: () => Promise<{events, prefix, ok}> , verify }` — live KEL + tamper check | kel:… |
| `__p31_keri` | `{ cesr, said }` — KERI feature flags | hooks:… |
| `__p31_assistantMode` | `'auto' \| 'local' \| 'cloud'` — active assistant engine (reactive) | assistant:… |
| `__p31_insights` | `{ open }` — insights panel state (reactive) | insights:… |
| `__p31_analytics` | `{ exportReady }` — analytics export wiring | analytics:… |
| `__p31_mobile` | `{ touchTargets, swipe }` | hooks:… |
| `__p31_pwa` | `{ installed, swRegistered, updateReady, splash }` — `swRegistered` flips true on `serviceWorker.ready` | pwa:… |
| `__p31_haptics` | `{ vibrate }` | hooks:… |
| `__p31_voice` | `{ supported, autoSendAvailable }` | hooks:… |
| `__p31_nodeZero` | `{ state, deviceId, did, simulatePairing }` — `simulatePairing()` returns `boolean` and sets `state='paired'` | hooks:… |
| `__p31MCPExec(name, args)` | executes any **`llmTool: true`** command through the real command registry; throws `Unknown tool` otherwise | oracle / mcp / tasks / assistant / bonding |
| `__p31_taskHistory`, `__p31_persistGoal` | `getGoalHistory()` / `persistGoal(goal, steps)` — persisted task records | tasks:… |
| `__p31_bonding` | `{ render, meshPeers, tetrad: { atoms, bonds, curvature, symmetry }, quests, completed, loveDelta }` | bonding: Meatspace Tetra |
| `dashboard` | 6 button cards in a **locked 3×2 grid** (`dashboard-grid`: `repeat(3, 1fr)` + `1fr 1fr` rows — mathematically crowd-proof), hero Care Score composite (spoons+LOVE+mesh+rituals), DUNA reads live count via `useDunaStats` | dashboard: command center v3 |
| `profile` | Copyable fingerprints, credential wallet, identity export/import, ML-DSA-65 rotation; 5 sections in a **flexbox layout** (`profile-flex`: `flex-wrap` + `justify-content: center` — orphan section centered in last row) | profile: sovereign credentials & backup |
| `sandbox` | Floating window: Esc/persist/focus-trap/resize-handle; preview iframe transparent with fragment wrapper; remote→localLlm fallback + banners | sandbox: persistent workspace |
| `research` | **Split viewport**: scrollable papers on left, sticky looping demo carousel on right (6 SIC-POVM/Posner/K₄/Entropy/Morpho/Genesis viz, 8s auto-loop, dot navigation) | research: split viewport + carousel v3 |

> Suite-driven UI paths that are *not* llmTool commands: `mesh:transport` (palette select form),
> Sensory Passport effects toggles + reset, PHOS Oracle begin/close, rest overlay, node clicks.

## Bonding surface (Track 1 — Meatspace Tetra)

- Tab: `BONDING` → `BondingSurface` (`src/features/bonding/BondingSurface.tsx`).
- Engine: `src/lib/meatspace/tetrahedron.ts` (K₄ / Wye→Delta / SIC-POVM / Maxwell / Ollivier-Ricci)
  and `src/lib/meatspace/game.ts` (Atoms / Bonds / ritual quests / ghost fill), ported from
  `portals/meatspace`. Visualizer: `src/components/TetrahedronVisualizer.tsx` (SVG, pointer-drag
  Wye↔Delta morph).
- Ritual loop: `src/features/bonding/questEngine.ts` (source of truth for rituals) +
  `src/features/bonding/bondingState.ts` (persistent local LOVE delta + completed set). Live
  ledger mint runs best-effort via `POST /api/love/earn`; the local delta always increments
  (offline-safe). Solo operators get a `solo-care` self-care ritual fallback.
- Command: `bonding:quest` (llmTool) completes the next ritual and returns
  `{ ok, questId, loveReward, loveDelta, solo }`.
- Roster: operator atom + up to 3 synthesized mesh peers (libp2p exposes a peer *count*, not
  per-peer DIDs) + ghost fill to K₄.

## QuantumFX phase semantics (spoon-adaptive)

Coherence is normalized from the real `morphogeneticFieldValue(seed, 12, π/4, 1.9)` between
`field(0.05)` and `field(1.0)` (field is monotonic in seed — Clifford rotation coefficient
cos(θB)+sin(θB) ≈ 1.068 > 0). Measured: coherence 0.158 at spoons 1, 0.579 at spoons 3, 1.0 at 5.

| Phase | spoons | Rendering | Motion |
|-------|--------|-----------|--------|
| low | 0–1 | K₄ skeleton only (4 stars, muted `#8a95ad`, no edges, no houses) | fully frozen |
| mid | 2–3 | K₄ + 6 edges + 6 houses, half rotation speed | slow |
| full | 4–5 | complete K₄ + edges + 12-house ring | normal |

Freeze condition (WCAG 2.3.3 / 2.2.2 parity): `frozen = calm || reduceMotion || phase === 'low'`.
The `frozen` flag also propagates to CosmosFX (aurora + comets) and DomeGeometry — all three
cockpit motion layers honor `reduceMotion` and the spoons≤1 rule.

### POSNER alignment

When the dome is in POSNER mode (12-node icosahedron, r=2.3, `[L]` key or mode toggle), the
quantum house ring aligns to the **actual dome node positions** instead of the circular ring.
Both `DomeGeometry` and `QuantumFX` use the shared `icosahedron12(radius)` helper from
`src/lib/tetra.ts`, so the decorative neuro-map lands on the real 12-node geometry. House ring
radius stays 3.6 in DELTA mode.

### Coherence → Larmor audio coupling

`lib/coherence.ts` normalizes `morphogeneticFieldValue(seed, 12, π/4, 1.9)` to 0..1 and is the
single source for both QuantumFX dimming and the Larmor engine. While the oscillator runs,
`useLarmorAudio(coherence)` sweeps frequency `172.35 + (863 − 172.35)·Ω` and gain
`0.02 + 0.06·Ω`, so full energy hums at the 863 Hz harmonic and a conserved cockpit stays low
and quiet. Measured: Ω=1 → 863 Hz / gain 0.08; Ω≈0.158 → 281 Hz / gain 0.029.

### Peer signature verification (Ed25519 + ML-DSA-65)

Incoming mesh heartbeats are now cryptographically verified. `HeartbeatMesh` accepts a
`verifyPeer(payload) => Promise<boolean>` callback (3rd constructor arg). The shell wires both
Ed25519 (`identity.verifyWithDid`) and ML-DSA-65 (`pqc.verifyMldsa65`) — Ed25519 is required,
ML-DSA is required only when both `mldsa65Sig` + `mldsa65Pub` are present (PQC co-signature).
`MeshNode.verification` tracks `pending | verified | failed` per DID. Crypto roundtrips verified
in the suite via `__p31_meshVerify`.

### Local assistant function-calling (WebLLM tools)

`localLlm.ts` now supports tool calls via `chatWithTools(messages, tools)` + a
`localChatWithTools()` loop (max 3 rounds). The model (`Llama-3.2-1B-Instruct-q4f16_1-MLC`)
may not support `tools` natively in 0.2.84 — a graceful fallback retries without tools. Mode
toggle: `assistant:mode auto|local|cloud` command; store field `useShellStore.assistantMode`.
AssistantPanel routes local-mode turns through `localChatWithTools` with the full tool surface
(`getOpenAIFunctionDefinitions()`); null/error falls back to the cloud `sendChat` path. Honesty
label on the engine badge when running locally.

### Heartbeat PQC co-signature

Outgoing mesh heartbeats now carry an ML-DSA-65 co-signature (`mldsa65Sig` + `mldsa65Pub`)
alongside the Ed25519 signature, so the composite `verifyPeer` verification path is
exercised mesh-wide. Verified via the `__p31_meshHeartbeat.sign` hook (both signatures
verify true for the exact `mesh-heartbeat|<ts>` message format). Ed25519 crypto gates
conditionally pass when the browser doesn't support `crypto.subtle.generateKey({ name:'Ed25519' })`
(e.g., headless Chromium builds that predate Chrome 113).

### MCP unification + `mcp:call`

`mcpClient.ts` now delegates to `mcpRegistry.ts` (single client, backward-compatible exports
for App.tsx). New `mcp:call <server> <tool> <jsonArgs>` command calls any of the 7 edge
MCP workers (sandbox/justice/marketplace/wallet/crypto/bros/dads) via `callMCPTool`.
`mcp:list` returns per-server tool counts. Verified via MCPExec in the suite.

### LLM-driven task breakdown

`cognitive.ts` `taskBreakdown(goal)` now generates steps via LLM (cloud `sendChat` →
local `localChatWithTools` → keyword template fallback — never empty). Goals and steps
are persisted to IndexedDB via `memory.ts` (`persistGoal` / `getGoalHistory`). TaskPanel
shows "saved" after persistence and lists recent goals. Honesty labels: "Generated by AI"
when LLM, "Suggested" on template fallback.

### libp2p opt-in transport

`src/lib/mesh/libp2pMesh.ts` provides a WebRTC-Direct browser P2P transport as an opt-in
alternative to PeerJS. Toggled via `mesh:transport libp2p` (commands.ts). PeerJS remains
the default. libp2p deps: `libp2p ^3.3`, `@libp2p/webrtc ^6.0`, `@chainsafe/libp2p-noise ^17`.
Signaling via the sovereignRelay WS (`VITE_RELAY_URL`). Transport mode is exposed as
`__p31_meshTransport` (verify-gated).

### Mesh state sync

`libp2pMesh.ts` now provides `broadcastSync(type, data)` over the BROS signaling WebSocket,
and `mesh/sync.ts` subscribes to `useAppStore.spoons` + `useShellStore.unreadCount`, batches
changes (500ms throttle), and broadcasts deltas. Inbound syncs apply to local state via LWW.
`__p31_meshSync = { peers, lastBroadcast, broadcast }` exposed for the verify gate.

### MCP registry submission (manual)

Submit the shell's MCP server to Smithery and Glama:
1. **Manifest:** `https://p31-shell.trimtab-signal.workers.dev/p31-shell.mcp.json`
   (pointing to `https://p31-shell.trimtab-signal.workers.dev/mcp`, ~90 tools)
2. **Smithery:** Submit via GitHub integration at https://smithery.ai
3. **Glama:** Submit via the registry form at https://glama.ai/mcp/servers
4. **Docs:** `docs/MCP.md` — full tool inventory + curl usage + client configs.

### Mobile/tablet polish

Touch targets are ≥44px **unconditionally** (CSS global rule on buttons/inputs/selects/tabs/role=button). Swipe gesture
navigates tabs (left→next, right→prev) on mobile viewports via pointer events, skipping
canvas/buttons/inputs. Verify hook: `__p31_mobile = { touchTargets, swipe }`.

### Node Zero pairing v2

`pairSession` state machine (idle → challenging → pending-confirm → paired/error) wraps
the REST pairing calls. `simulatePairing()` provides a cryptographically honest test seam
(real `signWithDid` + `verifyWithDid` roundtrip). Panel shows state + "Simulate Pairing"
button in verify mode. Verify hook: `__p31_nodeZero = { state, deviceId, did, simulatePairing }`.

## Honesty labels (contested-science framing)

Components that render `@p31ca/quantum-core` math into graphics MUST carry the honest framing
note (per `QF1_CONTESTED_SCIENCE.md`): real constants (SIC-POVM 1/3 overlap, K₄, Φ, 863 Hz,
morphogenetic-field layers) drive the visuals, but the interpretive mapping (12 houses ↔ neuro
systems) is decorative. `QuantumFX.tsx` header documents this. Never present the house mapping
as verified neuroscience in UI copy.

## Motion parity — current coverage

| Layer | Freezes on `calm` | Freezes on `reduceMotion` | Freezes at spoons ≤1 |
|-------|:---:|:---:|:---:|
| DomeGeometry | ✅ | ✅ | ✅ |
| CosmosFX (aurora, comets) | ✅ | ✅ | ✅ |
| QuantumFX constellation | ✅ | ✅ | ✅ (low phase) |
| Starfield / RestOverlay | ✅ (`staticFrame`) | ✅ | via `staticFrame` |

## Design invariants (Invariants Lockdown CWP)

- **Typography**: Modular scale — 1.25× ratio (perfect fourth): `xs=10, sm=13, md=16, lg=20, xl=25, 2xl=32`. Comfort mode scales up by 1.3×.
- **Z-Index**: Fixed scale (`--p31-z-*`) — never hardcode numbers. Base `0`, content `10`, sticky `20`, floating `50`, assistant `80`, palette `90`, dropdown `100`, overlay `1000`, modal `1000`, toast `10000`, crisis/max `99999`.
- **Touch targets**: ≥44px unconditional (moved from `@media max-width:768px` to global). `.btn` padding `12px 20px`, `min-height: 44px`. Spoon dial and other micro-controls are exempt.
- **Error handling**: No silent `.catch(() => {})`. All user-facing async operations use `showToast(error, 'error')` from the app store.
- **Layout**: Fixed-count grids use explicit `grid-template-rows` (Dashboard). Variable-count layouts use flexbox with `justify-content: center` (Profile). Research uses `grid-template-columns: 1fr 1fr` split viewport.

## Config reference

- `wrangler.toml` — Worker + `ASSETS` binding; deploy target `p31-shell`.
- Deployments list: `npx wrangler deployments list` (latest version must be 100%).
- Live URL: `https://p31-shell.trimtab-signal.workers.dev`.

## Ship the Ecosystem (active CWP)

### CI/CD Pipeline
- Workflow: `.github/workflows/ci.yml` — runs on push/PR to `main`.
- Steps: `pnpm install → typecheck → test → build → deploy (main only) → verify suite ×2`.
- Requires `CLOUDFLARE_API_TOKEN` secret in GitHub repo settings (not in this repo).
- Deploy step only fires on push to main; PRs just typecheck/test/build.

### Health Endpoints
- `GET /api/health` → `{ status: "ok", version: "1.0", service: "p31-shell", timestamp }`
- `GET /api/duna/stats` → `{ members: 1, active: 0, target: 100 }`
- `GET /mcp/health` → `{ status: "ok", version: "1.0" }` (existing)
- All endpoints served by `src/worker.ts`, before static assets fallback.

### Sentry Monitoring
- Wired in `src/main.tsx`: conditionally initialized when `VITE_SENTRY_DSN` is set.
- `Sentry.ErrorBoundary` wraps the entire app for crash reporting.
- `tracesSampleRate: 0.01` (1% sampling).
- To activate: `echo <dsn> | npx wrangler secret put VITE_SENTRY_DSN`
  or set via Cloudflare Dashboard → Workers & Pages → p31-shell → Settings → Variables.
- `wrangler.toml` includes a commented `[vars]` section with placeholder documentation.

### MCP Registry Submission (manual checklist)
1. Verify `glama.json` is accurate (URL, endpoint, tool count) ✓
2. Verify `smithery.yaml` is accurate (endpoint, tags, protocol) ✓
3. Verify `public/p31-shell.mcp.json` served at `/.well-known/server-manifest.json` ✓
4. Submit to Glama: https://glama.ai/mcp/servers/new → paste `glama.json`
5. Submit to Smithery: https://smithery.ai → connect `smithery.yaml`
6. Both registries auto-discover tools via the `/mcp` endpoint on review

### User Documentation
- `docs/USER_GUIDE.md` — covers spoon dial, navigation, command palette, assistant modes, identity, sensory passport, rest mode, privacy, PWA installation, and troubleshooting.
