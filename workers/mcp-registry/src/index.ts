import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import * as jose from 'jose';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server';
import { scanToolSurface } from './scanner';
import { validateArgs, validateBodySize } from './sanitizer';
import { LedgerLog } from './ledger-do';

export { LedgerLog };

/**
 * mcp-registry — P31 MCP Server Marketplace API (Phase 1)
 *
 * Central discovery + playground backend for all P31 MCP servers.
 * Powers mcp.p31ca.org (the MCP Marketplace portal).
 *
 * Two catalog tiers:
 *   - Official: the curated P31 fleet (OFFICIAL_CATALOG below), live-probed.
 *   - Community: POST /servers registrations, liveness-validated, marked
 *     "unverified" until P31 reviews them.
 *
 * Endpoints:
 *   GET  /                        HTML listing page
 *   GET  /health                  Health check
 *   GET  /servers                 Catalog summaries (search/filter via query)
 *   GET  /categories              Category + tool counts
 *   GET  /servers/:name           Full server detail incl. tool schemas
 *   GET  /servers/:name/tools     Full tool schemas (name/desc/inputSchema)
 *   GET  /servers/:name/health    Live health probe
 *   POST /servers                 Register a community server (rate-limited)
 *   POST /servers/:name/call      Proxy tools/call to the server
 *
 * Protocol probing is stateless-first (MCP 2026-07-28, SEP-2575):
 * probes send `server/discover` (and `tools/list`) carrying the
 * `_meta` envelope with io.modelcontextprotocol/protocolVersion 2026-07-28,
 * plus the SEP-2243 Mcp-Method / Mcp-Name headers on every POST. Servers
 * advertising 2026-07-28 are fully supported; servers that only speak the
 * 2025-era initialize handshake fall back to the legacy probe path.
 */

const PROTOCOL_VERSION = '2026-07-28';
const PROBE_PROTOCOL_VERSION = '2025-11-25';
const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  '2026-07-28',
  '2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07',
]);

interface Env {
  REGISTRY_KV: KVNamespace;
  /** Durable Object binding for the audit + transparency hash chains (N3). */
  LEDGER?: DurableObjectNamespace;
  /** Service bindings to same-account MCP workers (bypass DNS 1042). */
  MUSIC_MAKER_MCP?: Fetcher;
  P31_CRYPTO_MCP?: Fetcher;
  P31_JUSTICE_HUB?: Fetcher;
  BROS?: Fetcher;
  DADS?: Fetcher;
  MARKETPLACE?: Fetcher;
  PHENIX_WALLET?: Fetcher;
  X402_GATEWAY?: Fetcher;
  ROBLOX_BRIDGE?: Fetcher;
  P31_MCP_SERVER?: Fetcher;
  P31_SHELL?: Fetcher;
  PHOS_AI_PROXY?: Fetcher;
  SPACESHIP_RELAY?: Fetcher;
  DESIGN_MCP?: Fetcher;
  /** Admin bearer token for moderation + observability endpoints. */
  ADMIN_TOKEN?: string;
  /** Base64 32-byte Ed25519 seed used to sign review decisions. */
  REVIEW_SIGNING_KEY?: string;
  /** Legacy signing seed for verifying historical audit entries after rotation. */
  REVIEW_SIGNING_KEY_PREV?: string;
  /** Optional OTLP/HTTP collector endpoint (e.g. a SIEM's OTLP receiver). */
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  /** Optional: run the LLM scan pass for high-risk registration categories. */
  SCANNER_LLM_ENABLED?: string;
  /** Principal reported when authenticating via ADMIN_TOKEN (default admin-token). */
  ADMIN_PRINCIPAL?: string;
  /** Cloudflare Access JWKS endpoint (https://<team>.cloudflareaccess.com/cdn-cgi/access/certs). */
  CF_ACCESS_CERT_URL?: string;
  /** Cloudflare Access application audience tag (CF_ACCESS_AUD). */
  CF_ACCESS_AUD?: string;
  /** When "1", reject anonymous write-risk proxy calls (strict deployments). */
  REQUIRE_AUTH_WRITE?: string;
  /** OAuth 2.1 resource-server (RFC 8707). Optional — when unset, bearer validation is disabled and the server stays open (runbook §6). */
  OAUTH_JWKS_URL?: string;
  /** RFC 9207 expected token issuer (optional; falls back to the JWKS URL origin). */
  OAUTH_ISSUER?: string;
  /** RFC 8707 resource URI that a bearer token's `aud` claim MUST match. */
  RESOURCE_ID?: string;
  /** D1 database backing per-tool usage counters (E-2). Optional — usage
   *  endpoints degrade to 503 when unbound. */
  USAGE_DB?: D1Database;
  /** Shared admin secret gating POST /servers/:id/approve + GET /analytics/tools
   *  (E-1/E-2). Set via `wrangler secret put` — never committed. When unset,
   *  the governed endpoints answer 503 (not configured) rather than silently
   *  opening. Cloudflare Access is the planned successor (see fix-plan). */
  ADMIN_SECRET?: string;
  /** Internal bridge secret gating POST /internal/usage (E-2). The bridge
   *  write-side POSTs {server, tool} with header `X-Internal-Usage-Key`. */
  INTERNAL_USAGE_KEY?: string;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Category = 'design' | 'crypto' | 'government' | 'finance' | 'social' | 'infra' | 'local' | 'external';
type Status = 'live' | 'unverified' | 'degraded' | 'down';
type Health = 'up' | 'degraded' | 'down' | 'unknown';
/** Governance approval state (E-1). Public lens shows verified status only;
 *  the governed lens (auth flag) renders this. */
type Approval = 'approved' | 'pending' | 'blocked';
/** Catalog provenance (A-2): P31 fleet, official upstream registry, or
 *  self-registered external community server. */
type Source = 'p31' | 'official' | 'external';

/** OAuth 2.1 governance metadata per catalog entry (A-2). */
interface OAuthMeta {
  enabled: boolean;
  resource: string | null;
  authorization_servers: string[];
}

interface VerifyMeta {
  alg: 'ML-DSA-65';
  sbt?: boolean;
  checkedAt: string;
}

interface ReviewMeta {
  signedBy: string;
  alg: 'Ed25519';
  signature: string;
  checkedAt: string;
}

interface CapabilityManifest {
  tools: string[];
  dataSources: string[];
  externalServices: string[];
  writeCapable: boolean;
}

interface QuotaSpec {
  read: { perMinute: number; perDay: number };
  write: { perMinute: number; perDay: number };
}

interface ScanMeta {
  verdict: 'clean' | 'suspicious' | 'malicious';
  score: number;
  maliciousCount: number;
  suspiciousCount: number;
  scannedAt: string;
}

interface ToolDef {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface McpServerEntry {
  id: string;
  name: string;
  endpoint: string;
  kind: 'remote' | 'local';
  category: Category;
  description: string;
  tags: string[];
  author: string;
  icon?: string;
  status: Status;
  verify?: VerifyMeta;
  review?: ReviewMeta;
  capabilities?: CapabilityManifest;
  quota?: QuotaSpec;
  scan?: ScanMeta;
  needsReview?: boolean;
  monetized?: boolean;
  readOnlySafe: boolean;
  binding?: keyof Env;
  tools?: ToolDef[];
  localNote?: string;
  /** Governance approval state (E-1) — persisted for registered entries,
   *  derived at merge time for the curated fleet. */
  approval?: Approval;
  /** Protocol revision or transport label ('2026-07-28', 'stdio',
   *  'streamable-http', …) captured at registration / curated for the fleet. */
  protocol?: string;
  /** Free-form role label ('p31 fleet server', 'community server', …). */
  role?: string;
  /** MCP conformance badge — live-probed (see probeConformance). */
  conformance?: ConformanceRecord;
}

interface HealthRecord {
  status: Health;
  latencyMs: number;
  checkedAt: string;
  detail?: string;
}

/** Live-probed MCP conformance badge (2026-07-28 stateless contract).
 *  Populated lazily by probeConformance (KV-cached, CONFORMANCE_TTL) —
 *  derived data, never curated by hand. */
interface ConformanceRecord {
  discover: boolean;
  resultType: boolean;
  headerEnforced: boolean;
  checkedAt: string;
  detail?: string;
}

// ─── Official catalog (curated P31 fleet) ──────────────────────────────────

const OFFICIAL_CATALOG: McpServerEntry[] = [
  {
    id: 'p31-crypto',
    name: 'PQC Crypto',
    endpoint: 'https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'crypto',
    description: 'Post-quantum crypto — ML-DSA-65 keygen/sign/verify, ML-KEM-768, SLH-DSA-128s, SD-JWT, Taler, x402.',
    tags: ['post-quantum', 'signing', 'kem', 'identity'],
    author: 'P31 Labs, Inc.',
    icon: '🔐',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'P31_CRYPTO_MCP',
  },
  {
    id: 'p31-justice-hub',
    name: 'Sovereign Justice',
    endpoint: 'https://p31-justice-hub.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'government',
    description: 'Evidence chain (Ed25519 + ML-DSA-65), 2-of-3 escrow, ODR case/offer/resolve.',
    tags: ['evidence', 'escrow', 'odr', 'legal'],
    author: 'P31 Labs, Inc.',
    icon: '⚖️',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'P31_JUSTICE_HUB',
  },
  {
    id: 'bros',
    name: 'BROS Care',
    endpoint: 'https://bros.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'social',
    description: 'Persona switching (dad/sj/cj/wj), signaling rooms, care issuance, crisis pings.',
    tags: ['care', 'signaling', 'personas', 'family'],
    author: 'P31 Labs, Inc.',
    icon: '💞',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'BROS',
  },
  {
    id: 'dads',
    name: 'DADS Trust Engine',
    endpoint: 'https://dads.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'social',
    description: 'Incremental EigenTrust, task dispatch, LOVE minting (emotional 1.4× / self-care 1.3×).',
    tags: ['trust', 'tasks', 'love-economy'],
    author: 'P31 Labs, Inc.',
    icon: '🤝',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'DADS',
  },
  {
    id: 'marketplace-mcp',
    name: 'P31 Marketplace',
    endpoint: 'https://marketplace-mcp.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'finance',
    description: 'Sovereign Marketplace — listings, offers, trades, escrow, disputes (SHA-256 evidence).',
    tags: ['commerce', 'escrow', 'listings', 'finance'],
    author: 'P31 Labs, Inc.',
    icon: '🛒',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'MARKETPLACE',
  },
  {
    id: 'phenix-wallet',
    name: 'Phenix Wallet',
    endpoint: 'https://phenix-wallet-mcp.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'finance',
    description: 'Vault create/unlock/lock, credential store/present, recovery guardians.',
    tags: ['vault', 'credentials', 'wallet', 'identity'],
    author: 'P31 Labs, Inc.',
    icon: '💠',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'PHENIX_WALLET',
  },
  {
    id: 'music-maker-mcp',
    name: 'Spatial Music Maker',
    endpoint: 'https://music-maker-mcp.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'social',
    description: 'Observe/place/clear/name/trigger the family\u2019s spatial composition (5 tools).',
    tags: ['music', 'composition', 'family', 'realtime'],
    author: 'P31 Labs, Inc.',
    icon: '🎵',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'MUSIC_MAKER_MCP',
  },
  {
    id: 'roblox-bridge',
    name: 'Roblox Bridge',
    endpoint: 'https://roblox-bridge.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'social',
    description: 'Roblox bridge — REST bridge (create, deploy, terrain, worlds, skin; 15 HTTP tools over /tools/list + /tools/call). No MCP surface — relabeled as a non-MCP connector.',
    tags: ['roblox', 'gaming', 'worlds'],
    author: 'P31 Labs, Inc.',
    icon: '🧱',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    role: 'roblox bridge (not MCP)',
    protocol: 'n/a — not an MCP server',
    readOnlySafe: false,
    binding: 'ROBLOX_BRIDGE',
  },
  {
    id: 'p31-mcp-server',
    name: 'P31 Native MCP',
    endpoint: 'https://p31-mcp-server.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'infra',
    description: 'P31 native MCP front door — oasis, phos, jitterbug, healer, bus (9 core tools).',
    tags: ['oasis', 'phos', 'cli', 'front-door'],
    author: 'P31 Labs, Inc.',
    icon: '🛰️',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'P31_MCP_SERVER',
  },
  {
    id: 'p31-shell',
    name: 'P31 Sovereign Shell',
    endpoint: 'https://p31-shell.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'infra',
    description: 'Sovereign shell — 90+ commands: spoons, navigation, identity, mesh, cognitive tools, MCP.',
    tags: ['shell', 'sovereign', 'commands', 'mesh'],
    author: 'P31 Labs, Inc.',
    icon: '🖥️',
    status: 'degraded',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'P31_SHELL',
  },
  {
    id: 'x402-gateway',
    name: 'x402 Payment Gateway',
    endpoint: 'https://mcp-x402-gateway.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'finance',
    description: 'x402 pay-per-request MCP gateway — free + metered tools with a 402 challenge.',
    tags: ['payments', 'x402', 'metered', 'billing'],
    author: 'P31 Labs, Inc.',
    icon: '💳',
    status: 'degraded',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'X402_GATEWAY',
  },
  {
    id: 'spaceship-relay',
    name: 'Spaceship Relay',
    endpoint: 'https://spaceship-relay.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'infra',
    description: 'Spaceship Earth relay — telemetry, LED control, mesh presence for the geodesic dome.',
    tags: ['spaceship', '3d', 'telemetry', 'mesh'],
    author: 'P31 Labs, Inc.',
    icon: '🚀',
    status: 'degraded',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    binding: 'SPACESHIP_RELAY',
  },
  {
    id: 'design-mcp',
    name: 'Design System MCP',
    endpoint: 'https://p31-design-mcp.trimtab-signal.workers.dev/mcp',
    kind: 'remote',
    category: 'design',
    description: 'P31 Design System — tokens, components, recipes, generation, WCAG audit, parity validation.',
    tags: ['design-system', 'tokens', 'components', 'audit'],
    author: 'P31 Labs, Inc.',
    icon: '🎨',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: true,
    binding: 'DESIGN_MCP',
  },
  {
    id: 'soulsafe',
    name: 'SOULSAFE Architect',
    endpoint: 'local://cli/soulsafe-server.js',
    kind: 'local',
    category: 'infra',
    description: 'SOULSAFE 3-gate verification — competence, Red Board, OQE, severity, deploy clearing.',
    tags: ['governance', 'verification', 'protocol', '3-gate'],
    author: 'P31 Labs, Inc.',
    icon: '🛡️',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: true,
    localNote: 'Local stdio server — add via opencode/claude config (node cli/soulsafe-server.js).',
  },
  {
    id: 'oasis',
    name: 'Oasis CLI',
    endpoint: 'local://cli/mcp-server.js',
    kind: 'local',
    category: 'local',
    description: 'Oasis TUI session state — status, todos, theme, mode, sandbox execute.',
    tags: ['cli', 'session', 'sandbox'],
    author: 'P31 Labs, Inc.',
    icon: '🌿',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: false,
    localNote: 'Local stdio server — provides sandbox shell execution; connect via opencode config.',
  },
  {
    id: 'phos-forge',
    name: 'PHOS Forge',
    endpoint: 'local://cli/phos-forge-mcp.mjs',
    kind: 'local',
    category: 'local',
    description: 'PHOS cognitive toolkit — adopt, classify, learn, rollback, cartographer, healer (26+ tools).',
    tags: ['cognitive', 'phos', 'cli', 'classification'],
    author: 'P31 Labs, Inc.',
    icon: '🧠',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: true,
    localNote: 'Local stdio server — node tools/phos-forge/mcp-server.mjs.',
  },
  {
    id: 'component-registry',
    name: 'Component Registry',
    endpoint: 'local://cli/component-registry.js',
    kind: 'local',
    category: 'design',
    description: 'PHOS component registry — list components, tokens, search, spoon guide (5 tools).',
    tags: ['components', 'design', 'registry'],
    author: 'P31 Labs, Inc.',
    icon: '🧩',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: true,
    localNote: 'Local stdio server — node cli/component-registry.js.',
  },
  {
    id: 'ground-truth',
    name: 'Ground Truth',
    endpoint: 'local://cli/ground-truth-server.js',
    kind: 'local',
    category: 'infra',
    description: 'Canonical verify invariants — toolchain, gates, direct binaries from ground-truth.json.',
    tags: ['verify', 'invariants', 'toolchain', 'oqe'],
    author: 'P31 Labs, Inc.',
    icon: '🧭',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    readOnlySafe: true,
    localNote: 'Local stdio server — node cli/ground-truth-server.js.',
  },
  {
    id: 'vision-reviewer',
    name: 'Vision Reviewer',
    endpoint: 'https://phos-ai-proxy.trimtab-signal.workers.dev/vision',
    kind: 'remote',
    category: 'design',
    description: 'Workers AI vision specialist (Llama 3.2 11B + Moondream 3.1) — judges UI screenshots against the P31 anti-slop rubric: layout novelty, visual-identity distinctiveness, component-pattern novelty. Also geometry detection (point/detect) for element locations. AI vision POST endpoint, not an MCP surface.',
    tags: ['vision', 'design', 'review', 'screenshot'],
    author: 'P31 Labs, Inc.',
    icon: '👁️',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    role: 'vision reviewer (not MCP)',
    protocol: 'n/a — not an MCP server',
    capabilities: {
      tools: ['vision_review', 'vision_detect'],
      dataSources: ['image/url', 'image/base64'],
      externalServices: ['@cf/meta/llama-3.2-11b-vision-instruct', '@cf/moondream/moondream3.1-9B-A2B'],
      writeCapable: false,
    },
    readOnlySafe: true,
    binding: 'PHOS_AI_PROXY',
  },
  {
    id: 'vision-layout',
    name: 'Vision Layout Parity',
    endpoint: 'https://phos-ai-proxy.trimtab-signal.workers.dev/vision',
    kind: 'remote',
    category: 'design',
    description: 'Layout parity reviewer — compares a UI screenshot against a reference (sidebar proportion, brand placement, primary-action prominence, footer composition). AI vision POST endpoint, not an MCP surface.',
    tags: ['vision', 'layout', 'parity', 'design'],
    author: 'P31 Labs, Inc.',
    icon: '📐',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    role: 'vision layout parity (not MCP)',
    protocol: 'n/a — not an MCP server',
    capabilities: {
      tools: ['vision_review'],
      dataSources: ['image/url', 'image/base64'],
      externalServices: ['@cf/meta/llama-3.2-11b-vision-instruct'],
      writeCapable: false,
    },
    readOnlySafe: true,
    binding: 'PHOS_AI_PROXY',
  },
  {
    id: 'vision-sensory',
    name: 'Vision Sensory Safety',
    endpoint: 'https://phos-ai-proxy.trimtab-signal.workers.dev/vision',
    kind: 'remote',
    category: 'design',
    description: 'Neurodivergent sensory reviewer — starfield opacity/density, text contrast over ambient layers, reduced-stimulation and reduced-motion states. P31 neuroinclusive lens. AI vision POST endpoint, not an MCP surface.',
    tags: ['vision', 'sensory', 'neurodivergent', 'contrast', 'design'],
    author: 'P31 Labs, Inc.',
    icon: '🧘',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    role: 'vision sensory safety (not MCP)',
    protocol: 'n/a — not an MCP server',
    capabilities: {
      tools: ['vision_review'],
      dataSources: ['image/url', 'image/base64'],
      externalServices: ['@cf/meta/llama-3.2-11b-vision-instruct'],
      writeCapable: false,
    },
    readOnlySafe: true,
    binding: 'PHOS_AI_PROXY',
  },
  {
    id: 'vision-identity',
    name: 'Vision Identity Surface',
    endpoint: 'https://phos-ai-proxy.trimtab-signal.workers.dev/vision',
    kind: 'remote',
    category: 'design',
    description: 'Sovereign identity surface reviewer — user-chip legibility (pickle name, short DID at tertiary contrast), hover/focus affordance, spoon dial placement, pre-mint state. AI vision POST endpoint, not an MCP surface.',
    tags: ['vision', 'identity', 'did', 'design'],
    author: 'P31 Labs, Inc.',
    icon: '🪪',
    status: 'live',
    verify: { alg: 'ML-DSA-65', checkedAt: '2026-09-23T00:00:00Z' },
    role: 'vision identity surface (not MCP)',
    protocol: 'n/a — not an MCP server',
    capabilities: {
      tools: ['vision_review'],
      dataSources: ['image/url', 'image/base64'],
      externalServices: ['@cf/meta/llama-3.2-11b-vision-instruct'],
      writeCapable: false,
    },
    readOnlySafe: true,
    binding: 'PHOS_AI_PROXY',
  },
];

// ─── A: Data federation — provenance, roles, OAuth, pricing ────────────────
// Lane A (runbook §4): each catalog entry gains `source`, governance `role`,
// `oauth`, `protocol`, `approval`, live-probed tools + health, and `price_tier`
// mapped from the x402 gateway PRICING table (static export — see
// workers/mcp-x402-gateway/src/index.ts; kept in lockstep here).

const OFFICIAL_IDS = new Set(OFFICIAL_CATALOG.map((e) => e.id));

/** Non-MCP connector marker — relabeled catalog entries that are NOT MCP
 *  servers (HTTP/REST/AI endpoints). Same relabel-not-remove precedent as the
 *  federation-bridge/ledger-bridge fix (docs/fix-plans/false-mcp-members-relabel.md):
 *  role + protocol strings, rows stay visible. Probes skip them. */
const isNonMcpConnector = (e: McpServerEntry): boolean => e.protocol === 'n/a — not an MCP server';

/** Curated role labels for the P31 fleet (used by the merge + summary). */
const P31_ROLES: Record<string, string> = {
  'p31-crypto': 'post-quantum crypto',
  'p31-justice-hub': 'legal evidence + ODR',
  'bros': 'family care relay',
  'dads': 'trust + task engine',
  'marketplace-mcp': 'sovereign commerce',
  'phenix-wallet': 'wallet + credentials',
  'music-maker-mcp': 'family spatial music',
  'roblox-bridge': 'roblox bridge (not MCP)',
  'p31-mcp-server': 'front-door toolset',
  'p31-shell': 'sovereign shell',
  'x402-gateway': 'payment gateway',
  'spaceship-relay': 'dome telemetry relay',
  'design-mcp': 'design system',
  'soulsafe': 'governance verification',
  'oasis': 'CLI session',
  'phos-forge': 'cognitive toolkit',
  'component-registry': 'component registry',
  'ground-truth': 'verify registry',
  'vision-reviewer': 'vision reviewer (not MCP)',
  'vision-layout': 'vision layout parity (not MCP)',
  'vision-sensory': 'vision sensory safety (not MCP)',
  'vision-identity': 'vision identity surface (not MCP)',
};

/** Fleet servers with OAuth 2.1 deployed on their public HTTP surface
 *  (docs/enterprise/api/mcp-server-protocol-status.md, 2026-10-11 wave). */
const P31_OAUTH_ENABLED = new Set([
  'bros',
  'dads',
  'p31-justice-hub',
  'p31-crypto-mcp',
  'phenix-wallet-mcp',
  'marketplace-mcp',
]);

/** x402 gateway PRICING (static mirror — keep in lockstep with
 *  workers/mcp-x402-gateway/src/index.ts). Tool name → price spec. */
const GATEWAY_PRICING: Record<string, { price: string; network: string; description: string }> = {
  'oasis_execute': { price: '0.05', network: 'base-sepolia', description: 'Host command execution (sandboxed)' },
  'phos-adopt': { price: '0.05', network: 'base-sepolia', description: 'File adoption (spoon-gated)' },
  'phos-learn': { price: '0.05', network: 'base-sepolia', description: 'Filesystem scan + learn' },
  'phos-rollback': { price: '0.05', network: 'base-sepolia', description: 'Revert adopted moves' },
  'phos-watch': { price: '0.05', network: 'base-sepolia', description: 'Background file watcher' },
  'bus-emit': { price: '0.05', network: 'base-sepolia', description: 'Emit event-bus message' },
  'phos-deploy': { price: '0.05', network: 'base-sepolia', description: 'Cloudflare deploy (spoon-gated)' },
  'healer-remediate': { price: '0.05', network: 'base-sepolia', description: 'Autonomous remediation' },
  'jitterbug-run': { price: '0.25', network: 'base-sepolia', description: 'Ambient exocortex LLM orchestration (spoon-gated)' },
  'brain-dump': { price: '0.25', network: 'base-sepolia', description: 'LLM elaboration (premium-high)' },
  'soulsafe_gate1_self_review': { price: '0.01', network: 'base-sepolia', description: 'SOULSAFE Gate 1 self-review checklist' },
  'soulsafe_gate2_cross_review': { price: '0.01', network: 'base-sepolia', description: 'SOULSAFE Gate 2 cross-review (information barrier)' },
  'truth_verify_baseline': { price: '0.01', network: 'base-sepolia', description: 'Verify-suite baseline payload' },
  'truth_register_fact': { price: '0.01', network: 'base-sepolia', description: 'Write a verified fact to ground-truth registry' },
  'soulsafe_gate3_full': { price: '0.05', network: 'base-sepolia', description: 'SOULSAFE Gate 3 architect verification (full suite)' },
  'soulsafe_run_protocol': { price: '0.05', network: 'base-sepolia', description: 'SOULSAFE full 3-gate protocol run' },
  'neo_pixel_control': { price: '0.01', network: 'base-sepolia', description: 'Set NeoPixel LED mode/color/brightness (spaceship)' },
};

function tierFromPrice(price: string): string | null {
  if (price === '0.01') return 'metered-low';
  if (price === '0.05') return 'premium';
  if (price === '0.25') return 'premium-high';
  return null;
}

const TIER_RANK: Record<string, number> = { 'metered-low': 1, 'premium': 2, 'premium-high': 3 };

/** Map a server's live tool names to its x402 price tier (the highest tier
 *  among tools that appear in the gateway PRICING table, else null). */
function priceTierFor(toolNames: string[]): { tier: string | null; pricedTools: string[] } {
  const pricedTools = toolNames.filter((n) => Boolean(GATEWAY_PRICING[n]));
  let tier: string | null = null;
  for (const name of pricedTools) {
    const t = tierFromPrice(GATEWAY_PRICING[name].price);
    if (t && (!tier || TIER_RANK[t] > TIER_RANK[tier])) tier = t;
  }
  return { tier, pricedTools };
}

// ─── Storage keys ───────────────────────────────────────────────────────────

const KV_SCHEMAS_PREFIX = 'schemas:';
const KV_HEALTH_PREFIX = 'health:';
const KV_CONFORMANCE_PREFIX = 'conformance:';
const KV_SCAN_PREFIX = 'scan:';
const KV_CAPS_PREFIX = 'caps:';
const KV_REGISTERED = 'servers:registered';
const KV_REJECTED = 'servers:rejected';
const KV_RATELIMIT_PREFIX = 'ratelimit:';
const KV_AUDIT_LOG = 'audit:log';
const KV_AUDIT_HEAD = 'audit:head';
const KV_LOGS = 'logs:events';
const KV_ERRORS = 'errors:events';
const KV_TRANSPARENCY_LOG = 'transparency:log';
const KV_TRANSPARENCY_HEAD = 'transparency:head';
const KV_BASELINE_PREFIX = 'baseline:';
const KV_BASELINE_SCHEMAS_PREFIX = 'baseline:schemas:';
const KV_ROLES_PREFIX = 'roles:authn:';
const KV_GROUP_ROLES_PREFIX = 'roles:mapping:';
const KV_TOOLRATE_PREFIX = 'ratelimit:tool:';
const KV_REJECTIONS_PREFIX = 'rejections:';
const KV_UPSTREAM_OFFICIAL = 'upstream:official';
const KV_TTL = 300; // 5 minutes for tool schemas
const HEALTH_TTL = 120; // 2 minutes for health probes
const CONFORMANCE_TTL = 300; // 5 minutes for conformance probes (3 POSTs per server)
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 3600; // 1 hour
const AUDIT_MAX = 2000; // bounded audit chain (rolling)
const LOG_MAX = 500; // bounded structured log ring
const ERROR_MAX = 500; // bounded error ring

// ─── Helpers ────────────────────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...corsHeaders(), ...extraHeaders } });
}

// ──────────────────────────────────────────────────────────────────────────────
// OAuth 2.1 resource-server (RFC 8707 audience binding + RFC 9207 `iss`).
// Ported from workers/p31-capital-machine-mcp/src/index.ts (fleet
// reference, 2026-10-12 wave). WebCrypto only (RS256/ES256/Ed25519), zero
// new dependencies, 15-minute JWKS cache. Active only when
// OAUTH_JWKS_URL is configured (env opt-in): any supplied
// `Authorization: Bearer` token then MUST validate (alg/kid/signature/exp,
// aud == RESOURCE_ID, iss == fleet AS issuer) or the call is rejected with
// HTTP 401 — never silently ignored. Without a Bearer header, behavior is
// unchanged: public tool discovery stays open (runbook §6 do-nots).
// ──────────────────────────────────────────────────────────────────────────────

const OAUTH_AS_ISSUER = 'https://oauth-relay.trimtab-signal.workers.dev';
const OAUTH_AS_JWKS_URL = 'https://oauth-relay.trimtab-signal.workers.dev/.well-known/jwks.json';
const RESOURCE_URI = 'https://mcp-registry.trimtab-signal.workers.dev/mcp';
const JWKS_CACHE_TTL_MS = 15 * 60 * 1000;

let jwksCache: { source: string; fetchedAt: number; keys: Record<string, JsonWebKey> } | null = null;

/** Base64url → base64, then decode to a string. */
function b64urlDecode(s: string): string {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return atob(base64);
}

/** Base64url → bytes. */
function b64urlToBytes(s: string): Uint8Array {
  const binary = b64urlDecode(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode (without verifying) a JWT into header + payload. Returns null on malformed input. */
function decodeJwt(token: string): { header: { kid?: string; alg?: string }; payload: Record<string, unknown> } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64urlDecode(parts[0])) as { kid?: string; alg?: string };
    const payload = JSON.parse(b64urlDecode(parts[1])) as Record<string, unknown>;
    if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') return null;
    return { header, payload };
  } catch {
    return null;
  }
}

