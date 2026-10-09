# P31 Production Audit — Feature Inventory & Integration Map

**Date:** 2026-10-03 · **Scope:** `/home/p31/production` full sweep
**Purpose:** Inventory every integration-ready P31 feature, map the coherent product story, and ground a go-to-market plan to take on Google/Anthropic/Kilo.ai.

---

## 1. The Ecosystem at a Glance

| Layer | Count | Examples |
|---|---|---|
| Packages (libraries) | ~50 | canon, design-core, ui-forge, agent-runtime, brain-dump-orchestrator, economy, govern, cognitive-passport, skins, MCP servers |
| Portals (deployable UIs) | ~15 | ui-forge-studio, forge, design, qpj, chat, workspace, parent, children, teen, meatspace, env-portal, mcp-marketplace |
| Apps (wrangler/React) | ~25 | loom, p31ca, phos, bonding, game-builder, app-builder, website-builder, willow, status, tetra-ops |
| Workers (Cloudflare) | ~60 | orchestration, MCP servers, wallet, love-ledger, marketplace, signaling, phos, vibe, governance, justice, crypto |
| CLI servers | ~15 | soulsafe-server (3-gate), bob-server, marge-server, ground-truth-server, design-mcp-server, p31-automation-engine |

---

## 2. The Crown Jewels (integration-ready, verified on disk)

### 2.1 The Transparency Stack (the glass-box moat)
| Asset | What it does | Verified |
|---|---|---|
| `packages/agent-runtime/` | Family orchestration kernel — coordinator, drafting agents, scoped memory, policy gate, **event-bus**. Connects QPJ workspace ↔ Forge ↔ Loom. | `agent.ts, coordinator.ts, family-pipeline.ts, policy-gate.ts, event-bus.ts, scoped-memory.ts` |
| `software/packages/brain-dump-orchestrator/` | Parallel-axis brain-dump → research pipeline. Exports `decomposeBrainDump`, `BrainDumpOrchestrator`, `RecursiveBrainDumpOrchestrator`, `ConvergenceReporter`, `GateChecker`. | CLI: capture → decompose → run → resume → converge → status |
| `tools (1)/phos-forge/brain.mjs` | The actual brain-dump→research-report pipeline. Stages: parse → elaborate → organizeThemes → researchThemes → synthesize → archive. Live bus events: `brain.started/parsed/elaborating/organizing/researching/complete`. | Verified stages + event bus |
| `tools (1)/phos-forge/bus.mjs` | Event bus → `events.jsonl` + unix socket + CLI tail. | Live event transport |
| `portals/ui-forge-studio/` | The flagship transparent studio. 5-chapter flow, SSE stream (`/api/forge/stream`), ActivityPane (collapsible agent feed), never-fail pipeline. | Live, healthy, deployed |

### 2.2 The Verification Stack (the trust moat)
| Asset | What it does |
|---|---|
| `cli/soulsafe-server.js` | **3-Gate Verification Protocol**: Gate 1 self-review w/ OQE citations → Gate 2 independent cross-review (information barrier, no generator CoT) → Gate 3 architect full-suite verify (tsc/vitest/build/wrangler, ≥186/186). Zero-Work detection, Red Board diagnostics. |
| `packages/ui-forge/src/{gate,governor,shaper}.mjs` | Deterministic non-compensatory admissibility, nearest-match repair, SIC-POVM four-axis gate. |
| `packages/design-validator/` | Canon contract validation. |

### 2.3 The Economy Stack (the incentive moat)
| Asset | What it does |
|---|---|
| `packages/economy/` + `packages/love-ledger/` | LOVE + dual-currency economy. Mint/spend/reward. |
| `workers (1)/love-ledger/`, `workers (1)/p31-revenue-ledger/` | Ledger workers. |
| `workers (1)/marketplace*/`, `workers (1)/mercury-*` | Marketplace + payments (mercury-payments, treasury-snapshot, webhook). |
| `packages/mcp-membrane/` | Post-deploy verification — DORA metrics, deploy checks, **gamified XP/LOVE**, artifact minting. |

