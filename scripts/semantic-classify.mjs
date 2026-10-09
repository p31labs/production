#!/usr/bin/env node
/**
 * semantic-classify.mjs
 *
 * Cycle 2.6 — replace generic owns strings with per-artifact specific ones.
 * Reads docs/00-CANONICAL-CORE.yaml, applies specific classifications based on
 * actual artifact function (from package.json names/descriptions), and writes back.
 *
 * Run: node scripts/semantic-classify.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

const CORE_PATH = 'docs/00-CANONICAL-CORE.yaml'

const core = parseYaml(readFileSync(CORE_PATH, 'utf8'))

// Per-artifact specific classifications. Each entry: path → { owns, notes, status?, layer? }
const CLASSIFICATIONS = {
  // === Software: apps and surfaces ===
  'production/software/docs': {
    layer: 'L3', status: 'active',
    owns: ['P31 documentation portal'],
    notes: 'L3 surface — docs and guides',
  },
  'production/software/frontend': {
    layer: 'L3', status: 'active',
    owns: ['P31 frontend application shell'],
    notes: 'L3 surface',
  },
  'production/software/spoon-calculator': {
    layer: 'L3', status: 'active',
    owns: ['personal energy management calculator'],
    notes: 'L3 surface',
  },
  'production/software/p31-dashboard': {
    layer: 'L3', status: 'active',
    owns: ['P31 operations dashboard (Astro)'],
    notes: 'L3 surface',
  },
  'production/software/geodesic-room': {
    layer: 'L3', status: 'active',
    owns: ['geodesic dome 3D visualization room'],
    notes: 'L3 surface',
  },
  'production/software/phos-pwa': {
    layer: 'L3', status: 'active',
    owns: ['Phos progressive web app'],
    notes: 'L3 surface',
  },
  'production/software/extensions/p31-cockpit-panel': {
    layer: 'L3', status: 'active',
    owns: ['EDE unified status dashboard extension'],
    notes: 'L3 surface',
  },
  'production/software/extensions/p31ca': {
    layer: 'L3', status: 'active',
    owns: ['p31ca Centaur EDE extension'],
    notes: 'L3 surface',
  },

  // === Software: contracts and services ===
  'production/software/p31-forge': {
    layer: 'L2', status: 'active',
    owns: ['document generation engine (court filings, letters, grants, memos, social posts)'],
    notes: 'L2 contract — document SOT per p31-forge README',
  },
  'production/software/p31-agent-hub': {
    layer: 'L2', status: 'active',
    owns: ['Workers AI agent session orchestration with SQLite DO'],
    notes: 'L2 contract — agent hub',
  },
  'production/software/p31-cortex': {
    layer: 'L2', status: 'migrate-later',
    owns: ['Cortex data orchestration layer with DB migration'],
    notes: 'L2 — pending value assessment',
  },
  'production/software/donate-api': {
    layer: 'L2', status: 'active',
    owns: ['donation API endpoint'],
    notes: 'L2 API contract',
  },
  'production/software/p31-hearing-ops': {
    layer: 'L2', status: 'active',
    owns: ['hearing operations dashboard and workflow'],
    notes: 'L2 operational contract',
  },
  'production/software/p31-state': {
    layer: 'L2', status: 'active',
    owns: ['application state management contract'],
    notes: 'L2 state contract',
  },
  'production/software/telemetry-worker': {
    layer: 'L2', status: 'active',
    owns: ['telemetry collection and reporting worker'],
    notes: 'L2 observability contract',
  },
  'production/software/spin-mesh': {
    layer: 'L2', status: 'migrate-later',
    owns: ['SpIn Barter Mesh — local-first physical media swap system'],
    notes: 'L2 integration mesh, K4 extension',
  },
  'production/software/kenosis-mesh': {
    layer: 'L2', status: 'migrate-later',
    owns: ['7-node SIC-POVM serverless topology'],
    notes: 'L2 mesh network',
  },
  'production/software/cloudflare-worker/social-drop-automation': {
    layer: 'L2', status: 'active',
    owns: ['multi-platform posting, scheduling, and Discord notifications worker'],
    notes: 'L2 social worker contract',
  },
  'production/software/discord/p31-bot': {
    layer: 'L2', status: 'active',
    owns: ['Discord bot with cognitive accessibility features'],
    notes: 'L2 bot service contract',
  },
  'production/software/cloudflare-worker/bouncer': {
    layer: 'L2', status: 'migrate-later',
    owns: ['legacy access control bouncer'],
    notes: 'evaluate for consolidation with production bouncer',
  },
  'production/software/cloudflare-worker/command-center': {
    layer: 'L2', status: 'migrate-later',
    owns: ['EPCP Command Center E2E test suite'],
    notes: 'test infrastructure, not production',
  },
  'production/software/cloudflare-pages/p31-mesh': {
    layer: 'L2', status: 'migrate-later',
    owns: ['P31 mesh on Cloudflare Pages'],
    notes: 'pending value assessment',
  },
  'production/software/cloudflare-worker/{project}': {
    layer: 'L2', status: 'migrate-later',
    owns: ['template Cloudflare Worker'],
    notes: 'scaffold — delete if unused',
  },
  'production/software/unified-k4-cage': {
    layer: 'L2', status: 'migrate-later',
    owns: ['unified K4 cage computation'],
    notes: 'pending consolidation with apps/k4-cage',
  },
  'production/software/genesis-gate': {
    layer: 'L2', status: 'migrate-later',
    owns: ['genesis gate (onboarding authorization)'],
    notes: 'pending value assessment',
  },
  'production/software/extensions/p31-cognitive-shield': {
    layer: 'L2', status: 'active',
    owns: ['email voltage scoring with 60s batching for neuro-regulation'],
    notes: 'L2 cognitive tool — extension',
  },
  'production/software/extensions/p31-progressive-disclosure': {
    layer: 'L2', status: 'active',
    owns: ['UI complexity adaptation by operator spoon level (Layers 0-3)'],
    notes: 'L2 UI tool — extension',
  },
  'production/software/extensions/p31-spoon-gauge': {
    layer: 'L2', status: 'active',
    owns: ['real-time energy/capacity tracking for operators'],
    notes: 'L2 monitoring — extension',
  },
  'production/software/spin-mesh/logistics-do': {
    layer: 'L2', status: 'migrate-later',
    owns: ['SpIn mesh logistics service'],
    notes: 'pending consolidation with spin-mesh',
  },
  'production/software/spin-mesh/matchmaking-do': {
    layer: 'L2', status: 'migrate-later',
    owns: ['SpIn mesh matchmaking service'],
    notes: 'pending consolidation with spin-mesh',
  },

  // === Workers ===
  'production/workers/intent-resolver': {
    layer: 'L2', status: 'active',
    owns: ['agentic intent → action translation'],
    notes: 'L2 orchestration contract',
  },
  'production/workers/creation-accountant': {
    layer: 'L2', status: 'active',
    owns: ['creation revenue accounting and LOV grant lifecycle'],
    notes: 'L2 financial contract',
  },
  'production/workers/federation-bridge': {
    layer: 'L2', status: 'active',
    owns: ['cross-surface identity federation (JWT + DPoP)'],
    notes: 'L2 identity contract',
  },
  'production/workers/fhir-bridge': {
    layer: 'L2', status: 'migrate-later',
    owns: ['FHIR health data bridge'],
    notes: 'integration — pending pilot decision',
  },
  'production/workers/roblox-bridge': {
    layer: 'L2', status: 'migrate-later',
    owns: ['Roblox integration bridge'],
    notes: 'pending game integration decisions',
  },
  'production/workers/phos': {
    layer: 'L3', status: 'active',
    owns: ['Phos portal backend worker'],
    notes: 'L3 surface backend',
  },
  'production/workers/phosphorus31': {
    layer: 'L3', status: 'active',
    owns: ['phosphorus31 portal backend worker'],
    notes: 'L3 surface backend',
  },
  'production/workers/willow': {
    layer: 'L3', status: 'active',
    owns: ['Willow portal backend worker'],
    notes: 'L3 surface backend',
  },
  'production/workers/phos-backup': {
    layer: 'L2', status: 'migrate-later',
    owns: ['Phos backup and replication service'],
    notes: 'pending consolidation',
  },
  'production/workers/phos-triad': {
    layer: 'L2', status: 'active',
    owns: ['Phos triad coordination service'],
    notes: 'L2 service contract',
  },
  'production/workers/willow-safety': {
    layer: 'L2', status: 'migrate-later',
    owns: ['Willow safety monitoring service'],
    notes: 'pending consolidation',
  },
  'production/workers/bros': {
    layer: 'L2', status: 'migrate-later',
    owns: ['bros social/friend network service'],
    notes: 'pending value assessment',
  },
  'production/workers/dads': {
    layer: 'L2', status: 'migrate-later',
    owns: ['DADS parent dashboard service'],
    notes: 'pending value assessment',
  },
  'production/workers/marketplace': {
    layer: 'L2', status: 'active',
    owns: ['marketplace discovery and listing service'],
    notes: 'L2 marketplace contract',
  },
  'production/workers/marketplace-catalog': {
    layer: 'L2', status: 'active',
    owns: ['marketplace catalog management'],
    notes: 'L2 marketplace contract',
  },
  'production/workers/marketplace-mcp': {
    layer: 'L2', status: 'active',
    owns: ['marketplace MCP tools'],
    notes: 'L2 MCP contract (merge into x402 or design-mcp)',
  },
  'production/workers/p31-justice-hub': {
    layer: 'L2', status: 'active',
    owns: ['sovereign justice dispute resolution hub'],
    notes: 'L2 governance contract',
  },
  'production/workers/tetra-tools': {
    layer: 'L2', status: 'active',
    owns: ['tetrahedral geometry computation tools'],
    notes: 'L2 geometry contract',
  },
  'production/workers/artifact-registry': {
    layer: 'L2', status: 'active',
    owns: ['artifact catalog and manifest storage'],
    notes: 'L2 registry contract',
  },
  'production/workers/agent-runtime': {
    layer: 'L2', status: 'migrate-later',
    owns: ['agent execution runtime (software copy)'],
    notes: 'duplicate — consolidate with workspace agent-runtime',
  },

  // === Production ===
  'production/tools/portal-vendor-sync/ui-src': {
    layer: 'L3', status: 'active',
    owns: ['portal vendor sync UI (@p31ca/ui)'],
    notes: 'L3 surface — production tool',
  },
  'production/workers/p31-passport': {
    layer: 'L2', status: 'active',
    owns: ['passport authentication worker (@p31ca/workers-p31-passport)'],
    notes: 'L2 auth contract',
  },

  // === Ecosystem ===
  'production/ecosystem/analytics': {
    layer: 'L2', status: 'migrate-later',
    owns: ['analytics data collection and query service'],
    notes: 'L2 integration — pending value assessment',
  },
  'production/ecosystem/discord': {
    layer: 'L2', status: 'active',
    owns: ['Discord bot with cognitive accessibility features (oracle-bot)'],
    notes: 'L2 bot service contract',
  },
  'production/ecosystem/ipfs': {
    layer: 'L2', status: 'migrate-later',
    owns: ['IPFS content management and pinning'],
    notes: 'L2 integration — pending value assessment',
  },
  'production/ecosystem/middleware': {
    layer: 'L2', status: 'migrate-later',
    owns: ['middleware routing and translation layer'],
    notes: 'L2 integration — pending value assessment',
  },

  // === Repo root ===
  'production/software': {
    layer: 'L2', status: 'migrate-later',
    owns: ['software repo umbrella (decompose: identify canonical copy per domain)'],
    notes: 'repo root — decompose into individual artifacts',
  },
  'production/p31labs/social-content-engine': {
    layer: 'L2', status: 'migrate-later',
    owns: ['social content generation and scheduling engine'],
    notes: 'L2 content engine — pending consolidation',
  },

  // === Packages ===
  'production/packages/p31-mcp': {
    layer: 'L2', status: 'active',
    owns: ['vibe-coding MCP server (app generation + deploy via MCP tools)'],
    notes: 'L2 MCP tool contract — @p31ca/mcp-vibe',
  },
  'production/packages/ui-mcp': {
    layer: 'L2', status: 'active',
    owns: ['UI introspection tools for MCP clients'],
    notes: 'L2 MCP tool contract',
  },
  'production/packages/shared': {
    layer: 'L2', status: 'migrate-later',
    owns: ['shared modules (DEPRECATED — use @p31ca/shared-core, @p31ca/sovereign-primitives, @p31ca/cognitive-passport)'],
    notes: 'deprecated — consolidate into L0 primitives',
  },
  'production/packages/game-engine': {
    layer: 'L2', status: 'active',
    owns: ['game engine runtime (Maxwell rigidity, jitterbug geometry, geodesic primitives, spoon-gated)'],
    notes: 'L2 game contract — @p31ca/game-engine',
  },
  // === Remaining 22 entries (Cycle 2.6) ===
  'production/software/k4-cage': {
    layer: 'L3', status: 'active',
    owns: ['K4 tetrahedral cage browser application'],
    notes: 'L3 surface',
  },
  'production/software/k4-cage-pwa': {
    layer: 'L3', status: 'active',
    owns: ['K4 cage progressive web app'],
    notes: 'L3 surface',
  },
  'production/software/k4-hubs': {
    layer: 'L3', status: 'active',
    owns: ['K4 virtual hub spaces'],
    notes: 'L3 surface',
  },
  'production/software/k4-personal': {
    layer: 'L3', status: 'active',
    owns: ['K4 personal workspace'],
    notes: 'L3 surface',
  },
  'production/software/p31-delta-hiring': {
    layer: 'L2', status: 'migrate-later',
    owns: ['delta hiring platform'],
    notes: 'L2 — pending value assessment',
  },
  'production/software/p31-google-bridge': {
    layer: 'L2', status: 'migrate-later',
    owns: ['Google Bridge design-token API'],
    notes: 'L2 integration — pending value assessment',
  },
  'production/software/sovereign-command-center': {
    layer: 'L3', status: 'active',
    owns: ['sovereign command center dashboard'],
    notes: 'L3 surface',
  },
  'production/software/packages/agent-engine': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/agent-engine — agent topology and runtime primitives'],
    notes: 'L2 package contract',
  },
  'production/software/packages/andromeda-gateway': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/andromeda-gateway — cross-repository gateway'],
    notes: 'L2 package contract',
  },
  'production/software/packages/brain-dump-orchestrator': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/brain-dump-orchestrator — knowledge dump orchestration'],
    notes: 'L2 package contract',
  },
  'production/software/packages/genesis-spark-worker': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/genesis-spark-worker — genesis server worker'],
    notes: 'L2 package contract',
  },
  'production/software/packages/harmonic-linter': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/harmonic-linter — harmonic analysis linter'],
    notes: 'L2 package contract',
  },
  'production/software/packages/jitterbug-api': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/jitterbug-api — jitterbug math API'],
    notes: 'L2 package contract',
  },
  'production/software/packages/jitterbug-pwa': {
    layer: 'L3', status: 'active',
    owns: ['@p31ca/jitterbug-pwa — jitterbug progressive web app'],
    notes: 'L3 surface',
  },
  'production/software/packages/k4-mesh-core': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/k4-mesh-core — K4 mesh networking core'],
    notes: 'L2 package contract',
  },
  'production/software/packages/node-zero/pwa': {
    layer: 'L3', status: 'active',
    owns: ['p31-pwa — node-zero progressive web app'],
    notes: 'L3 surface',
  },
  'production/software/packages/q-distribution': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/q-distribution — quantum distribution primitives'],
    notes: 'L2 package contract',
  },
  'production/software/packages/quantum-edge': {
    layer: 'L2', status: 'migrate-later',
    owns: ['@p31ca/quantum-edge — quantum edge compute'],
    notes: 'L2 package contract',
  },
  'production/software/packages/shared': {
    layer: 'L2', status: 'migrate-later',
    owns: ['shared modules (DEPRECATED — use @p31ca/shared-core, @p31ca/sovereign-primitives, @p31ca/cognitive-passport)'],
    notes: 'deprecated — consolidate into L0 primitives',
  },
  'production/software/workers': {
    layer: 'L2', status: 'active',
    owns: ['p31-workers orchestration and dispatch layer'],
    notes: 'L2 service contract',
  },
  'production/software/workers/phos-backup': {
    layer: 'L2', status: 'migrate-later',
    owns: ['Phos backup and replication worker'],
    notes: 'pending consolidation',
  },
  'production/tools/phos-forge': {
    layer: 'L2', status: 'active',
    owns: ['Phos forge document tooling'],
    notes: 'L2 tool contract',
  },
}

// Apply classifications
let changed = 0
for (const entry of core.entries) {
  const cls = CLASSIFICATIONS[entry.path]
  if (cls) {
    if (cls.layer) entry.layer = cls.layer
    if (cls.status) entry.status = cls.status
    if (cls.owns) entry.owns = cls.owns
    if (cls.notes) entry.notes = cls.notes
    changed++
  }
}

// Write back
const yaml = stringifyYaml(core, { indent: 2, lineWidth: -1 })
writeFileSync(CORE_PATH, yaml)
console.log(`Classified ${changed} artifacts semantically`)