/** Fetch (with 15-min module-level cache) the JWKS for the fleet AS, keyed by kid. */
async function fetchJwksKeys(source: string): Promise<Record<string, JsonWebKey>> {
  const now = Date.now();
  if (jwksCache && jwksCache.source === source && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(source);
  if (!res.ok) return {};
  const body = (await res.json().catch(() => ({}))) as { keys?: unknown[] };
  const keys: Record<string, JsonWebKey> = {};
  for (const raw of body.keys ?? []) {
    const jwk = raw as JsonWebKey & { kid?: string };
    if (jwk && typeof jwk.kid === 'string') keys[jwk.kid] = jwk;
  }
  jwksCache = { source, fetchedAt: now, keys };
  return keys;
}

/** WebCrypto algorithm descriptor for a supported JWS alg. */
function webAlg(jwk: JsonWebKey, alg: string): { name: string; hash?: string; namedCurve?: string } {
  if (alg === 'ES256') return { name: 'ECDSA', namedCurve: (jwk.crv as string) || 'P-256' };
  if (alg === 'Ed25519') return { name: 'Ed25519' };
  return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
}

/** Verify a JWS signature over `signedData` with WebCrypto. Never throws. */
async function verifySignature(jwk: JsonWebKey, alg: string, signedData: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const algSpec = webAlg(jwk, alg);
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, algSpec as any, false, ['verify']);
    return await crypto.subtle.verify(algSpec as any, key, signature, signedData);
  } catch {
    return false;
  }
}

/**
 * Validate an RFC 8707-bound OAuth 2.1 bearer token.
 * Returns { sub, scope? } on success, or null when:
 *  - no Bearer header present,
 *  - OAUTH_JWKS_URL / RESOURCE_ID unset,
 *  - token malformed, unknown alg/kid, bad signature, expired,
 *  - `aud` ≠ RESOURCE_ID (RFC 8707), or
 *  - `iss` ≠ OAUTH_ISSUER / issuer derived from the JWKS URL (RFC 9207 mix-up defense).
 * All wrapped in try/catch — never throws.
 */
async function verifyOAuthBearer(request: Request, env: Env): Promise<{ sub: string; scope?: string } | null> {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    if (!token || !env.OAUTH_JWKS_URL || !env.RESOURCE_ID) return null;

    const decoded = decodeJwt(token);
    if (!decoded) return null;

    const alg = decoded.header.alg ?? '';
    if (alg !== 'RS256' && alg !== 'ES256' && alg !== 'Ed25519') return null;
    const kid = decoded.header.kid;
    if (!kid) return null;

    const keys = await fetchJwksKeys(env.OAUTH_JWKS_URL);
    const jwk = keys[kid];
    if (!jwk) return null;

    const parts = token.split('.');
    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = b64urlToBytes(parts[2]);
    if (!(await verifySignature(jwk, alg, signedData, signature))) return null;

    const payload = decoded.payload;
    const exp = payload.exp;
    if (typeof exp !== 'number' || exp <= Math.floor(Date.now() / 1000)) return null;

    // RFC 8707: the token's audience MUST be bound to our resource.
    const aud = payload.aud;
    const audOk = Array.isArray(aud) ? aud.includes(env.RESOURCE_ID) : aud === env.RESOURCE_ID;
    if (!audOk) return null;

    // RFC 9207: the token's issuer MUST match the fleet AS (explicit
    // OAUTH_ISSUER wins; otherwise derive from the JWKS URL origin).
    const iss = payload.iss;
    const expectedIssuer = env.OAUTH_ISSUER ?? issuerFromJwks(env.OAUTH_JWKS_URL) ?? null;
    if (typeof iss !== 'string' || !expectedIssuer || iss !== expectedIssuer) return null;

    return { sub: String(payload.sub ?? ''), scope: typeof payload.scope === 'string' ? payload.scope : undefined };
  } catch {
    return null;
  }
}

/** Derive the IdP issuer (origin) from a JWKS URL, or null. */
function issuerFromJwks(jwksUrl: string): string | null {
  try {
    return new URL(jwksUrl).origin;
  } catch {
    return null;
  }
}

/** RFC 8414 authorization-server metadata — points at the fleet AS (oauth-relay). */
function oauthAsMetadata(resource: string): Record<string, unknown> {
  return {
    issuer: OAUTH_AS_ISSUER,
    authorization_endpoint: `${OAUTH_AS_ISSUER}/authorize`,
    token_endpoint: `${OAUTH_AS_ISSUER}/token`,
    jwks_uri: OAUTH_AS_JWKS_URL,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    authorization_response_iss_parameter_supported: true,
    resource,
  };
}

/** RFC 9728 protected-resource metadata for this resource server. */
function protectedResourceMetadata(env: Env, resource: string, scopes: string[]): Record<string, unknown> {
  return {
    resource: env.RESOURCE_ID ?? resource,
    authorization_servers: [OAUTH_AS_ISSUER],
    scopes_supported: scopes,
  };
}

/** Envelope-shaped 401 body for a rejected bearer token (capital-machine mcpResult shape). */
function oauthGateError(id: unknown): Record<string, unknown> {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    _meta: { 'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION },
    result: {
      resultType: 'complete',
      content: [{ type: 'text', text: JSON.stringify({ error: 'invalid or unauthorized bearer token (RFC 8707 aud binding)' }) }],
      isError: true,
    },
  };
}

async function getAllEntries(env: Env): Promise<McpServerEntry[]> {
  const registeredRaw = await env.REGISTRY_KV.get(KV_REGISTERED);
  const registered: McpServerEntry[] = registeredRaw ? JSON.parse(registeredRaw) : [];
  return [...OFFICIAL_CATALOG, ...registered];
}