### 2.4 The Governance & Identity Stack (the compliance moat)
| Asset | What it does |
|---|---|
| `packages/govern/` | The universal governance runtime — the seam every constitution conforms to. |
| `packages/governance/` | Governance UI vocabulary: **ChainTimeline, VerifyButton, Enforcement** — the visual audit layer. |
| `packages/sovereign*` | Identity + cryptographic primitives (DIDs, keys, PQC-ready via `p31-crypto-mcp`). |
| `packages/cognitive-passport/` | Cognitive Passport schema/profiles/scoring — the personalization input. |
| `packages/rules/` | Constitution engine + cognitive shield. |
| `workers (1)/phenix-wallet/`, `federation-bridge/` | Wallet + social key recovery. |
| `workers (1)/p31-justice-hub/` | Evidence vault, escrow, ODR (online dispute resolution) — court-admissible. |

### 2.5 The MCP Server Cluster (the tool surface)
| Server | Location | Tools |
|---|---|---|
| `canon-mcp` | package | 23 tools across families: docs(4), tokens(2), design(5), contract(3), validation(2), act(4), observe, mediate |
| `ui-mcp` | package | UI contract tools |
| `forge-mcp` | package | Themed, evidence-blocked document generation |
| `music-maker-mcp` | package + worker | Spatial music: observe → place/clear/name |
| `design-mcp` / `design-mcp-v3` | worker | Design system MCP |
| `marketplace-mcp` | worker | Marketplace listing/offer/escrow |
| `p31-crypto-mcp` | worker | PQC crypto (ML-KEM-768, ML-DSA-65, SD-JWT, Taler) |
| `phenix-wallet-mcp` | worker | Wallet (identities, credentials, ZK proofs, recovery) |
| `mcp-x402-gateway` | worker | x402 payment-gated tool access |
| `p31-capital-machine-mcp` | worker | Capital allocation |
| `p31-mcp-server` | worker | General P31 surface |
| `mcp-registry` | worker | The MCP registry |

### 2.6 The Rendering/Personalization Stack
| Asset | What it does |
|---|---|
| `packages/design-core/` | The canon components (Topbar, SidebarNav, Card, MetricBadge, StatusCluster, GlassPanel, CandyHeader, SectionStrip, NotificationStack…). |
| `packages/skin-system/` + `skin-phos/tetra/willow` | Runtime `applySkin()` — CSS-variable theme injection. |
| `packages/interface-generator/` | Universal Interface Generator — **adaptive UI from Cognitive Passport + data**. |
| `packages/controls/` | Knob/Fader/Switch control primitives (ARIA slider pattern). |
| `packages/ui-forge/` | The tetrahedral SIC-POVM UI generation engine. |
| `portals/forge/` | The forge portal (renders generated surfaces). |