// ─── A-1: official MCP Registry upstream federation ─────────────────────────
// The official registry (registry.modelcontextprotocol.io) is a read-only
// REST metadata standard. FEDERATE-DON'T-COMPETE (runbook §2): we scrape it
// hourly (KV-cached, ~1h TTL), never per request, and consume it as a
// reference upstream — P31 listings always win on id collision.
// Failure policy (negative control): malformed payload / non-OK status /
// network error → log to the error ring and SKIP. Never throws, never blocks
// the P31 catalog.

const OFFICIAL_REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0/servers';
const UPSTREAM_TTL = 3600; // 1 hour — aggregator etiquette
const UPSTREAM_MAX = 300; // bound the federated response size

/** Normalized official-registry server record (one per isLatest version). */
interface OfficialUpstreamServer {
  name: string;
  title?: string;
  description?: string;
  version?: string;
  remotes: Array<{ type: string; url: string }>;
  repository?: { url: string; source?: string };
  isLatest?: boolean;
  updatedAt?: string;
}

/**
 * Normalize + validate the official registry payload. Returns null when the
 * shape is malformed (never throws) — the caller logs and skips.
 * Dedupes by qualified name, preferring the `isLatest` version.
 */
function normalizeOfficialServers(body: unknown): OfficialUpstreamServer[] | null {
  if (!body || typeof body !== 'object') return null;
  const servers = (body as { servers?: unknown }).servers;
  if (!Array.isArray(servers)) return null;
  const out: OfficialUpstreamServer[] = [];
  for (const raw of servers) {
    if (!raw || typeof raw !== 'object') continue;
    const server = (raw as { server?: unknown }).server;
    if (!server || typeof server !== 'object') continue;
    const s = server as Record<string, unknown>;
    if (typeof s.name !== 'string' || !s.name) continue;
    if (!Array.isArray(s.remotes)) continue;
    const remotes = s.remotes
      .filter((r): r is { type: string; url: string } => Boolean(r) && typeof (r as any)?.type === 'string' && typeof (r as any)?.url === 'string');
    if (remotes.length === 0) continue;
    const meta = (raw as { _meta?: Record<string, { isLatest?: boolean; updatedAt?: string }> })._meta;
    const officialMeta = meta?.['io.modelcontextprotocol.registry/official'];
    const isLatest = Boolean(officialMeta?.isLatest);
    // The upstream payload carries every published version of a server name —
    // keep one record per name, preferring the isLatest version.
    const idx = out.findIndex((e) => e.name === s.name);
    if (idx !== -1) {
      if (isLatest) out[idx] = normalizeUpstreamRecord(s, remotes, isLatest, officialMeta?.updatedAt);
      continue;
    }
    out.push(normalizeUpstreamRecord(s, remotes, isLatest, officialMeta?.updatedAt));
  }
  return out;
}

function normalizeUpstreamRecord(s: Record<string, unknown>, remotes: Array<{ type: string; url: string }>, isLatest: boolean, updatedAt?: string): OfficialUpstreamServer {
  return {
    name: s.name as string,
    title: typeof s.title === 'string' ? s.title : undefined,
    description: typeof s.description === 'string' ? s.description : undefined,
    version: typeof s.version === 'string' ? s.version : undefined,
    remotes,
    repository: s.repository && typeof s.repository === 'object' ? s.repository as { url: string; source?: string } : undefined,
    isLatest,
    updatedAt,
  };
}

/**
 * Fetch the official upstream catalog (KV-cached ~1h). Returns [] on any
 * failure after logging — never throws (negative control).
 */
async function fetchOfficialUpstream(env: Env): Promise<OfficialUpstreamServer[]> {
  const cached = await env.REGISTRY_KV.get(KV_UPSTREAM_OFFICIAL).catch(() => null);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed as OfficialUpstreamServer[];
    } catch { /* corrupted cache — refetch below */ }
  }
  try {
    const res = await fetch(OFFICIAL_REGISTRY_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      await appendError(env, { source: 'official-registry', message: `upstream fetch HTTP ${res.status}`, url: OFFICIAL_REGISTRY_URL });
      return [];
    }
    const body: unknown = await res.json().catch(() => null);
    const servers = normalizeOfficialServers(body);
    if (!servers) {
      await appendError(env, { source: 'official-registry', message: 'malformed upstream payload — skipped (negative control)', url: OFFICIAL_REGISTRY_URL });
      return [];
    }
    if (servers.length === 0) {
      await appendError(env, { source: 'official-registry', message: 'upstream payload empty — skipped', url: OFFICIAL_REGISTRY_URL });
      return [];
    }
    // Cache only a successful, non-empty parse — transient failures retry on
    // the next request instead of being cached.
    await env.REGISTRY_KV.put(KV_UPSTREAM_OFFICIAL, JSON.stringify(servers), { expirationTtl: UPSTREAM_TTL }).catch(() => {});
    await appendLog(env, { level: 'info', method: 'GET', path: '/v0/servers (upstream)', status: 200, latencyMs: 0, serverId: `upstream:${servers.length}` });
    return servers;
  } catch (e: any) {
    await appendError(env, { source: 'official-registry', message: `upstream fetch failed: ${String(e?.message ?? e)}`, url: OFFICIAL_REGISTRY_URL });
    return [];
  }
}

// ─── A-2: merge — every catalog entry gains source + governance metadata ────

/** A catalog entry after federation enrichment (summary-ready). */
interface FederatedEntry extends McpServerEntry {
  source: Source;
  approval: Approval;
  role: string;
  protocol: string;
  oauth: OAuthMeta;
  /** Provenance for official-upstream listings (reference metadata). */
  upstream?: {
    name: string;
    version: string | null;
    repository: string | null;
    updatedAt: string | null;
  };
}

function oauthMetaFor(entry: McpServerEntry): OAuthMeta {
  const enabled = P31_OAUTH_ENABLED.has(entry.id);
  return {
    enabled,
    resource: enabled ? entry.endpoint : null,
    authorization_servers: enabled ? [OAUTH_AS_ISSUER] : [],
  };
}

/** Enrich a P31/registered entry with federation metadata (source/role/approval). */
function enrichEntry(entry: McpServerEntry, source: Source, approval: Approval): FederatedEntry {
  return {
    ...entry,
    source,
    approval: entry.approval ?? approval,
    role: entry.role ?? P31_ROLES[entry.id] ?? (entry.kind === 'local' ? 'local stdio tool' : source === 'p31' ? 'p31 fleet server' : 'community server'),
    protocol: entry.protocol ?? (entry.kind === 'local' ? 'stdio' : '2026-07-28'),
    oauth: oauthMetaFor(entry),
  };
}

/** Convert an official-upstream record into a reference catalog entry.
 *  Reference-only: not live-probed, not callable through the proxy, approval
 *  stays 'pending' until P31 governance adopts it. */
function upstreamToEntry(u: OfficialUpstreamServer): FederatedEntry {
  const id = u.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `upstream-${u.name.length}`;
  return {
    id,
    name: u.title ?? u.name,
    endpoint: u.remotes[0].url,
    kind: 'remote',
    category: 'external',
    description: u.description ?? '',
    tags: ['upstream', 'official-registry'],
    author: 'Official MCP Registry',
    icon: undefined,
    status: 'unverified',
    readOnlySafe: false,
    source: 'official',
    approval: 'pending',
    role: 'upstream community server',
    protocol: u.remotes[0].type || 'unknown',
    oauth: { enabled: false, resource: null, authorization_servers: [] },
    upstream: { name: u.name, version: u.version ?? null, repository: u.repository?.url ?? null, updatedAt: u.updatedAt ?? null },
  };
}

/** P31 + registered + official upstream, deduped by id (p31 wins first,
 *  registered second, upstream listings last). */
async function getFederatedEntries(env: Env): Promise<FederatedEntry[]> {
  const raw = await getAllEntries(env);
  const upstream = (await fetchOfficialUpstream(env)).slice(0, UPSTREAM_MAX);
  const federated: FederatedEntry[] = raw.map((e) =>
    enrichEntry(e, OFFICIAL_IDS.has(e.id) ? 'p31' : 'external', OFFICIAL_IDS.has(e.id) ? 'approved' : 'pending'));
  const seen = new Set(federated.map((e) => e.id));
  for (const u of upstream) {
    const entry = upstreamToEntry(u);
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    federated.push(entry);
  }
  return federated;
}

/** Find any entry (including official upstream listings) by id or name. */
async function findFederatedEntry(env: Env, id: string): Promise<FederatedEntry | null> {
  const entries = await getFederatedEntries(env);
  return entries.find((e) => e.id === id || e.name === id) ?? null;
}

// ─── MCP client (SDK v2) — outbound probes + call proxy ─────────────────────
// The hand-rolled stateless POST client was reimplemented on
// `@modelcontextprotocol/client` v2: `Client` +
// `StreamableHTTPClientTransport` with `versionNegotiation: { mode: 'auto' }`
// (server/discover probe first, plain legacy initialize fallback). The SDK
// emits the SEP-2575 `_meta` envelope and SEP-2243
// MCP-Protocol-Version/Mcp-Method/Mcp-Name headers on modern exchanges;
// `Mcp-Name` is set on every transport request via `requestInit`.

type FetchLikeFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface ConnectOutcome {
  client?: Client;
  error?: string;
}

async function connectMcpClient(
  env: Env,
  entry: McpServerEntry,
  timeoutMs = 6000,
  extraHeaders: Record<string, string> = {},
): Promise<ConnectOutcome> {
  const binding = entry.binding ? (env[entry.binding] as Fetcher | undefined) : undefined;
  const fetchFn: FetchLikeFn = (input, init) => {
    if (binding) {
      const req = typeof input === 'string' || input instanceof URL ? new Request(input, init ?? {}) : input;
      return binding.fetch(req);
    }
    return fetch(input, init);
  };
  const transport = new StreamableHTTPClientTransport(new URL(entry.endpoint), {
    fetch: fetchFn,
    requestInit: {
      headers: {
        // SEP-2243: identify the probed server on every POST.
        'Mcp-Name': entry.name,
        ...extraHeaders,
      },
    },
  });
  const client = new Client(
    { name: 'p31-mcp-registry', version: '2.0.0' },
    { versionNegotiation: { mode: 'auto', probe: { timeoutMs } } },
  );
  try {
    await client.connect(transport, { timeout: timeoutMs });
    return { client };
  } catch (e: any) {
    try { await client.close(); } catch { /* ignore */ }
    return { error: String(e?.message ?? e) };
  }
}

/** Extract a `YYYY-MM-DD` protocol revision from a negotiation failure message. */
function extractAdvertisedVersion(text: string): string | null {
  const m = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text);
  return m ? m[1] : null;
}

async function rpcCall(
  env: Env,
  entry: McpServerEntry,
  method: string,
  params: unknown,
  timeoutMs = 6000,
  extraHeaders: Record<string, string> = {},
  _stateless = false,
): Promise<{ result?: any; error?: any }> {
  const connected = await connectMcpClient(env, entry, timeoutMs, extraHeaders);
  if (!connected.client) return { error: { code: -32000, message: connected.error } };
  const client = connected.client;
  try {
    if (method === 'server/discover') {
      const discover = client.getDiscoverResult();
      if (discover) return { result: discover };
      return { error: { code: -32601, message: 'server/discover unsupported by remote' } };
    }
    if (method === 'tools/list') {
      const list = await client.listTools({}, { timeout: timeoutMs });
      return { result: { tools: list.tools } };
    }
    if (method === 'tools/call') {
      const p = (params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
      const result = await client.callTool(
        { name: p.name ?? '', arguments: p.arguments ?? {} },
        { timeout: timeoutMs, headers: extraHeaders },
      );
      return { result };
    }
    return { error: { code: -32601, message: `method not supported via the v2 client: ${method}` } };
  } catch (e: any) {
    return { error: { code: -32000, message: String(e?.message ?? e) } };
  } finally {
    try { await client.close(); } catch { /* ignore */ }
  }
}

async function probeTools(env: Env, entry: McpServerEntry): Promise<ToolDef[] | null> {
  if (entry.kind === 'local') return entry.tools ?? null;
  // Non-MCP connectors are never tool-probed (relabeled 2026-10-13).
  if (isNonMcpConnector(entry)) return null;

  // Stateless-first (SEP-2575): the v2 client auto-negotiates via
  // server/discover and falls back to the 2025-era initialize handshake.
  const connected = await connectMcpClient(env, entry, 6000);
  if (!connected.client) return null;
  const client = connected.client;
  try {
    const list = await client.listTools({}, { timeout: 6000 });
    const tools = list.tools;
    return Array.isArray(tools) ? (tools as ToolDef[]) : null;
  } catch {
    return null;
  } finally {
    try { await client.close(); } catch { /* ignore */ }
  }
}

/**
 * Full endpoint probe: the v2 client negotiates the era (server/discover
 * first, then the 2025-era initialize handshake for legacy servers) and
 * fetches tools/list. The negotiated protocol version is validated against
 * SUPPORTED_PROTOCOL_VERSIONS (2026-07-28 included); a fabricated revision
 * that breaks negotiation surfaces through the failure message.
 */
async function probeEndpoint(
  env: Env,
  entry: McpServerEntry,
): Promise<{ tools: ToolDef[] | null; detail?: string; protocol?: string }> {
  const connected = await connectMcpClient(env, entry, 6000);
  if (!connected.client) {
    // A 2025-era initialize result naming an unsupported (or fabricated)
    // revision surfaces through the legacy-handshake error — extract the
    // advertised version to keep the registration gate message identical.
    const claimed = extractAdvertisedVersion(connected.error ?? '');
    if (claimed && !SUPPORTED_PROTOCOL_VERSIONS.has(claimed)) {
      return { tools: null, detail: `unsupported protocol version ${claimed} — server must advertise one of ${[...SUPPORTED_PROTOCOL_VERSIONS].join(', ')}` };
    }
    return { tools: null, detail: `initialize failed: ${JSON.stringify({ code: -32000, message: connected.error })}` };
  }
  const client = connected.client;
  try {
    const advertised = client.getNegotiatedProtocolVersion();
    if (advertised && !SUPPORTED_PROTOCOL_VERSIONS.has(advertised)) {
      return { tools: null, detail: `unsupported protocol version ${advertised} — server must advertise one of ${[...SUPPORTED_PROTOCOL_VERSIONS].join(', ')}` };
    }
    const list = await client.listTools({}, { timeout: 6000 });
    const tools = list.tools;
    if (!Array.isArray(tools)) {
      return { tools: null, detail: 'tools/list returned no tool array', protocol: advertised ?? undefined };
    }
    return { tools: tools as ToolDef[], protocol: advertised ?? undefined };
  } catch (e: any) {
    return { tools: null, detail: `tools/list failed: ${JSON.stringify({ code: -32000, message: String(e?.message ?? e) })}` };
  } finally {
    try { await client.close(); } catch { /* ignore */ }
  }
}

async function probeHealth(env: Env, entry: McpServerEntry): Promise<HealthRecord> {
  if (entry.kind === 'local') {
    return { status: 'up', latencyMs: 0, checkedAt: new Date().toISOString(), detail: 'local — not probed from the edge' };
  }
  // Non-MCP connectors: no MCP surface to probe (relabeled 2026-10-13).
  if (isNonMcpConnector(entry)) {
    return { status: 'unknown', latencyMs: 0, checkedAt: new Date().toISOString(), detail: 'non-MCP connector — not probed (relabeled)' };
  }
  // Official-upstream listings are reference-only: never probed (aggregator
  // etiquette — we scrape the upstream API hourly, we do not probe each
  // listed server per request).
  if ((entry as FederatedEntry).source === 'official') {
    return { status: 'unknown', latencyMs: 0, checkedAt: new Date().toISOString(), detail: 'upstream listing — not probed (federation reference)' };
  }
  const cached = await env.REGISTRY_KV.get(KV_HEALTH_PREFIX + entry.id);
  if (cached) return JSON.parse(cached) as HealthRecord;

  const start = Date.now();
  const { tools, detail } = await probeEndpoint(env, entry);
  const latencyMs = Date.now() - start;

  let rec: HealthRecord;
  if (tools !== null && tools.length > 0) rec = { status: 'up', latencyMs, checkedAt: new Date().toISOString() };
  else if (tools !== null) rec = { status: 'degraded', latencyMs, checkedAt: new Date().toISOString(), detail: detail ?? 'reachable but returned zero tools' };
  else rec = { status: 'down', latencyMs, checkedAt: new Date().toISOString(), detail: detail ?? 'probe failed (handshake or tools/list error)' };

  await env.REGISTRY_KV.put(KV_HEALTH_PREFIX + entry.id, JSON.stringify(rec), { expirationTtl: HEALTH_TTL });
  return rec;
}

// ─── Conformance probe — the 2026-07-28 stateless contract badge ───────────
// Raw-fetch probe, not the v2 SDK client: the SDK always emits Mcp-* headers,
// and one of the three checks is that a headerless request must FAIL. Same
// pattern as probeHealth — lazy, KV-cached (CONFORMANCE_TTL), service binding
// preferred over public fetch (workers.dev → workers.dev DNS 1042). The three
// booleans mirror scripts/verify-mcp-conformance.mjs (a)(b)(d):
//
//   discover        — server/discover returns protocolVersion +
//                     supportedProtocolVersions + serverInfo under the full
//                     stateless envelope (SEP-2243 headers + params._meta).
//   resultType      — tools/list returns resultType "complete".
//   headerEnforced  — a request WITHOUT the Mcp-Method header fails cleanly
//                     (JSON-RPC error or HTTP 4xx/5xx). A silent 2xx result
//                     is a conformance gap.

/** Parse an MCP endpoint response: single JSON body or SSE `data:` frames. */
async function parseMcpProbeResponse(res: Response): Promise<Record<string, any>> {
  const text = await res.text();
  const strip = (s: string) => s.replace(/^event:\s*[^\n]*\n?/gm, '').replace(/^data:\s*/gm, '').trim();
  const stripped = strip(text);
  if (stripped.startsWith('{')) {
    try { return JSON.parse(stripped); } catch { /* fall through */ }
  }
  const frames = text.split('\n\n').map(strip).filter(Boolean);
  for (let i = frames.length - 1; i >= 0; i--) {
    try { return JSON.parse(frames[i]); } catch { /* skip */ }
  }
  try { return JSON.parse(text); } catch { return {}; }
}

function conformanceProbeBody(method: string, id: number) {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params: {
      _meta: {
        'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
        'io.modelcontextprotocol/clientInfo': { name: 'p31-mcp-registry-conformance', version: '2.0.0' },
        'io.modelcontextprotocol/clientCapabilities': {},
      },
    },
  };
}

function conformanceHeaders(method: string, name: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'Mcp-Method': method,
    'Mcp-Name': name,
    'MCP-Protocol-Version': PROTOCOL_VERSION,
  };
}

async function conformanceCheck(
  fetchFn: FetchLikeFn,
  entry: McpServerEntry,
  method: string,
  id: number,
  headers: Record<string, string>,
): Promise<{ status: number; body: Record<string, any> }> {
  const res = await fetchFn(entry.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(conformanceProbeBody(method, id)),
    signal: AbortSignal.timeout(8000),
  });
  return { status: res.status, body: await parseMcpProbeResponse(res) };
}

async function probeConformance(env: Env, entry: McpServerEntry): Promise<ConformanceRecord | null> {
  if (entry.kind === 'local') return null;
  // Non-MCP connectors have no MCP surface — excluded from the badge (relabeled 2026-10-13).
  if (isNonMcpConnector(entry)) return null;
  // Upstream listings are reference-only: never probed.
  if ((entry as FederatedEntry).source === 'official') return null;

  const cached = await env.REGISTRY_KV.get(KV_CONFORMANCE_PREFIX + entry.id);
  if (cached) return JSON.parse(cached) as ConformanceRecord;

  const binding = entry.binding ? (env[entry.binding] as Fetcher | undefined) : undefined;
  const fetchFn: FetchLikeFn = (input, init) => {
    if (binding) {
      const req = typeof input === 'string' || input instanceof URL ? new Request(input, init ?? {}) : input;
      return binding.fetch(req);
    }
    return fetch(input, init);
  };

  const rec: ConformanceRecord = {
    discover: false,
    resultType: false,
    headerEnforced: false,
    checkedAt: new Date().toISOString(),
  };
  const gaps: string[] = [];

  // (a) server/discover under the full stateless contract.
  try {
    const { status, body } = await conformanceCheck(fetchFn, entry, 'server/discover', 1, conformanceHeaders('server/discover', entry.name));
    const result = (body?.result ?? {}) as Record<string, any>;
    const protocolVersion = result.protocolVersion ?? result._meta?.['io.modelcontextprotocol/protocolVersion'];
    const supported = result.supportedProtocolVersions ?? result.supportedVersions;
    const serverInfo = result.serverInfo ?? result._meta?.['io.modelcontextprotocol/serverInfo'];
    if (protocolVersion && Array.isArray(supported) && serverInfo) {
      rec.discover = true;
    } else if (body?.error) {
      gaps.push(`discover: rejected ${body.error.code ?? '?'} ${String(body.error.message ?? '').slice(0, 100)}`);
    } else {
      gaps.push(`discover: incomplete response (http ${status})`);
    }
  } catch (e: any) {
    gaps.push(`discover: probe error ${String(e?.message ?? e).slice(0, 100)}`);
  }

  // (b) resultType "complete" on tools/list.
  try {
    const { body } = await conformanceCheck(fetchFn, entry, 'tools/list', 2, conformanceHeaders('tools/list', entry.name));
    const result = body?.result;
    if (result && typeof result === 'object' && (result as any).resultType === 'complete') {
      rec.resultType = true;
    } else {
      gaps.push(`resultType: ${(result as any)?.resultType ?? '<absent>'}`);
    }
  } catch (e: any) {
    gaps.push(`resultType: probe error ${String(e?.message ?? e).slice(0, 100)}`);
  }

  // (c) headerless request must fail cleanly — never silently succeed.
  try {
    const { status, body } = await conformanceCheck(fetchFn, entry, 'server/discover', 3, {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    });
    if (body?.error && typeof body.error === 'object') {
      rec.headerEnforced = true;
    } else if (status >= 400) {
      rec.headerEnforced = true;
    } else if (body?.result) {
      gaps.push(`headerEnforced: succeeded without Mcp-Method header (http ${status})`);
    } else {
      rec.headerEnforced = true; // clean failure (no result, no error)
    }
  } catch (e: any) {
    gaps.push(`headerEnforced: probe error ${String(e?.message ?? e).slice(0, 100)}`);
  }

  if (gaps.length > 0) rec.detail = gaps.join('; ');
  await env.REGISTRY_KV.put(KV_CONFORMANCE_PREFIX + entry.id, JSON.stringify(rec), { expirationTtl: CONFORMANCE_TTL });
  return rec;
}

async function getToolSchemas(env: Env, entry: McpServerEntry): Promise<ToolDef[]> {
  if (entry.kind === 'local') return entry.tools ?? [];
  // Non-MCP connectors have no MCP tool surface (relabeled 2026-10-13).
  if (isNonMcpConnector(entry)) return [];
  // Upstream listings are never tool-probed (federation reference only).
  if ((entry as FederatedEntry).source === 'official') return [];

  const cached = await env.REGISTRY_KV.get(KV_SCHEMAS_PREFIX + entry.id);
  if (cached) return JSON.parse(cached) as ToolDef[];

  const tools = await probeTools(env, entry);
  const schemas: ToolDef[] = Array.isArray(tools)
    ? tools.map((t: any) => ({
        name: String(t.name),
        description: String(t.description ?? ''),
        inputSchema: t.inputSchema ?? undefined,
      }))
    : [];
  if (schemas.length > 0) {
    await env.REGISTRY_KV.put(KV_SCHEMAS_PREFIX + entry.id, JSON.stringify(schemas), { expirationTtl: KV_TTL });
  }
  return schemas;
}

// ─── H1: scanner verdict + capability backfill for every entry ─────────────
// Official catalog entries are scanned at probe time and cached in KV so the
// verdict is visible on every card. Per R1, official verdicts are
// informational only — never gate. Capabilities are auto-derived from the
// tool surface (auto:true) and diffed against any declared manifest.

function deriveCapabilities(schemas: ToolDef[]): CapabilityManifest & { auto: true } {
  const names = schemas.map((t) => t.name)
  const writeCapable = schemas.some((t) => toolRisk(t) === 'write')
  // Conservative inference: dataSources only from schema fields that name a
  // source/path/uri/query; externalServices only from URL-shaped schema fields.
  const dataSources = new Set<string>()
  const externalServices = new Set<string>()
  for (const t of schemas) {
    const props = ((t.inputSchema as any)?.properties ?? {}) as Record<string, any>
    for (const [k, p] of Object.entries(props)) {
      if (/\b(source|path|uri|file|query|collection|bucket|repo)\b/i.test(k)) dataSources.add(String(p?.type ?? 'unknown'))
      if (/\b(url|endpoint|host|origin)\b/i.test(k)) externalServices.add(String(p?.type ?? 'unknown'))
    }
  }
  return { tools: names, dataSources: [...dataSources], externalServices: [...externalServices], writeCapable, auto: true }
}

async function getScanMeta(env: Env, entry: McpServerEntry, schemas: ToolDef[]): Promise<ScanMeta> {
  if (entry.scan) return entry.scan
  const cached = await env.REGISTRY_KV.get(KV_SCAN_PREFIX + entry.id)
  if (cached) return JSON.parse(cached) as ScanMeta
  const scan = scanToolSurface(schemas as Array<{ name: string; description?: string }>)
  const meta: ScanMeta = {
    verdict: scan.worst,
    score: scan.results.reduce((a, r) => a + r.score, 0),
    maliciousCount: scan.maliciousCount,
    suspiciousCount: scan.suspiciousCount,
    scannedAt: new Date().toISOString(),
  }
  await env.REGISTRY_KV.put(KV_SCAN_PREFIX + entry.id, JSON.stringify(meta), { expirationTtl: KV_TTL * 6 })
  return meta
}

async function getCapabilityMeta(env: Env, entry: McpServerEntry, schemas: ToolDef[]): Promise<CapabilityManifest> {
  if (entry.capabilities) return entry.capabilities
  const cached = await env.REGISTRY_KV.get(KV_CAPS_PREFIX + entry.id)
  if (cached) return JSON.parse(cached) as CapabilityManifest
  const derived = deriveCapabilities(schemas)
  await env.REGISTRY_KV.put(KV_CAPS_PREFIX + entry.id, JSON.stringify(derived), { expirationTtl: KV_TTL * 6 })
  return derived
}

// ─── Governance: hash-chained + Ed25519-signed audit log ───────────────────
// Each tool call through the proxy is appended to a SHA-256 hash chain AND
// signed with the registry's Ed25519 key (non-repudiation — matches the IETF
// signed-receipts pattern: Ed25519 over deterministic JSON canonicalization).
// entry.hash = sha256(prevHash ∥ canonical(payload)); entry.sig = Ed25519 over
// canonical(payload). The head hash is stored separately so the whole chain
// can be re-verified independently of the log operator.

async function sha256Hex(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface AuditEntry {
  seq: number;
  ts: string;
  serverId: string;
  tool: string;
  risk: 'read' | 'write';
  args: Record<string, unknown>;
  latencyMs: number;
  status: 'done' | 'error';
  prev: string;
  hash: string;
  sig?: string;
  sigAlg?: string;
  capToken?: { aud: string; tool: string; exp: number };
}

function canonical(payload: unknown): string {
  return JSON.stringify(payload, Object.keys(payload as object).sort());
}

/** Resolve the DO stub for a given ledger ('audit' | 'transparency'). */
function ledgerStub(env: Env, name: 'audit' | 'transparency'): LedgerLog | null {
  if (!env.LEDGER) return null
  try {
    const id = env.LEDGER.idFromName(name)
    return env.LEDGER.get(id) as unknown as LedgerLog
  } catch {
    return null
  }
}

/**
 * Read a ledger: DO is authoritative. If the DO is empty but KV holds history
 * (pre-migration entries), backfill the DO from KV in chain order, then read
 * from the DO. Falls back to KV if the DO is unavailable.
 */
async function readLedger(env: Env, name: 'audit' | 'transparency', kvLogKey: string, kvHeadKey: string): Promise<{ log: any[]; head: string; source: 'do' | 'kv' }> {
  const doStub = ledgerStub(env, name)
  const kvRaw = await env.REGISTRY_KV.get(kvLogKey)
  const kvLog: any[] = kvRaw ? JSON.parse(kvRaw) : []
  const kvHead = (await env.REGISTRY_KV.get(kvHeadKey)) ?? 'GENESIS'
  if (doStub) {
    try {
      if ((await doStub.size()) === 0 && kvLog.length > 0) {
        // Cold start / migration: replay the full KV chain into the DO.
        const backfill = await doStub.backfill(kvLog)
        if (!backfill.ok) {
          // Chain couldn't be backfilled intact — read from KV to avoid loss.
          return { log: kvLog, head: kvHead, source: 'kv' }
        }
      }
      const exported = await doStub.exportAll()
      // Reconcile: a transient DO append failure leaves a hole (size() > 0,
      // so the empty-only backfill above never runs). If the DO head diverges
      // from KV, replay the KV suffix after the DO's existing prefix; the DO
      // backfill verifies prev === head, so it can only repair — never fork.
      if (exported.head !== kvHead) {
        const suffix = kvLog.slice(exported.log.length)
        if (suffix.length > 0) {
          const reconciled = await doStub.backfill(suffix)
          if (!reconciled.ok) {
            // DO is unrecoverable this pass — serve the intact KV chain.
            return { log: kvLog, head: kvHead, source: 'kv' }
          }
          const reExported = await doStub.exportAll()
          return { log: reExported.log, head: reExported.head, source: 'do' }
        }
      }
      return { log: exported.log, head: exported.head, source: 'do' }
    } catch {
      /* DO unavailable — fall back to KV */
    }
  }
  return { log: kvLog, head: kvHead, source: 'kv' }
}

/** Canonical fields an auditor needs to recompute hash + signature. */
function auditCanonical(e: Pick<AuditEntry, 'seq' | 'ts' | 'serverId' | 'tool' | 'risk' | 'args' | 'latencyMs' | 'status' | 'capToken'> & { prev: string }) {
  return canonical({ prev: e.prev, seq: e.seq, ts: e.ts, serverId: e.serverId, tool: e.tool, risk: e.risk, args: e.args, latencyMs: e.latencyMs, status: e.status, capToken: e.capToken });
}

async function appendAudit(env: Env, payload: Omit<AuditEntry, 'seq' | 'ts' | 'prev' | 'hash' | 'sig' | 'sigAlg'>): Promise<AuditEntry> {
  const raw = await env.REGISTRY_KV.get(KV_AUDIT_LOG);
  const log: AuditEntry[] = raw ? JSON.parse(raw) : [];
  const head = (await env.REGISTRY_KV.get(KV_AUDIT_HEAD)) ?? 'GENESIS';
  const seq = log.length > 0 ? log[log.length - 1].seq + 1 : 1;
  const ts = new Date().toISOString();
  const body = { prev: head, seq, ts, ...payload };
  const hash = await sha256Hex(canonical(body));
  const signed = await ed25519Sign(env, body);
  const entry: AuditEntry = { seq, ts, prev: head, hash, ...payload, ...(signed ? { sig: signed.signature, sigAlg: signed.alg } : {}) };
  log.push(entry);
  if (log.length > AUDIT_MAX) log.splice(0, log.length - AUDIT_MAX);
  await env.REGISTRY_KV.put(KV_AUDIT_LOG, JSON.stringify(log));
  await env.REGISTRY_KV.put(KV_AUDIT_HEAD, hash);
  // N3 — dual-write to the Durable Object (authoritative); KV stays as legacy
  // fallback through the transition. DO failure is non-fatal for appends.
  const doStub = ledgerStub(env, 'audit');
  if (doStub) {
    try {
      await doStub.append(entry as any);
    } catch {
      /* DO unavailable — KV remains the durable store */
    }
  }
  return entry;
}

async function verifyAuditChain(env: Env, log?: AuditEntry[]): Promise<{ ok: boolean; checked: number; head: string; signed: number; sigOk: boolean }> {
  const raw = log ? null : await env.REGISTRY_KV.get(KV_AUDIT_LOG);
  const entries: AuditEntry[] = log ?? (raw ? JSON.parse(raw) : []);
  let prev = 'GENESIS';
  let signed = 0;
  let sigOk = true;
  for (const e of entries) {
    const body = { prev, seq: e.seq, ts: e.ts, serverId: e.serverId, tool: e.tool, risk: e.risk, args: e.args, latencyMs: e.latencyMs, status: e.status, capToken: e.capToken };
    const recomputed = await sha256Hex(canonical(body));
    if (recomputed !== e.hash) return { ok: false, checked: entries.length, head: prev, signed, sigOk };
    if (e.sig) {
      signed += 1;
      const good = await ed25519Verify(env, body, e.sig);
      if (!good) sigOk = false;
    }
    prev = e.hash;
  }
  return { ok: true, checked: entries.length, head: prev, signed, sigOk };
}

// ─── Governance: transparency lifecycle log (server events) ────────────────
// Second hash chain recording server lifecycle events (registered / approved /
// rejected / drifted / tool-changed) so privilege escalation or rug-pulls
// become publicly visible. Same SHA-256 + Ed25519 pattern as the call audit.

interface TransparencyEntry {
  seq: number;
  ts: string;
  event: 'registered' | 'approved' | 'rejected' | 'drifted' | 'tool-changed' | 'reviewed' | 'blocked' | 'pending' | 'usage-admin';
  serverId: string;
  detail?: string;
  /** SIEM fields (E-3): acting identity, tool in scope, outcome. */
  principal?: string;
  tool?: string;
  outcome?: string;
  prev: string;
  hash: string;
  sig?: string;
}

/** Deterministic canonical body for transparency entries — MUST be used by
 *  both the appender and the verifier (added fields with undefined values are
 *  dropped by JSON.stringify, so old chains keep verifying). */
function transparencyBody(prev: string, seq: number, ts: string, ev: Omit<TransparencyEntry, 'seq' | 'ts' | 'prev' | 'hash' | 'sig'>): Record<string, unknown> {
  return { prev, seq, ts, event: ev.event, serverId: ev.serverId, detail: ev.detail, principal: ev.principal, tool: ev.tool, outcome: ev.outcome };
}

async function appendTransparency(env: Env, ev: Omit<TransparencyEntry, 'seq' | 'ts' | 'prev' | 'hash' | 'sig'>): Promise<void> {
  const raw = await env.REGISTRY_KV.get(KV_TRANSPARENCY_LOG);
  const log: TransparencyEntry[] = raw ? JSON.parse(raw) : [];
  const head = (await env.REGISTRY_KV.get(KV_TRANSPARENCY_HEAD)) ?? 'GENESIS';
  const seq = log.length > 0 ? log[log.length - 1].seq + 1 : 1;
  const ts = new Date().toISOString();
  const body = transparencyBody(head, seq, ts, ev);
  const hash = await sha256Hex(canonical(body));
  const signed = await ed25519Sign(env, body);
  const entry: TransparencyEntry = { seq, ts, prev: head, hash, ...ev, ...(signed ? { sig: signed.signature } : {}) };
  log.push(entry);
  if (log.length > AUDIT_MAX) log.splice(0, log.length - AUDIT_MAX);
  await env.REGISTRY_KV.put(KV_TRANSPARENCY_LOG, JSON.stringify(log));
  await env.REGISTRY_KV.put(KV_TRANSPARENCY_HEAD, hash);
  // N3 — dual-write to the transparency Durable Object (authoritative).
  const doStub = ledgerStub(env, 'transparency');
  if (doStub) {
    try {
      await doStub.append(entry as any);
    } catch {
      /* DO unavailable — KV remains the durable store */
    }
  }
}

// ─── A4: capability drift (contentHash of the tools/list surface) ──────────

function toolsHash(tools: ToolDef[]): string {
  const canonicalTools = tools
    .map((t) => ({ name: t.name, description: t.description ?? '', schema: t.inputSchema ?? null }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
  return canonical(canonicalTools);
}

async function checkDrift(env: Env, entry: McpServerEntry, schemas: ToolDef[]): Promise<{ baseline: string | null; current: string; drifted: boolean }> {
  const current = toolsHash(schemas);
  const baseline = await env.REGISTRY_KV.get(KV_BASELINE_PREFIX + entry.id);
  if (!baseline) return { baseline: null, current, drifted: false };
  const drifted = baseline !== current;
  if (drifted && entry.kind === 'remote') {
    // Fire a transparency event when a previously-approved surface changes.
    void appendTransparency(env, { event: 'drifted', serverId: entry.id, detail: `surface changed (baseline ${baseline.slice(0, 12)} → ${current.slice(0, 12)})` }).catch(() => {});
  }
  return { baseline, current, drifted };
}

// ─── A3: per-tool quotas (429 technical, 402 monetized) ─────────────────────

const DEFAULT_QUOTA: QuotaSpec = { read: { perMinute: 60, perDay: 5000 }, write: { perMinute: 10, perDay: 300 } };

interface QuotaDecision {
  ok: boolean;
  status: number;
  limit: number;
  remaining: number;
  windowSec: number;
}

async function enforceToolQuota(env: Env, request: Request, entry: McpServerEntry, toolName: string, risk: 'read' | 'write'): Promise<QuotaDecision> {
  const quota = entry.quota ?? DEFAULT_QUOTA;
  const spec = risk === 'write' ? quota.write : quota.read;
  const ip = (request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const key = KV_TOOLRATE_PREFIX + `${entry.id}:${toolName}:${ip}`;

  // Per-minute window (rolling). KV is eventually consistent; good enough for quotas.
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / 60) * 60;
  const windowKey = `${key}:${windowStart}`;
  const n = Number((await env.REGISTRY_KV.get(windowKey)) ?? '0');
  await env.REGISTRY_KV.put(windowKey, String(n + 1), { expirationTtl: 120 });
  const remaining = Math.max(0, spec.perMinute - (n + 1));
  if (n + 1 > spec.perMinute) {
    const status = entry.monetized ? 402 : 429;
    return { ok: false, status, limit: spec.perMinute, remaining: 0, windowSec: 60 };
  }
  return { ok: true, status: 200, limit: spec.perMinute, remaining, windowSec: 60 };
}

// ─── Governance: structured logging + self-hosted error ingestion ─────────

interface LogEvent {
  ts: string;
  level: 'info' | 'warn' | 'error';
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  serverId?: string;
}

async function appendLog(env: Env, ev: Omit<LogEvent, 'ts'>): Promise<void> {
  const raw = await env.REGISTRY_KV.get(KV_LOGS);
  const log: LogEvent[] = raw ? JSON.parse(raw) : [];
  log.push({ ts: new Date().toISOString(), ...ev });
  if (log.length > LOG_MAX) log.splice(0, log.length - LOG_MAX);
  await env.REGISTRY_KV.put(KV_LOGS, JSON.stringify(log));
}

interface ErrorEvent {
  ts: string;
  source: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
}

async function appendError(env: Env, ev: Omit<ErrorEvent, 'ts'>): Promise<void> {
  const raw = await env.REGISTRY_KV.get(KV_ERRORS);
  const log: ErrorEvent[] = raw ? JSON.parse(raw) : [];
  log.push({ ts: new Date().toISOString(), ...ev });
  if (log.length > ERROR_MAX) log.splice(0, log.length - ERROR_MAX);
  await env.REGISTRY_KV.put(KV_ERRORS, JSON.stringify(log));
}

// ─── C1: OTLP-shaped event emission (Claude Code schema) ───────────────────
// Emits mcp_server_connection / tool_result / tool_decision events. If an
// OTLP/HTTP collector endpoint is configured, POSTs in OTLP JSON; otherwise
// the KV structured log (appendLog) already carries the same fields.

async function emitOtlpEvent(env: Env, name: string, attrs: Record<string, string | number | boolean | undefined>): Promise<void> {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;
  const payload = {
    resourceLogs: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'p31-mcp-registry' } }] },
        scopeLogs: [
          {
            scope: { name: 'p31.mcp.marketplace' },
            logRecords: [
              {
                timeUnixNano: String(BigInt(Date.now()) * 1000000n),
                severityText: 'INFO',
                body: { stringValue: name },
                attributes: Object.entries(attrs)
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => ({ key: k, value: { stringValue: String(v) } })),
              },
            ],
          },
        ],
      },
    ],
  };
  try {
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch {
    /* OTLP export is best-effort; KV logs remain the durable store */
  }
}