### 2.7 The Game/Spatial/Experience Stack
| Asset | What it does |
|---|---|
| `packages/game-engine/` + `game-generator/` | Maxwell rigidity, jitterbug geometry, spoon-gated runtime, Roblox bridge. |
| `packages/gamification/` | Sound, confetti, haptics, achievements, growth rings, voice feedback. |
| `packages/geodesic-core/` | 3D geodesic/campaign systems. |
| `apps/loom/` | The design-system-as-live-graph (the canon's flagship). |
| `workers (1)/signaling/`, `multiplayer-room/`, `roblox-bridge/` | Real-time mesh + multiplayer. |

---

## 3. The Coherent Product Story

**P31 = The Glass-Box Creation Pipeline.** From brain dump to working artifact, every stage visible, every decision explainable, every output verifiable — with LOVE earned for completing work, and a governance layer a compliance officer can sign.

The five moats, each backed by verified on-disk infrastructure:

1. **Glass box vs black box** → `agent-runtime` event-bus + `ui-forge` SSE stream + `ActivityPane`
2. **Verification-native** → `soulsafe-server` 3-gate + ui-forge Governor/Shaper/Gate
3. **Governance-first** → `govern` + `governance` (ChainTimeline/VerifyButton) + `mcp-justice` (court-admissible evidence)
4. **Pipeline transparency vs diff-only** → brain-dump orchestrator stages as visible steps
5. **Brain dump → artifact** → the full arc: `phos-forge/brain.mjs` (research) + `ui-forge` (schema/surface) + `vibe-sdk`/`app-builder` (deploy)

---

## 4. The Goliath Weaknesses This Ecosystem Answers

| Goliath | Weakness | P31 answer (already built) |
|---|---|---|
| **Anthropic Claude Code** | Encrypts thinking, hides file ops → dev revolt | Glass box: every stage visible (ui-forge stream) |
| **Cursor** | No prompt-level audit, spending-cap holes | Governance: `mcp-justice`, `govern`, audit event stream |
| **Kilo.ai** | Shows *which model*, not *the reasoning chain* | Pipeline transparency: stages + CoT + repair logic |
| **Google Gemini** | Deep research is a separate tab, no artifact | Unified: research report → schema → surface in one flow |

---

## 5. Go-to-Market Plan (the Goliath offensive)

### Phase 1 — Ship the unified glass-box surface (the product)
Build the conversation-timeline rebuild of `ui-forge-studio`: brain dump → [research stage blocks] → schema → surface, all as collapsible chat messages. Wire `phos-forge/brain.mjs` (research) + `brain-dump-orchestrator` (decompose/converge) as additional pipeline modes behind the same SSE stream + StageTrace UI. **This is the product that fills the "brain dump → artifact" gap no one fills.**

### Phase 2 — Verification-native (the trust wedge)
Surface `soulsafe-server` 3-gate as a final pipeline stage: the artifact passes Gate 1 (self-review w/ OQE), Gate 2 (independent cross-review), Gate 3 (full verify suite). Show it as a visible collapsible block. **This is the answer to the 96%-don't-trust / 48%-verify crisis.**

### Phase 3 — Compliance export (the procurement wall)
The SSE event stream serialized to a **downloadable audit log** (agent-by-agent, stage-by-stage) — the EU-AI-Act / SOC 2 / FedRAMP-ready artifact. Wire `mcp-justice` (evidence vault) + `governance` (ChainTimeline) as the presentation. **This is the "security + compliance = pricing power" play.**

### Phase 4 — LOVE economy (the retention moat)
Each completed pipeline stage mints LOVE (`economy`/`love-ledger`); exports mint artifacts (`mcp-membrane`). **Incentive layer no goliath has.**

### Phase 5 — The adaptive surface (the personalization wedge)
`interface-generator` + `cognitive-passport` + `skin-system` adapt the generated surface to the user's passport — **personalization the goliaths can't match (family-first, neurodivergent-aware).**

---

## 6. Immediate Next Steps (this session, gated)

| # | Action | Files | Gate |
|---|---|---|---|
| 1 | Rebuild `ui-forge-studio` as the conversation timeline (StageTrace blocks, stage messages, depth paragraphs) | `App.tsx`, new `StageTrace.tsx`, `index.css` | `tsc` + build clean |
| 2 | Wire brain-dump research as a second pipeline mode (research-report mode) | new `functions/api/research/stream.ts`, `lib/researchStages.ts` | `tsc` clean; brain dump → cited report streams |
| 3 | Add the soulsafe 3-gate verification stage (Gate 1/2/3 visible) | `functions/api/forge/stream.ts` + `StageTrace` | 45+ engine tests; live gates show |
| 4 | Compliance export (downloadable audit log) | new `lib/exportAudit.ts` + menu item | `tsc` clean; download works |
| 5 | Write the market-position doc | `docs/enterprise/FORGE-MARKET-POSITION.md` | runbooks-check green |

---

*End of audit. All findings verified against on-disk code on 2026-10-03.*