// ─── Governance: RBAC roles + review signing ───────────────────────────────
// Roles: viewer (read catalog/audit), publisher (register), reviewer
// (pending/review), admin (logs/errors/roles). Principal resolution is
// header-based (X-Principal → CF-Access-Authenticated-User-Email → anonymous).
// Role assignments live in KV; ADMIN_TOKEN remains a super-admin fallback.

type Role = 'viewer' | 'publisher' | 'reviewer' | 'admin'
const ROLE_RANK: Record<Role, number> = { viewer: 0, publisher: 1, reviewer: 2, admin: 3 }

/**
 * Verify a Cloudflare Access JWT (Cf-Access-Jwt-Assertion) against the
 * configured JWKS + audience. Returns the principal (email/sub) and IdP
 * groups, or null when no token/config is present or verification fails.
 * The JWKS is cached in KV via jose's jwksCache so Access tokens verify
 * without a network fetch on every request.
 */
const KV_ACCESS_JWKS = 'access:jwks'

async function verifyAccessJwt(env: Env, request: Request): Promise<{ principal: string; groups: string[] } | null> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  const certUrl = env.CF_ACCESS_CERT_URL
  const aud = env.CF_ACCESS_AUD
  if (!token || !certUrl || !aud) return null
  try {
    const raw = await env.REGISTRY_KV.get(KV_ACCESS_JWKS)
    const cache: jose.JWKSCacheInput = raw ? JSON.parse(raw) : {}
    const jwks = jose.createRemoteJWKSet(new URL(certUrl), { [jose.jwksCache]: cache })
    const { payload } = await jose.jwtVerify(token, jwks, { audience: aud })
    await env.REGISTRY_KV.put(KV_ACCESS_JWKS, JSON.stringify(cache), { expirationTtl: 3600 })
    const groups = Array.isArray(payload.groups) ? payload.groups.map(String) : []
    return { principal: String(payload.email ?? payload.sub ?? 'access-user'), groups }
  } catch {
    return null
  }
}

async function resolvePrincipal(env: Env, request: Request): Promise<string> {
  const access = await verifyAccessJwt(env, request)
  if (access) return access.principal
  const x = request.headers.get('X-Principal')?.trim()
  if (x) return x
  const cf = request.headers.get('CF-Access-Authenticated-User-Email')?.trim()
  if (cf) return cf
  return 'anonymous'
}

async function getRole(env: Env, request: Request): Promise<Role> {
  const token = env.ADMIN_TOKEN
  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? request.headers.get('X-Admin-Token')
  if (token && bearer === token) return 'admin'
  // N4 — IdP groups → roles via roles:mapping:<group> (highest wins).
  const access = await verifyAccessJwt(env, request)
  if (access) {
    let best: Role = 'viewer'
    for (const g of access.groups) {
      const stored = await env.REGISTRY_KV.get(KV_GROUP_ROLES_PREFIX + g)
      if (stored && ROLE_RANK[stored as Role] > ROLE_RANK[best]) best = stored as Role
    }
    if (best !== 'viewer') return best
  }
  const principal = await resolvePrincipal(env, request)
  if (principal === 'anonymous') return 'viewer'
  const stored = await env.REGISTRY_KV.get(KV_ROLES_PREFIX + principal)
  return (stored as Role) || 'viewer'
}

/** Resolve the acting principal, honoring the admin-token machine principal. */
async function resolveActingPrincipal(env: Env, request: Request): Promise<string> {
  const role = await getRole(env, request)
  const p = await resolvePrincipal(env, request)
  if (role === 'admin' && p === 'anonymous') return env.ADMIN_PRINCIPAL || 'admin-token'
  return p
}

interface AuthResult { ok: boolean; principal: string; role: Role }

async function requireRole(request: Request, env: Env, allowed: Role[]): Promise<AuthResult> {
  const role = await getRole(env, request)
  const ok = allowed.some((r) => ROLE_RANK[role] >= ROLE_RANK[r])
  return { ok, principal: await resolvePrincipal(env, request), role }
}

function roleError(result: AuthResult): Response {
  return json({ error: `unauthorized — requires ${result.role === 'viewer' ? 'elevation' : `role >= ${result.role}`}`, principal: result.principal, role: result.role }, 401)
}

async function requireAdmin(request: Request, env: Env): Promise<AuthResult> {
  return requireRole(request, env, ['admin'])
}

// ─── Governance: Ed25519 signing helpers (FIPS 186-5, node:crypto) ─────────

function ed25519PrivateKey(env: Env): unknown {
  return ed25519PrivateKeyFromB64(env.REVIEW_SIGNING_KEY)
}

function ed25519PrivateKeyFromB64(seedB64?: string): unknown {
  if (!seedB64) return null;
  try {
    const seed = Buffer.from(seedB64, 'base64');
    if (seed.length !== 32) return null;
    // Ed25519 private key from a raw 32-byte seed via PKCS#8 DER. `node:crypto`
    // is available under the worker's nodejs_compat flag (and in tests).
    const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
    return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  } catch {
    return null;
  }
}

/** Sign canonical(payload) with the registry's Ed25519 key. Returns null if unconfigured. */
async function ed25519Sign(env: Env, payload: Record<string, unknown>): Promise<{ signature: string; alg: 'Ed25519' } | null> {
  const seedB64 = env.REVIEW_SIGNING_KEY;
  if (!seedB64) return null;
  const seed = Buffer.from(seedB64, 'base64');
  if (seed.length !== 32) return null;
  const data = new TextEncoder().encode(canonical(payload));

  // Path 1: node:crypto (works under Node — tests). workerd's polyfill doesn't
  // implement sign(), so this throws there and we fall through.
  try {
    const key = ed25519PrivateKey(env);
    if (key) {
      for (const alg of [null, 'ed25519']) {
        try {
          return { signature: sign(alg, data, key).toString('base64'), alg: 'Ed25519' };
        } catch {
          /* next form */
        }
      }
    }
  } catch {
    /* fall through */
  }

  // Path 2: WebCrypto PKCS#8 (works under workerd).
  try {
    const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
    const key = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign']);
    const sig = await crypto.subtle.sign({ name: 'Ed25519' }, key, data);
    return { signature: Buffer.from(sig as ArrayBuffer).toString('base64'), alg: 'Ed25519' };
  } catch {
    return null;
  }
}

/** Verify an Ed25519 signature over canonical(payload), trying current + previous keys. */
async function ed25519Verify(env: Env, payload: Record<string, unknown>, signature: string): Promise<boolean> {
  const data = new TextEncoder().encode(canonical(payload));
  const sig = Buffer.from(signature, 'base64');
  const seeds = [env.REVIEW_SIGNING_KEY, env.REVIEW_SIGNING_KEY_PREV].filter(Boolean) as string[]
  for (const seedB64 of seeds) {
    const seed = Buffer.from(seedB64, 'base64')
    if (seed.length !== 32) continue
    const ok = await ed25519VerifyWithSeed(env, seed, data, sig)
    if (ok) return true
  }
  return false
}

async function ed25519VerifyWithSeed(env: Env, seed: Buffer, data: Uint8Array, sig: Uint8Array): Promise<boolean> {
  // Path 1: node:crypto.
  try {
    const key = ed25519PrivateKeyFromB64(seed.toString('base64'));
    if (key) {
      const publicKey = createPublicKey(key);
      for (const alg of [null, 'ed25519']) {
        try {
          if (verify(alg, data, publicKey, sig)) return true;
        } catch {
          /* next form */
        }
      }
    }
  } catch {
    /* fall through */
  }

  // Path 2: WebCrypto — derive the public key via JWK export, then verify.
  try {
    const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
    const priv = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, true, ['sign']);
    const jwk = (await crypto.subtle.exportKey('jwk', priv)) as { x?: string };
    if (!jwk.x) return false;
    const pubBuf = Uint8Array.from(atob(jwk.x.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const pubKey = await crypto.subtle.importKey('raw', pubBuf, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, pubKey, sig, data);
  } catch {
    return false;
  }
}

async function signReview(env: Env, payload: Record<string, unknown>): Promise<{ signature: string; alg: 'Ed25519' } | null> {
  return ed25519Sign(env, payload);
}

// ─── N1: session-scoped capability tokens for write calls ──────────────────
// On a write-tool call the registry mints a short-TTL Ed25519-signed token
// scoped to {serverId, tool, principal}, attaches it to the upstream request,
// and logs issuance in the audit chain — the "capability-scoped credential
// provisioning" pattern the risk panel now truthfully advertises.

const CAP_TOKEN_TTL_SEC = 60;

async function mintCapabilityToken(env: Env, opts: { serverId: string; tool: string; principal: string }): Promise<{ token: string; exp: number } | null> {
  const exp = Math.floor(Date.now() / 1000) + CAP_TOKEN_TTL_SEC;
  const payload = { iss: 'p31-registry', aud: opts.serverId, sub: opts.principal, tool: opts.tool, exp };
  const signed = await ed25519Sign(env, payload);
  if (!signed) return null;
  return { token: [btoa(JSON.stringify({ alg: 'Ed25519', typ: 'capability' })), btoa(JSON.stringify(payload)), signed.signature].join('.'), exp };
}

// ─── Governance: rate limiting helper (per-IP) ─────────────────────────────

async function rateLimited(env: Env, request: Request, key: string, max: number, windowSec: number): Promise<boolean> {
  const ip = (request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const k = KV_RATELIMIT_PREFIX + key + ':' + ip;
  const n = Number((await env.REGISTRY_KV.get(k)) ?? '0');
  if (n >= max) return true;
  await env.REGISTRY_KV.put(k, String(n + 1), { expirationTtl: windowSec });
  return false;
}

// Risk heuristic: a tool is write-capable if its name implies mutation.
const WRITE_RE = /(create|write|update|delete|remove|send|execute|deploy|mint|sign|issue|lock|unlock|place|clear|trigger|call|pay|offer|accept|dispute|set|put|post|save|submit|start|stop|rotate|transfer|withdraw|deposit|invite|publish)/i;

function toolRisk(t: ToolDef): 'read' | 'write' {
  if (WRITE_RE.test(t.name)) return 'write';
  return 'read';
}

function inferReadOnlySafe(tools: ToolDef[]): boolean {
  return tools.length > 0 && tools.every((t) => toolRisk(t) === 'read');
}

async function summary(env: Env, entry: McpServerEntry, schemas: ToolDef[], health: HealthRecord) {
  const [drift, scan, capabilities, conformance] = await Promise.all([
    checkDrift(env, entry, schemas),
    getScanMeta(env, entry, schemas),
    getCapabilityMeta(env, entry, schemas),
    probeConformance(env, entry),
  ]);
  const fed = entry as FederatedEntry;
  const src: Source = fed.source ?? (OFFICIAL_IDS.has(entry.id) ? 'p31' : 'external');
  const priced = priceTierFor(schemas.map((t) => t.name));
  return {
    id: entry.id,
    name: entry.name,
    endpoint: entry.endpoint,
    kind: entry.kind,
    category: entry.category,
    description: entry.description,
    tags: entry.tags,
    author: entry.author,
    icon: entry.icon,
    status: entry.status,
    verify: entry.verify,
    review: entry.review,
    scan,
    needsReview: entry.needsReview,
    capabilities,
    readOnlySafe: entry.readOnlySafe,
    // A-2 federation + governance metadata.
    source: src,
    role: fed.role ?? P31_ROLES[entry.id] ?? (entry.kind === 'local' ? 'local stdio tool' : src === 'p31' ? 'p31 fleet server' : 'community server'),
    oauth: fed.oauth ?? oauthMetaFor(entry),
    protocol: fed.protocol ?? (entry.kind === 'local' ? 'stdio' : '2026-07-28'),
    approval: fed.approval ?? (src === 'p31' ? 'approved' : 'pending'),
    priceTier: priced.tier,
    pricedTools: priced.pricedTools,
    probed: src !== 'official',
    upstream: fed.upstream ?? null,
    health: health.status,
    healthDetail: health.detail,
    latencyMs: health.latencyMs,
    checkedAt: health.checkedAt,
    conformance: conformance ?? entry.conformance ?? null,
    toolCount: schemas.length,
    tools: schemas.map((t) => t.name),
    localNote: entry.localNote,
    contentHash: drift.current,
    baselineHash: drift.baseline,
    drifted: drift.drifted,
  };
}

async function buildSummaries(env: Env, entries: McpServerEntry[]): Promise<Awaited<ReturnType<typeof summary>>[]> {
  return Promise.all(
    entries.map(async (e) => {
      const [schemas, health] = await Promise.all([getToolSchemas(env, e), probeHealth(env, e)]);
      return summary(env, e, schemas, health);
    }),
  );
}

// ─── Route handlers ─────────────────────────────────────────────────────────

async function handleHealth(env: Env): Promise<Response> {
  const entries = await getAllEntries(env);
  const remote = entries.filter((e) => e.kind === 'remote');
  const live = (await Promise.all(remote.map((e) => probeHealth(env, e)))).filter((h) => h.status === 'up').length;
  const categories: Record<string, number> = {};
  for (const e of entries) categories[e.category] = (categories[e.category] ?? 0) + 1;
  const upstream = (await fetchOfficialUpstream(env)).length;
  return json({
    status: 'ok',
    service: 'mcp-registry',
    servers: entries.length,
    remote: remote.length,
    local: entries.length - remote.length,
    liveUp: live,
    categories,
    federation: { upstream: upstream, synced: upstream > 0 },
  });
}

async function handleListServers(env: Env, url: URL): Promise<Response> {
  const q = (url.searchParams.get('q') ?? '').toLowerCase().trim();
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const kind = url.searchParams.get('kind');
  const source = url.searchParams.get('source');

  const entries = await getFederatedEntries(env);
  const filtered = entries.filter((e) => {
    if (source && e.source !== source) return false;
    if (category && e.category !== category) return false;
    if (status && e.status !== status) return false;
    if (kind && e.kind !== kind) return false;
    if (q) {
      const hay = `${e.name} ${e.description} ${e.tags.join(' ')} ${e.id} ${e.role} ${e.source}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const summaries = await buildSummaries(env, filtered);
  return json({ servers: summaries, count: summaries.length, filters: { q, category, status, kind, source } });
}

async function handleCategories(env: Env): Promise<Response> {
  const entries = await getFederatedEntries(env);
  const summaries = await buildSummaries(env, entries);
  const byCat = new Map<Category, { id: Category; count: number; toolCount: number }>();
  for (const s of summaries) {
    const cur = byCat.get(s.category) ?? { id: s.category, count: 0, toolCount: 0 };
    cur.count += 1;
    cur.toolCount += s.toolCount;
    byCat.set(s.category, cur);
  }
  const categories = [...byCat.values()].sort((a, b) => b.count - a.count);
  return json({ categories });
}

async function findEntry(env: Env, id: string): Promise<McpServerEntry | null> {
  const entries = await getAllEntries(env);
  return entries.find((e) => e.id === id || e.name === id) ?? null;
}

async function handleServerDetail(env: Env, id: string): Promise<Response> {
  const entry = await findFederatedEntry(env, id);
  if (!entry) return json({ error: 'server not found' }, 404);
  const [schemas, health] = await Promise.all([getToolSchemas(env, entry), probeHealth(env, entry)]);
  const baselineRaw = await env.REGISTRY_KV.get(KV_BASELINE_SCHEMAS_PREFIX + entry.id);
  const baselineTools = baselineRaw ? JSON.parse(baselineRaw) : null;
  return json({ ...(await summary(env, entry, schemas, health)), tools: schemas.map((t) => ({ ...t, risk: toolRisk(t) })), baselineTools });
}

async function handleServerTools(env: Env, id: string): Promise<Response> {
  const entry = await findFederatedEntry(env, id);
  if (!entry) return json({ error: 'server not found' }, 404);
  const schemas = await getToolSchemas(env, entry);
  return json({ server: entry.id, tools: schemas.map((t) => ({ ...t, risk: toolRisk(t) })) });
}

async function handleServerHealth(env: Env, id: string): Promise<Response> {
  const entry = await findFederatedEntry(env, id);
  if (!entry) return json({ error: 'server not found' }, 404);
  const health = await probeHealth(env, entry);
  return json({ id: entry.id, status: entry.status, health, readOnlySafe: entry.readOnlySafe, category: entry.category, source: entry.source });
}

/**
 * Resolve a same-account workers.dev hostname to its service binding so the
 * liveness probe bypasses Cloudflare's DNS 1042 (workers.dev → workers.dev
 * public fetch is refused; a service binding routes internally).
 */
function resolveSameAccountBinding(endpoint: string): keyof Env | undefined {
  try {
    const host = new URL(endpoint).hostname;
    const hit = OFFICIAL_CATALOG.find((e) => {
      try { return new URL(e.endpoint).hostname === host; } catch { return false; }
    });
    return hit?.binding;
  } catch {
    return undefined;
  }
}

async function handleRegister(env: Env, request: Request): Promise<Response> {
  // Registration is community-open (anonymous allowed) but liveness-,
  // scanner-, and review-gated. RBAC governs moderation + admin surfaces.
  if (await rateLimited(env, request, 'register', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)) {
    return json({ error: `rate limited — ${RATE_LIMIT_MAX} registrations per ${RATE_LIMIT_WINDOW / 3600}h per IP` }, 429);
  }

  const body: any = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid JSON body' }, 400);

  const { id, name, endpoint, category, description, tags, author, capabilities, quota, monetized } = body as Partial<McpServerEntry>;
  if (!id || !name || !endpoint || !category || !description) {
    return json({ error: 'required: id, name, endpoint, category, description' }, 400);
  }
  if (!['design', 'crypto', 'government', 'finance', 'social', 'infra', 'local'].includes(category)) {
    return json({ error: `invalid category: ${category}` }, 400);
  }
  if (!/^https:\/\//.test(endpoint)) {
    return json({ error: 'endpoint must be an https:// URL (local servers cannot self-register from the edge)' }, 400);
  }
  const existing = await getAllEntries(env);
  if (existing.some((e) => e.id === id || e.name === name)) {
    return json({ error: `server id/name already exists: ${id}` }, 409);
  }

  // Liveness validation: must pass initialize (with a supported protocol
  // version) and return a tools/list array.
  const candidate: McpServerEntry = {
    id,
    name,
    endpoint,
    kind: 'remote',
    category: category as Category,
    description,
    tags: Array.isArray(tags) ? tags.map(String) : [],
    author: String(author ?? 'anonymous'),
    icon: undefined,
    status: 'unverified',
    verify: { alg: 'ML-DSA-65', checkedAt: new Date().toISOString() },
    capabilities,
    quota,
    monetized: Boolean(monetized),
    readOnlySafe: false,
    approval: 'pending',
    binding: resolveSameAccountBinding(endpoint),
  };

  const { tools, detail, protocol } = await probeEndpoint(env, candidate);
  if (tools === null) {
    return json({ error: `liveness check failed: ${detail ?? 'tools/list did not return a tool list'}` }, 400);
  }
  candidate.readOnlySafe = inferReadOnlySafe(tools);
  candidate.protocol = protocol ?? 'streamable-http';

  // A1 — tool-description scanner (tool poisoning defense).
  const scan = scanToolSurface(tools as Array<{ name: string; description?: string }>);
  candidate.scan = { verdict: scan.worst, score: 0, maliciousCount: scan.maliciousCount, suspiciousCount: scan.suspiciousCount, scannedAt: new Date().toISOString() };
  if (scan.worst === 'malicious') {
    // Reject outright and record in the rejected registry (transparency).
    const rejectedRaw = await env.REGISTRY_KV.get(KV_REJECTED);
    const rejected: McpServerEntry[] = rejectedRaw ? JSON.parse(rejectedRaw) : [];
    rejected.push({ ...candidate, status: 'down', review: undefined, verify: { alg: 'ML-DSA-65', checkedAt: new Date().toISOString() } });
    await env.REGISTRY_KV.put(KV_REJECTED, JSON.stringify(rejected.slice(-200)));
    void appendTransparency(env, { event: 'rejected', serverId: candidate.id, detail: `scanner verdict: malicious (${scan.maliciousCount} tools)`, principal: await resolvePrincipal(env, request), outcome: 'blocked' }).catch(() => {});
    return json({ error: 'registration rejected — tool-description scanner flagged malicious content', scan: candidate.scan }, 400);
  }
  if (scan.worst === 'suspicious') candidate.needsReview = true;

  // A4 — capability manifest attestation: declared tools vs observed tools.
  const observedNames = tools.map((t: any) => String(t.name));
  let manifestMismatch: string[] = [];
  if (capabilities?.tools?.length) {
    const declared = new Set(capabilities.tools);
    manifestMismatch = observedNames.filter((n) => !declared.has(n));
    // H1b — declared vs derived writeCapable mismatch is a verification flag.
    const derived = deriveCapabilities(tools as ToolDef[]);
    if (capabilities.writeCapable !== undefined && capabilities.writeCapable !== derived.writeCapable) {
      manifestMismatch.push(`writeCapable: declared ${capabilities.writeCapable}, observed ${derived.writeCapable}`);
    }
    if (manifestMismatch.length > 0) candidate.needsReview = true;
  }

  // Baseline content hash for drift detection (A4 / B2).
  const baselineHash = toolsHash(tools as ToolDef[]);
  await env.REGISTRY_KV.put(KV_BASELINE_PREFIX + candidate.id, baselineHash);
  // Baseline tool surface (name + description) so the portal can diff later.
  await env.REGISTRY_KV.put(KV_BASELINE_SCHEMAS_PREFIX + candidate.id, JSON.stringify(tools.map((t: any) => ({ name: String(t.name), description: String(t.description ?? '') }))));

  const registeredRaw = await env.REGISTRY_KV.get(KV_REGISTERED);
  const registered: McpServerEntry[] = registeredRaw ? JSON.parse(registeredRaw) : [];
  registered.push(candidate);
  await env.REGISTRY_KV.put(KV_REGISTERED, JSON.stringify(registered));
  await env.REGISTRY_KV.delete(KV_SCHEMAS_PREFIX + candidate.id);
  await env.REGISTRY_KV.delete(KV_HEALTH_PREFIX + candidate.id);
  void appendTransparency(env, { event: 'registered', serverId: candidate.id, detail: `${scan.worst} scan · ${observedNames.length} tools`, principal: await resolvePrincipal(env, request), outcome: 'registered' }).catch(() => {});

  return json(
    { ...(await summary(env, candidate, tools as ToolDef[], await probeHealth(env, candidate))), note: 'registered as unverified — pending P31 review', scan: candidate.scan, needsReview: candidate.needsReview, manifestMismatch },
    201,
  );
}

async function handleCall(env: Env, id: string, request: Request): Promise<Response> {
  const entry = await findEntry(env, id);
  if (!entry) {
    // Distinguish official-upstream reference listings from unknown ids:
    // listings are visible + inspectable, but never callable through the
    // marketplace proxy (register the server to enable proxied calls).
    const fed = await findFederatedEntry(env, id);
    if (fed) return json({ error: 'upstream reference listing — register this server (POST /servers) to enable proxied calls' }, 403);
    return json({ error: 'server not found' }, 404);
  }
  if (entry.kind === 'local') return json({ error: 'local server not reachable from the edge' }, 503);

  const bodyText = await request.text().catch(() => '');
  const sizeCheck = validateBodySize(bodyText);
  if (!sizeCheck.ok) return json({ error: { code: -32000, message: sizeCheck.reason } }, 413);
  let body: any = null
  try { body = JSON.parse(bodyText || 'null') } catch { body = null }
  if (!body) return json({ error: 'invalid JSON body' }, 400);

  const toolName = body?.params?.name ?? (typeof body?.name === 'string' ? body.name : 'unknown');
  const args = body?.params?.arguments ?? body?.arguments ?? {};
  const r = await proxyToolCall(env, entry, String(toolName), (args as Record<string, unknown>) ?? {}, request);
  return json(r.body, r.status, r.rlHeaders ?? {});
}

/**
 * Shared guarded proxy path — used by BOTH the REST /servers/:id/call handler
 * and the MCP-native call_tool surface, so every proxied invocation gets the
 * same: REQUIRE_AUTH_WRITE gate → sanitizer → per-tool quota → capability
 * token → signed audit entry → OTLP event.
 */
async function proxyToolCall(
  env: Env,
  entry: McpServerEntry,
  toolName: string,
  args: Record<string, unknown>,
  request: Request,
): Promise<{ ok: boolean; status: number; rlHeaders?: Record<string, string>; body: unknown }> {
  const risk = toolRisk({ name: toolName });

  if (env.REQUIRE_AUTH_WRITE === '1' && risk === 'write') {
    const principal = await resolvePrincipal(env, request)
    if (principal === 'anonymous') {
      return { ok: false, status: 401, body: { error: { code: -32000, message: 'write tools require an authenticated principal' } } }
    }
  }

  const toolSchema = (await getToolSchemas(env, entry)).find((t) => t.name === toolName)?.inputSchema;
  const sanitized = validateArgs(args, toolSchema as { properties?: Record<string, { type?: string }> });
  if (!sanitized.ok) {
    const ip = (request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    const rlKey = KV_RATELIMIT_PREFIX + 'sanitizer:' + ip;
    const rl = Number((await env.REGISTRY_KV.get(rlKey)) ?? '0');
    await env.REGISTRY_KV.put(rlKey, String(rl + 1), { expirationTtl: 3600 });
    if (rl >= 100) return { ok: false, status: 429, body: { error: { code: -32029, message: 'too many rejected requests from this client' } } };
    const k = KV_REJECTIONS_PREFIX + `${entry.id}:${toolName}`;
    const n = Number((await env.REGISTRY_KV.get(k)) ?? '0');
    await env.REGISTRY_KV.put(k, String(n + 1), { expirationTtl: 600 });
    void emitOtlpEvent(env, 'tool_rejected', { serverId: entry.id, tool: toolName, reason: sanitized.reason, status: String(sanitized.status) }).catch(() => {});
    return { ok: false, status: sanitized.status, body: { error: { code: -32000, message: `rejected: ${sanitized.reason}`, field: sanitized.field } } };
  }

  const quota = await enforceToolQuota(env, request, entry, toolName, risk);
  const rlHeaders = {
    'X-RateLimit-Limit': String(quota.limit),
    'X-RateLimit-Remaining': String(quota.remaining),
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + quota.windowSec),
  };
  if (!quota.ok) {
    const msg = quota.status === 402
      ? { error: { code: -32029, message: `quota exhausted for ${toolName} — upgrade plan` } }
      : { error: { code: -32029, message: `rate limited — ${toolName} (${quota.limit}/min)` } };
    return { ok: false, status: quota.status, rlHeaders, body: msg };
  }

  const start = Date.now();
  let capToken: { token: string; exp: number } | null = null;
  const extraHeaders: Record<string, string> = {};
  // Preserve the client's Accept header through to the upstream MCP server.
  // MCP Streamable HTTP requires BOTH `application/json` and
  // `text/event-stream` — forward the client's value when it already carries
  // both, otherwise fall back to the protocol-mandated default (rpcCall does
  // the same for probes). Never downgrade to a single media type.
  const clientAccept = request.headers.get('Accept');
  if (clientAccept && clientAccept.includes('application/json') && clientAccept.includes('text/event-stream')) {
    extraHeaders['Accept'] = clientAccept;
  }
  // SEP-2243: forward client tool-parameter headers (`x-mcp-header: <name>`)
  // through to the upstream server, lowercased — header names are
  // case-insensitive and SEP-2243 requires lowercase parameter names.
  const xMcpHeaders = request.headers.get('x-mcp-header');
  if (xMcpHeaders) extraHeaders['x-mcp-header'] = xMcpHeaders;
  if (risk === 'write') {
    capToken = await mintCapabilityToken(env, { serverId: entry.id, tool: toolName, principal: await resolvePrincipal(env, request) });
    if (capToken) extraHeaders['X-Capability-Token'] = capToken.token;
  }
  const res = await rpcCall(env, entry, 'tools/call', { name: toolName, arguments: args }, 10000, extraHeaders, true);
  const latencyMs = Date.now() - start;
  const ok = !res.error;

  await appendAudit(env, {
    serverId: entry.id,
    tool: toolName,
    risk,
    args,
    latencyMs,
    status: ok ? 'done' : 'error',
    capToken: capToken ? { aud: entry.id, tool: toolName, exp: capToken.exp } : undefined,
  });
  void emitOtlpEvent(env, 'tool_result', { serverId: entry.id, tool: toolName, ok, latencyMs }).catch(() => {});

  if (!ok) return { ok: false, status: 502, rlHeaders, body: { error: res.error, errorCode: res.error?.code } };
  return { ok: true, status: 200, rlHeaders, body: res.result };
}

// ─── Governance: community moderation queue ─────────────────────────────────

async function handlePending(env: Env, request: Request): Promise<Response> {
  const auth = await requireRole(request, env, ['reviewer', 'admin']); if (!auth.ok) return roleError(auth);
  const registeredRaw = await env.REGISTRY_KV.get(KV_REGISTERED);
  const registered: McpServerEntry[] = registeredRaw ? JSON.parse(registeredRaw) : [];
  const pending = registered.filter((e) => e.status === 'unverified');
  return json({ pending: pending.length, servers: pending.map((e) => ({ id: e.id, name: e.name, endpoint: e.endpoint, category: e.category, description: e.description, tags: e.tags, author: e.author, readOnlySafe: e.readOnlySafe, verify: e.verify })) });
}

async function handleReview(env: Env, id: string, request: Request): Promise<Response> {
  const auth = await requireRole(request, env, ['reviewer', 'admin']); if (!auth.ok) return roleError(auth);
  const body: any = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== 'approve' && action !== 'reject') return json({ error: 'action must be "approve" or "reject"' }, 400);

  const registeredRaw = await env.REGISTRY_KV.get(KV_REGISTERED);
  const registered: McpServerEntry[] = registeredRaw ? JSON.parse(registeredRaw) : [];
  const idx = registered.findIndex((e) => e.id === id || e.name === id);
  if (idx === -1) return json({ error: 'server not found (must be a registered community entry)' }, 404);
  const entry = registered[idx];

  if (action === 'reject') {
    registered.splice(idx, 1);
    await env.REGISTRY_KV.put(KV_REGISTERED, JSON.stringify(registered));
    const rejectedRaw = await env.REGISTRY_KV.get(KV_REJECTED);
    const rejected: McpServerEntry[] = rejectedRaw ? JSON.parse(rejectedRaw) : [];
    rejected.push({ ...entry, status: 'down', approval: 'blocked', verify: { alg: 'ML-DSA-65', checkedAt: new Date().toISOString() } });
    await env.REGISTRY_KV.put(KV_REJECTED, JSON.stringify(rejected.slice(-200)));
    await env.REGISTRY_KV.delete(KV_SCHEMAS_PREFIX + entry.id);
    await env.REGISTRY_KV.delete(KV_HEALTH_PREFIX + entry.id);
    void appendTransparency(env, { event: 'rejected', serverId: entry.id, detail: `reviewer reject${body?.note ? ` — ${body.note}` : ''}`, principal: await resolveActingPrincipal(env, request), outcome: 'blocked' }).catch(() => {});
    void appendLog(env, { level: 'info', method: 'POST', path: `/servers/${id}/review`, status: 200, latencyMs: 0, serverId: id });
    return json({ id: entry.id, action: 'rejected', note: body?.note ?? null });
  }

  // approve → live, with an Ed25519-signed review record.
  const checkedAt = new Date().toISOString();
  const signed = await signReview(env, { id: entry.id, name: entry.name, endpoint: entry.endpoint, category: entry.category, action: 'approve', checkedAt });
  registered[idx] = {
    ...entry,
    status: 'live',
    approval: 'approved',
    verify: { alg: 'ML-DSA-65', checkedAt },
    review: signed ? { ...signed, signedBy: 'p31-registry', checkedAt } : undefined,
  };
  await env.REGISTRY_KV.put(KV_REGISTERED, JSON.stringify(registered));
  await env.REGISTRY_KV.delete(KV_SCHEMAS_PREFIX + entry.id);
  await env.REGISTRY_KV.delete(KV_HEALTH_PREFIX + entry.id);
  // Baseline the reviewed surface so future drift is diffable.
  const current = await getToolSchemas(env, entry);
  await env.REGISTRY_KV.put(KV_BASELINE_PREFIX + entry.id, toolsHash(current));
  await env.REGISTRY_KV.put(KV_BASELINE_SCHEMAS_PREFIX + entry.id, JSON.stringify(current.map((t) => ({ name: t.name, description: t.description ?? '' }))));
  void appendTransparency(env, { event: 'approved', serverId: entry.id, detail: `signed by ${signed?.alg ?? 'none'} @ ${checkedAt}`, principal: await resolveActingPrincipal(env, request), outcome: 'approved' }).catch(() => {});
  void appendLog(env, { level: 'info', method: 'POST', path: `/servers/${id}/review`, status: 200, latencyMs: 0, serverId: id });
  return json({ id: entry.id, action: 'approved', status: 'live', review: registered[idx].review ?? null });
}

// ─── E: Enterprise governance — approval gate + usage counters ─────────────
// E-1: `approval` state flips are admin-gated by the shared ADMIN_SECRET
// (header X-Admin-Secret or Authorization: Bearer). Cloudflare Access is the
// planned successor — filed as a fix-plan (see docs/fix-plans).
// E-2: the bridge write-side POSTs {server, tool} to /internal/usage with
// header X-Internal-Usage-Key (INTERNAL_USAGE_KEY); counters upsert into D1
// (migration 0001). GET /analytics/tools serves them behind ADMIN_SECRET.
// E-3: every approval/publish/usage-admin event appends to the hash-chained
// transparency ledger with SIEM fields (timestamp, identity, server, tool,
// outcome).

/** Constant-time string comparison (secrets never leak through timing). */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the request carries the shared admin secret (header or bearer). */
function adminSecretOk(request: Request, env: Env): boolean {
  const secret = env.ADMIN_SECRET;
  if (!secret) return false;
  const header = request.headers.get('X-Admin-Secret')?.trim();
  if (header && timingSafeEqualStr(header, secret)) return true;
  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (bearer && timingSafeEqualStr(bearer, secret)) return true;
  return false;
}

/** Identity recorded in SIEM audit fields for admin-secret requests. */
function secretIdentity(request: Request): string {
  return request.headers.get('X-Principal')?.trim() || 'admin-secret';
}

async function handleApprove(env: Env, id: string, request: Request): Promise<Response> {
  if (!env.ADMIN_SECRET) {
    return json({ error: 'admin secret not configured — approval gate closed (Cloudflare Access follow-up filed)' }, 503);
  }
  if (!adminSecretOk(request, env)) {
    return json({ error: 'forbidden — valid admin secret required' }, 403);
  }
  const body: any = await request.json().catch(() => null);
  const action = body?.action ?? 'approve';
  if (action !== 'approve' && action !== 'block' && action !== 'pending') {
    return json({ error: 'action must be "approve", "block", or "pending"' }, 400);
  }

  const registeredRaw = await env.REGISTRY_KV.get(KV_REGISTERED);
  const registered: McpServerEntry[] = registeredRaw ? JSON.parse(registeredRaw) : [];
  const idx = registered.findIndex((e) => e.id === id || e.name === id);
  if (idx === -1) return json({ error: 'server not found (must be a registered community entry)' }, 404);
  const entry = registered[idx];

  const next: Approval = action === 'approve' ? 'approved' : action === 'block' ? 'blocked' : 'pending';
  registered[idx] = {
    ...entry,
    approval: next,
    ...(action === 'approve' ? { status: 'live' as Status } : action === 'block' ? { status: 'down' as Status } : {}),
  };
  await env.REGISTRY_KV.put(KV_REGISTERED, JSON.stringify(registered));
  await env.REGISTRY_KV.delete(KV_SCHEMAS_PREFIX + entry.id);
  await env.REGISTRY_KV.delete(KV_HEALTH_PREFIX + entry.id);
  const identity = secretIdentity(request);
  await appendTransparency(env, {
    event: action === 'approve' ? 'approved' : action === 'block' ? 'blocked' : 'pending',
    serverId: entry.id,
    detail: `approval gate: ${entry.approval ?? 'pending'} → ${next} (action ${action})`,
    principal: identity,
    outcome: next,
  });
  void appendLog(env, { level: 'info', method: 'POST', path: `/servers/${id}/approve`, status: 200, latencyMs: 0, serverId: id });
  return json({ id: entry.id, action, approval: next, status: registered[idx].status });
}

/**
 * E-2 — bridge write-side contract. POST {server: string, tool: string}
 * (optional count: number, default 1) with header `X-Internal-Usage-Key`.
 * Upserts {server, tool, count, last_called} into the D1 usage_events table.
 */
async function handleInternalUsage(env: Env, request: Request): Promise<Response> {
  if (!env.INTERNAL_USAGE_KEY) {
    return json({ error: 'internal usage key not configured' }, 503);
  }
  const key = request.headers.get('X-Internal-Usage-Key')?.trim();
  if (!key || !timingSafeEqualStr(key, env.INTERNAL_USAGE_KEY)) {
    return json({ error: 'forbidden — valid internal usage key required' }, 403);
  }
  if (!env.USAGE_DB) {
    return json({ error: 'usage database unavailable (D1 unbound)' }, 503);
  }
  const body: any = await request.json().catch(() => null);
  const server = String(body?.server ?? '').trim().slice(0, 120);
  const tool = String(body?.tool ?? '').trim().slice(0, 200);
  if (!server || !tool) {
    return json({ error: 'required: {server: string, tool: string}' }, 400);
  }
  const rawCount = Number(body?.count);
  const count = Number.isFinite(rawCount) ? Math.max(1, Math.min(1000, Math.floor(rawCount))) : 1;
  const lastCalled = new Date().toISOString();
  try {
    await env.USAGE_DB.prepare(
      `INSERT INTO usage_events (server, tool, count, last_called) VALUES (?, ?, ?, ?)
       ON CONFLICT (server, tool) DO UPDATE SET count = count + excluded.count, last_called = excluded.last_called`,
    ).bind(server, tool, count, lastCalled).run();
  } catch (e: any) {
    await appendError(env, { source: 'usage-upsert', message: `D1 upsert failed: ${String(e?.message ?? e)}` });
    return json({ error: 'usage upsert failed' }, 500);
  }
  return json({ ok: true, server, tool, count });
}

/** E-2 — governed-lens analytics: per-server/tool counters (admin secret). */
async function handleAnalyticsTools(env: Env, request: Request): Promise<Response> {
  if (!env.ADMIN_SECRET) {
    return json({ error: 'admin secret not configured' }, 503);
  }
  if (!adminSecretOk(request, env)) {
    return json({ error: 'forbidden — valid admin secret required' }, 403);
  }
  if (!env.USAGE_DB) {
    return json({ error: 'usage database unavailable (D1 unbound)' }, 503);
  }
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '100') || 100, 500);
  const server = (url.searchParams.get('server') ?? '').trim();
  try {
    const rows = server
      ? await env.USAGE_DB.prepare(
          'SELECT server, tool, count, last_called FROM usage_events WHERE server = ? ORDER BY count DESC, last_called DESC LIMIT ?',
        ).bind(server, limit).all()
      : await env.USAGE_DB.prepare(
          'SELECT server, tool, count, last_called FROM usage_events ORDER BY count DESC, last_called DESC LIMIT ?',
        ).bind(limit).all();
    const totals = await env.USAGE_DB.prepare('SELECT COUNT(*) AS tools, COALESCE(SUM(count), 0) AS calls FROM usage_events').first();
    // E-3 — audit the admin analytics read (low volume, SIEM-relevant).
    const identity = secretIdentity(request);
    await appendTransparency(env, {
      event: 'usage-admin',
      serverId: server || '*',
      detail: `analytics read by ${identity} (limit ${limit})`,
      principal: identity,
      outcome: 'ok',
    });
    return json({ tools: rows.results ?? [], totals: totals ?? { tools: 0, calls: 0 }, checkedAt: new Date().toISOString() });
  } catch (e: any) {
    await appendError(env, { source: 'usage-analytics', message: `D1 query failed: ${String(e?.message ?? e)}` });
    return json({ error: 'analytics query failed' }, 500);
  }
}

// ─── Observability: audit, structured logs, error ingestion ────────────────

async function handleAudit(env: Env, request: Request): Promise<Response> {
  const { log, head, source } = await readLedger(env, 'audit', KV_AUDIT_LOG, KV_AUDIT_HEAD);
  const verify = await verifyAuditChain(env, log); // chain over the returned source
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? '50'), 500);
  const entries = log.slice(-limit);
  if (new URL(request.url).searchParams.get('verify') === 'signatures') {
    // Re-verify each returned entry's Ed25519 signature over its canonical body.
    const sigResults = await Promise.all(
      entries.map(async (e) => ({
        seq: e.seq,
        signed: Boolean(e.sig),
        valid: e.sig ? await ed25519Verify(env, { prev: e.prev, seq: e.seq, ts: e.ts, serverId: e.serverId, tool: e.tool, risk: e.risk, args: e.args, latencyMs: e.latencyMs, status: e.status, capToken: e.capToken }, e.sig) : false,
      })),
    );
    return json({ chain: verify, head, entries, source, signatureCheck: sigResults });
  }
  return json({ chain: verify, head, entries, source });
}

async function handleAuditExport(env: Env, _request: Request): Promise<Response> {
  const { log, head, source } = await readLedger(env, 'audit', KV_AUDIT_LOG, KV_AUDIT_HEAD);
  const lines = log.map((e) => JSON.stringify(e)).join('\n')
  const body = `# P31 MCP audit chain — ${log.length} entries · head ${head} · source ${source}\n${lines}\n`
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="p31-mcp-audit.ndjson"',
      ...corsHeaders(),
    },
  })
}

async function handleTransparency(env: Env, request: Request): Promise<Response> {
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? '50'), 500);
  const { log, head, source } = await readLedger(env, 'transparency', KV_TRANSPARENCY_LOG, KV_TRANSPARENCY_HEAD);
  let prev = 'GENESIS';
  let ok = true;
  for (const e of log) {
    const body = transparencyBody(prev, e.seq, e.ts, { event: e.event, serverId: e.serverId, detail: e.detail, principal: e.principal, tool: e.tool, outcome: e.outcome });
    const recomputed = await sha256Hex(canonical(body));
    if (recomputed !== e.hash) { ok = false; break; }
    prev = e.hash;
  }
  return json({ chain: { ok, checked: log.length, head: prev }, events: log.slice(-limit), source });
}

async function handleLogs(env: Env, request: Request): Promise<Response> {
  const adminAuth = await requireAdmin(request, env); if (!adminAuth.ok) return roleError(adminAuth);
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? '100'), 500);
  const raw = await env.REGISTRY_KV.get(KV_LOGS);
  const log: LogEvent[] = raw ? JSON.parse(raw) : [];
  return json({ events: log.slice(-limit) });
}

async function handleErrors(env: Env, request: Request): Promise<Response> {
  const adminAuth = await requireAdmin(request, env); if (!adminAuth.ok) return roleError(adminAuth);
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? '100'), 500);
  const raw = await env.REGISTRY_KV.get(KV_ERRORS);
  const log: ErrorEvent[] = raw ? JSON.parse(raw) : [];
  return json({ events: log.slice(-limit) });
}

async function handleIngestError(env: Env, request: Request): Promise<Response> {
  if (await rateLimited(env, request, 'ingest', 300, 3600)) return json({ error: 'rate limited' }, 429);
  const body: any = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid JSON body' }, 400);
  const events = Array.isArray(body?.events) ? body.events : [body];
  for (const raw of events.slice(0, 20)) {
    const ev = {
      source: String(raw?.source ?? 'unknown').slice(0, 80),
      message: String(raw?.message ?? '').slice(0, 500),
      stack: raw?.stack ? String(raw.stack).slice(0, 2000) : undefined,
      url: raw?.url ? String(raw.url).slice(0, 300) : undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    };
    await appendError(env, ev);
  }
  return json({ ok: true, ingested: events.length });
}

// ─── C2: anomaly detection ──────────────────────────────────────────────────

async function handleAnomalies(env: Env, request: Request): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return roleError(auth);
  const findings: Array<{ type: string; severity: 'low' | 'medium' | 'high'; serverId?: string; detail: string }> = [];
  const cutoff = Date.now() - 300_000; // 5-minute window

  // 1) error-rate spikes per server (from structured logs).
  const logsRaw = await env.REGISTRY_KV.get(KV_LOGS);
  const logs: LogEvent[] = logsRaw ? JSON.parse(logsRaw) : [];
  const recentErrors = logs.filter((e) => new Date(e.ts).getTime() > cutoff && e.status >= 500);
  const errByServer = new Map<string, number>();
  for (const e of recentErrors) errByServer.set(e.serverId ?? '?', (errByServer.get(e.serverId ?? '?') ?? 0) + 1);
  for (const [sid, n] of errByServer) {
    if (n >= 5) findings.push({ type: 'error_spike', severity: n >= 20 ? 'high' : 'medium', serverId: sid, detail: `${n} 5xx responses in the last 5 minutes` });
  }

  // 2) call-frequency spikes per server/tool (from structured logs paths).
  const recentCalls = logs.filter((e) => new Date(e.ts).getTime() > cutoff && e.method === 'POST' && /^\/servers\/[^/]+\/call$/.test(e.path));
  const callByServer = new Map<string, number>();
  for (const e of recentCalls) callByServer.set(e.serverId ?? '?', (callByServer.get(e.serverId ?? '?') ?? 0) + 1);
  for (const [sid, n] of callByServer) {
    if (n >= 50) findings.push({ type: 'call_spike', severity: 'high', serverId: sid, detail: `${n} proxied calls in the last 5 minutes` });
  }

  // N2 — sanitizer rejection hotspots (rejections:<serverId>:<toolName> counter),
  // paginated so KV's 1000-key list limit never silently truncates findings.
  let cursor: string | undefined
  let scanned = 0
  do {
    const rejList = await env.REGISTRY_KV.list({ prefix: KV_REJECTIONS_PREFIX, cursor, limit: 1000 })
    cursor = rejList.list_complete ? undefined : rejList.cursor
    for (const key of rejList.keys) {
      scanned++
      const v = await env.REGISTRY_KV.get(key.name).catch(() => null)
      const n = Number(v ?? '0')
      if (n >= 5) {
        const [, sid, tool] = key.name.split(':')
        findings.push({ type: 'sanitizer_rejections', severity: 'medium', serverId: sid ?? undefined, detail: `${n} rejected calls for ${tool ?? key.name} in the last 10 minutes` })
      }
      if (scanned >= 5000) break
    }
  } while (cursor && scanned < 5000)

  // 3) write-tool calls against read-only-safe servers (from the audit log).
  const entries = await getAllEntries(env);
  const roServers = new Map(entries.filter((e) => e.readOnlySafe).map((e) => [e.id, true]));
  const auditRaw = await env.REGISTRY_KV.get(KV_AUDIT_LOG);
  const audit: AuditEntry[] = auditRaw ? JSON.parse(auditRaw) : [];
  const writeOnRO = audit.slice(-200).filter((e) => e.risk === 'write' && roServers.has(e.serverId));
  for (const e of writeOnRO.slice(0, 5)) {
    findings.push({ type: 'write_on_readonly', severity: 'medium', serverId: e.serverId, detail: `${e.tool} (write) invoked on a read-only-safe server @ ${e.ts}` });
  }

  return json({ findings, windowSec: 300, checkedAt: new Date().toISOString() });
}

async function handleMe(env: Env, request: Request): Promise<Response> {
  const role = await getRole(env, request);
  const principal = await resolveActingPrincipal(env, request);
  return json({
    principal,
    role,
    can: {
      publish: ROLE_RANK[role] >= ROLE_RANK.publisher,
      review: ROLE_RANK[role] >= ROLE_RANK.reviewer,
      admin: ROLE_RANK[role] >= ROLE_RANK.admin,
    },
  });
}

async function handleRoles(env: Env, request: Request): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return roleError(auth);
  const body: any = await request.json().catch(() => null);
  const { principal, group, role } = body ?? {};
  if (!['viewer', 'publisher', 'reviewer', 'admin'].includes(role)) {
    return json({ error: 'required: role (viewer|publisher|reviewer|admin) + principal OR group' }, 400);
  }
  if (group) {
    await env.REGISTRY_KV.put(KV_GROUP_ROLES_PREFIX + String(group), role);
    return json({ group, role, assigned: true });
  }
  if (!principal) {
    return json({ error: 'required: principal + role (or group + role)' }, 400);
  }
  await env.REGISTRY_KV.put(KV_ROLES_PREFIX + String(principal), role);
  return json({ principal, role, assigned: true });
}

// ─── MCP-native discovery surface + well-known server card ─────────────────
// The marketplace itself is an MCP server: agents can tools/list → list_servers
// → get_server → call_tool and consume the catalog via the protocol. This is
// the "marketplace for agents" premise, and it makes the marketplace
// registrable in MCP directories.

const MCP_SURFACE_TOOLS = [
  {
    name: 'list_servers',
    description: 'List the MCP marketplace catalog (optional category/status filter).',
    inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'design|crypto|government|finance|social|infra|local' }, status: { type: 'string', description: 'live|unverified|degraded|down' } } },
  },
  {
    name: 'get_server',
    description: 'Get a server\'s detail + tool schemas by id.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'server id (e.g. p31-crypto, context7)' } }, required: ['id'] },
  },
  {
    name: 'call_tool',
    description: 'Invoke a tool on a registered server through the marketplace proxy (sanitized, audited, quota-gated).',
    inputSchema: { type: 'object', properties: { server: { type: 'string' }, tool: { type: 'string' }, arguments: { type: 'object' } }, required: ['server', 'tool'] },
  },
]

async function handleMcpSurface(env: Env, request: Request): Promise<Response> {
  // OAuth 2.1 resource-server gate: if a Bearer token was supplied on a
  // tools/call it MUST validate (RFC 8707 audience binding) — invalid ⇒
  // 401 MCP error result, never silently ignored.
  const auth = request.headers.get('Authorization') ?? '';
  if (auth.startsWith('Bearer ')) {
    let body: any = null;
    try { body = await request.clone().json(); } catch { body = null; }
    if (body?.method === 'tools/call') {
      const bearer = await verifyOAuthBearer(request, env);
      if (bearer === null) {
        return json(oauthGateError(body?.id ?? null), 401);
      }
    }
  }
  // Served by the SDK v2 stateless handler: modern 2026-07-28 requests
  // (server/discover, `_meta` envelope, resultType, ttlMs/cacheScope,
  // -32022 mismatches) and — via the default `legacy: 'stateless'`
  // fallback — 2025-era clients (initialize handshake + SSE-streamed
  // responses), equivalent to the previous hand-rolled legacy branch.
  const handler = createMcpHandler(() => buildRegistryServer(env));
  const res = await handler.fetch(request);
  // The SDK handler does not add CORS headers — re-apply the worker's own.
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

function buildRegistryServer(env: Env): McpServer {
  const server = new McpServer(
    { name: 'p31-mcp-marketplace', version: '2.0.0' },
    {
      capabilities: { tools: {} },
      cacheHints: { 'tools/list': { ttlMs: 60_000, cacheScope: 'public' } },
    },
  );

  server.registerTool(
    'list_servers',
    { description: 'List the MCP marketplace catalog (optional category/status filter).', inputSchema: fromJsonSchema(MCP_SURFACE_TOOLS[0].inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
    async (args) => {
      const a = (args ?? {}) as Record<string, unknown>;
      const u = new URL('https://registry.local/servers');
      if (a.category) u.searchParams.set('category', String(a.category));
      if (a.status) u.searchParams.set('status', String(a.status));
      const res = await handleListServers(env, u);
      const data: any = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data.servers ?? []) }] };
    },
  );

  server.registerTool(
    'get_server',
    { description: "Get a server's detail + tool schemas by id.", inputSchema: fromJsonSchema(MCP_SURFACE_TOOLS[1].inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
    async (args) => {
      const a = (args ?? {}) as Record<string, unknown>;
      const entry = await findFederatedEntry(env, String(a.id ?? ''));
      if (!entry) return { content: [{ type: 'text', text: JSON.stringify({ error: 'server not found' }) }], isError: true };
      const schemas = await getToolSchemas(env, entry);
      const health = await probeHealth(env, entry);
      const gov = await summary(env, entry, schemas, health);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: gov.id, name: gov.name, endpoint: gov.endpoint, status: gov.status, health: gov.health,
            toolCount: gov.toolCount, scan: gov.scan, review: gov.review, capabilities: gov.capabilities,
            drifted: gov.drifted, readOnlySafe: gov.readOnlySafe,
            tools: schemas.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
          }),
        }],
      };
    },
  );

  server.registerTool(
    'call_tool',
    { description: 'Invoke a tool on a registered server through the marketplace proxy (sanitized, audited, quota-gated).', inputSchema: fromJsonSchema(MCP_SURFACE_TOOLS[2].inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
    async (args, ctx) => {
      const a = (args ?? {}) as Record<string, unknown>;
      const entry = await findEntry(env, String(a.server ?? ''));
      if (!entry) return { content: [{ type: 'text', text: JSON.stringify({ error: 'server not found' }) }], isError: true };
      const req = ctx.http?.req ?? new Request('https://registry.local/');
      const r = await proxyToolCall(env, entry, String(a.tool ?? ''), (a.arguments ?? {}) as Record<string, unknown>, req);
      if (!r.ok) return { content: [{ type: 'text', text: JSON.stringify(r.body) }], isError: true };
      const content = (r.body as any)?.content ?? [{ type: 'text', text: JSON.stringify(r.body) }];
      return { content };
    },
  );

  return server;
}

function wellKnownCard() {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
    name: 'p31-mcp-marketplace',
    version: '2.0.0',
    description: 'P31 MCP Marketplace — governed catalog of MCP servers with live health, tool schemas, scanner verdicts, and a sandboxed call proxy. Discover via list_servers/get_server, invoke via call_tool.',
    protocolVersion: PROTOCOL_VERSION,
    serverInfo: { name: 'p31-mcp-marketplace', version: '2.0.0' },
    transport: { type: 'streamable-http', endpoint: 'https://mcp-registry.trimtab-signal.workers.dev/mcp' },
    capabilities: { tools: true },
    authentication: { required: false },
    oauth: {
      resource: RESOURCE_URI,
      authorizationServer: '/.well-known/oauth-authorization-server',
      protectedResource: '/.well-known/oauth-protected-resource',
      rfc8707: true,
    },
    repository: 'https://github.com/p31labs/production',
    homepage: 'https://mcp.p31ca.org',
    keywords: ['mcp', 'marketplace', 'registry', 'sovereign', 'post-quantum'],
    license: 'Apache-2.0',
  }
}

async function handleWellKnownMcp(env: Env): Promise<Response> {
  return json(wellKnownCard())
}

/** Agentic Resource Discovery (ARD) — canonical manifest (spec v1.0). */
async function handleArd(env: Env): Promise<Response> {
  const manifest = {
    specVersion: '1.0',
    host: {
      displayName: 'mcp-registry.trimtab-signal.workers.dev',
      identifier: 'did:web:mcp-registry.trimtab-signal.workers.dev',
    },
    entries: [
      {
        identifier: 'urn:air:mcp-registry.trimtab-signal.workers.dev:mcp:p31-mcp-marketplace',
        displayName: 'P31 MCP Marketplace',
        type: 'application/mcp-server-card+json',
        url: 'https://mcp-registry.trimtab-signal.workers.dev/.well-known/mcp/server-card.json',
        description: 'Governed catalog of MCP servers — discover, inspect, and invoke tools via the marketplace proxy.',
        representativeQueries: ['find an MCP server for a task', 'discover MCP tools', 'call an MCP tool'],
        trustManifest: { identity: 'did:web:mcp-registry.trimtab-signal.workers.dev' },
      },
    ],
  }
  return json(manifest)
}

/** AI catalog companion manifest (linked via <link rel="ai-catalog">). */
async function handleAiCatalog(env: Env): Promise<Response> {
  const catalog = {
    name: 'P31 MCP Marketplace',
    description: 'Governed catalog of MCP servers with live health probes, tool schemas, scanner verdicts, Ed25519 review signatures, and a sanitized call proxy.',
    resources: [
      { type: 'application/mcp-server-card+json', url: 'https://mcp-registry.trimtab-signal.workers.dev/.well-known/mcp/server-card.json' },
      { type: 'application/ard+json', url: 'https://mcp-registry.trimtab-signal.workers.dev/.well-known/ard.json' },
      { type: 'mcp', endpoint: 'https://mcp-registry.trimtab-signal.workers.dev/mcp' },
      { type: 'application/oauth-authorization-server-metadata+json', url: 'https://mcp-registry.trimtab-signal.workers.dev/.well-known/oauth-authorization-server' },
      { type: 'application/oauth-protected-resource-metadata+json', url: 'https://mcp-registry.trimtab-signal.workers.dev/.well-known/oauth-protected-resource' },
    ],
  }
  return json(catalog)
}

// ─── HTML listing (kept light; the portal is the real UI) ──────────────────

function htmlPage(summaries: Array<Awaited<ReturnType<typeof summary>>>): string {
  const rows = summaries
    .map(
      (s) => `<tr>
        <td><span>${s.icon ?? ''}</span> <code>${s.id}</code></td>
        <td><span class="badge badge-${s.kind}">${s.kind}</span> <span class="badge badge-cat">${s.category}</span></td>
        <td>${s.description}</td>
        <td><span class="dot dot-${s.health}"></span> ${s.health}</td>
        <td>${s.toolCount}</td>
        <td><span class="badge badge-${s.status}">${s.status}</span></td>
        <td><a href="/servers/${s.id}">details</a></td>
      </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>P31 MCP Registry</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0e17; color: #e0e6ed; padding: 2rem; }
    h1 { color: #00e5ff; margin-bottom: .25rem; }
    .subtitle { color: #7a8ba8; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .6rem .8rem; border-bottom: 1px solid #1a2236; }
    th { color: #7a8ba8; font-weight: 600; }
    a { color: #00e5ff; text-decoration: none; }
    code { background: #141c2e; padding: 2px 6px; border-radius: 4px; font-size: .9em; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: .8em; font-weight: 600; }
    .badge-remote { background: #0d2b3e; color: #00e5ff; }
    .badge-local { background: #2b1d0d; color: #ffb74d; }
    .badge-cat { background: #17243a; color: #a78bfa; }
    .badge-live { background: #0d2b1e; color: #34d399; }
    .badge-unverified { background: #2b1d0d; color: #fbbf24; }
    .badge-degraded { background: #2b2410; color: #fbbf24; }
    .badge-down { background: #2b0d0d; color: #fb7185; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
    .dot-up { background: #34d399; }
    .dot-degraded { background: #fbbf24; }
    .dot-down { background: #fb7185; }
    .footer { margin-top: 2rem; color: #556; font-size: .85em; }
  </style>
</head>
<body>
  <h1>P31 MCP Registry</h1>
  <p class="subtitle">Marketplace catalog for ${summaries.length} MCP servers — live-probed</p>
  <table>
    <thead><tr><th>Server</th><th>Type</th><th>Description</th><th>Health</th><th>Tools</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">
    <a href="/servers">JSON API</a> &middot;
    <a href="/categories">Categories</a> &middot;
    <a href="/health">Health</a> &middot;
    API: GET /servers, GET /servers/:name, GET /servers/:name/tools, POST /servers (register), POST /servers/:name/call
  </p>
</body>
</html>`;
}

// ─── Request router ─────────────────────────────────────────────────────────

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

    if (url.pathname === '/health') return handleHealth(env);

  // RFC 8414 — authorization-server metadata (points at the fleet AS).
  if (url.pathname === '/.well-known/oauth-authorization-server' && request.method === 'GET') {
    return json(oauthAsMetadata(env.RESOURCE_ID ?? RESOURCE_URI));
  }

  // RFC 9728 — protected-resource metadata (canonical path + alias).
  if ((url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === '/.well-known/resource-server') && request.method === 'GET') {
    return json(protectedResourceMetadata(env, RESOURCE_URI, ['registry:read', 'registry:write']));
  }

  // MCP-native discovery surface + well-known card
  if (url.pathname === '/mcp' && request.method === 'POST') return handleMcpSurface(env, request);
  if (url.pathname === '/mcp' && request.method === 'GET') {
    // Stateless 2026-07-28: GET /mcp returns endpoint metadata (SSE removed).
    return Response.json({
      service: 'p31-mcp-marketplace',
      transport: 'streamable-http',
      protocol: '2026-07-28',
      mcp: '/mcp',
      tools: 'POST /mcp {method:"tools/list"}',
    }, { headers: corsHeaders() });
  }
  // Server card served at every SEP-1649/SEP-2127 well-known alias.
  if (url.pathname === '/.well-known/mcp/server-card.json' || url.pathname === '/.well-known/mcp/server.json' || url.pathname === '/.well-known/mcp.json' || url.pathname === '/.well-known/mcp') return handleWellKnownMcp(env);
  // Agentic Resource Discovery manifest + AI catalog companion.
  if (url.pathname === '/.well-known/ard.json') return handleArd(env);
  if (url.pathname === '/.well-known/ai-catalog.json') return handleAiCatalog(env);
  // Robots with the ARD Agentmap advertisement (helps crawl-based discovery).
  if (url.pathname === '/robots.txt' && request.method === 'GET') {
    return new Response('User-agent: *\nAllow: /\nAgentmap: https://mcp-registry.trimtab-signal.workers.dev/.well-known/ard.json\n', { headers: { 'Content-Type': 'text/plain', ...corsHeaders() } });
  }

  if (url.pathname === '/categories' && request.method === 'GET') return handleCategories(env);

  // Observability
  if (url.pathname === '/audit' && request.method === 'GET') return handleAudit(env, request);
  if (url.pathname === '/audit/export' && request.method === 'GET') return handleAuditExport(env, request);
  if (url.pathname === '/transparency' && request.method === 'GET') return handleTransparency(env, request);
  if (url.pathname === '/logs' && request.method === 'GET') return handleLogs(env, request);
  if (url.pathname === '/errors' && request.method === 'GET') return handleErrors(env, request);
  if (url.pathname === '/anomalies' && request.method === 'GET') return handleAnomalies(env, request);
  if (url.pathname === '/ingest/errors' && request.method === 'POST') return handleIngestError(env, request);

  // Moderation queue
  if (url.pathname === '/servers/pending' && request.method === 'GET') return handlePending(env, request);

  // E — Enterprise governance: approval gate + usage counters + analytics
  if (url.pathname === '/internal/usage' && request.method === 'POST') return handleInternalUsage(env, request);
  if (url.pathname === '/analytics/tools' && request.method === 'GET') return handleAnalyticsTools(env, request);

  // RBAC identity + role management
  if (url.pathname === '/me' && request.method === 'GET') return handleMe(env, request);
  if (url.pathname === '/roles' && request.method === 'POST') return handleRoles(env, request);

  if (url.pathname === '/servers' && request.method === 'GET') return handleListServers(env, url);
  if (url.pathname === '/servers' && request.method === 'POST') return handleRegister(env, request);

  if (url.pathname === '/' && request.method === 'GET') {
    const entries = await getAllEntries(env);
    const summaries = await buildSummaries(env, entries);
    return new Response(htmlPage(summaries), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
    });
  }

  const reviewMatch = url.pathname.match(/^\/servers\/([^/]+)\/review$/);
  if (reviewMatch && request.method === 'POST') return handleReview(env, decodeURIComponent(reviewMatch[1]), request);

  const approveMatch = url.pathname.match(/^\/servers\/([^/]+)\/approve$/);
  if (approveMatch && request.method === 'POST') return handleApprove(env, decodeURIComponent(approveMatch[1]), request);

  const detailMatch = url.pathname.match(/^\/servers\/([^/]+)$/);
  if (detailMatch && request.method === 'GET') return handleServerDetail(env, decodeURIComponent(detailMatch[1]));

  const toolsMatch = url.pathname.match(/^\/servers\/([^/]+)\/tools$/);
  if (toolsMatch && request.method === 'GET') return handleServerTools(env, decodeURIComponent(toolsMatch[1]));

  const healthMatch = url.pathname.match(/^\/servers\/([^/]+)\/health$/);
  if (healthMatch && request.method === 'GET') return handleServerHealth(env, decodeURIComponent(healthMatch[1]));

  const callMatch = url.pathname.match(/^\/servers\/([^/]+)\/call$/);
  if (callMatch && request.method === 'POST') return handleCall(env, decodeURIComponent(callMatch[1]), request);

  return json({ error: 'not found' }, 404);
}

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const start = Date.now();
  const res = await handleRequest(request, env);
  // Structured observability: one JSON line per request (best-effort, never
  // blocks the response). Call proxy entries additionally land in /audit.
  const url = new URL(request.url);
  void appendLog(env, {
    level: res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info',
    method: request.method,
    path: url.pathname,
    status: res.status,
    latencyMs: Date.now() - start,
    serverId: url.pathname.match(/^\/servers\/([^/]+)/)?.[1],
  }).catch(() => {});
  return res;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleFetch(request, env);
  },
};

// Named exports for tests / internal reuse. The Worker runtime only uses the
// default `fetch` export; these are harmless to ship.
export const __internal = {
  handleRequest,
  handleFetch,
  toolRisk,
  inferReadOnlySafe,
  summary,
  rpcCall,
  probeTools,
  probeEndpoint,
  probeHealth,
  probeConformance,
  getToolSchemas,
  sha256Hex,
  appendAudit,
  verifyAuditChain,
  appendTransparency,
  appendLog,
  appendError,
  ed25519Sign,
  ed25519Verify,
  signReview,
  rateLimited,
  enforceToolQuota,
  checkDrift,
  toolsHash,
  scanToolSurface,
  deriveCapabilities,
  mintCapabilityToken,
  getScanMeta,
  getCapabilityMeta,
  validateArgs,
  validateBodySize,
  ledgerStub,
  readLedger,
  getRole,
  resolvePrincipal,
  requireRole,
  verifyAccessJwt,
  fetchOfficialUpstream,
  normalizeOfficialServers,
  priceTierFor,
  enrichEntry,
  upstreamToEntry,
  getFederatedEntries,
  findFederatedEntry,
  adminSecretOk,
  timingSafeEqualStr,
  GATEWAY_PRICING,
  OFFICIAL_CATALOG,
  PROTOCOL_VERSION,
  PROBE_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
};