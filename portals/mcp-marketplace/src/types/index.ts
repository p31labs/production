// ============================================================================
// Shared types for the P31 MCP Marketplace
// ============================================================================

/** The six surfaces available in the marketplace. */
export type SurfaceId =
  | 'home'
  | 'discover'
  | 'server'
  | 'playground'
  | 'publish'
  | 'review'
  | 'docs'

/** Session elevation modes. */
export type Mode = 'spark' | 'maker' | 'workshop'

/** Spoon dial energy levels (0–5). 0 = calm (crisis). */
export type SpoonLevel = 0 | 1 | 2 | 3 | 4 | 5

// ─── Marketplace data model (mirrors mcp-registry API) ─────────────────────

export type Category = 'design' | 'crypto' | 'government' | 'finance' | 'social' | 'infra' | 'local'
export type Status = 'live' | 'unverified' | 'degraded' | 'down'
export type Health = 'up' | 'degraded' | 'down'

export interface VerifyMeta {
  alg: 'ML-DSA-65'
  sbt?: boolean
  checkedAt: string
}

export interface ReviewMeta {
  signedBy: string
  alg: 'Ed25519'
  signature: string
  checkedAt: string
}

export interface ScanMeta {
  verdict: 'clean' | 'suspicious' | 'malicious'
  score: number
  maliciousCount: number
  suspiciousCount: number
  scannedAt: string
}

export interface CapabilityManifest {
  tools: string[]
  dataSources: string[]
  externalServices: string[]
  writeCapable: boolean
}

export type Role = 'viewer' | 'publisher' | 'reviewer' | 'admin'

export interface MeResponse {
  principal: string
  role: Role
  can: { publish: boolean; review: boolean; admin: boolean }
}

/** Stream federation source (A-2). */
export type CatalogSource = 'p31' | 'official' | 'external'

/** x402 price tier surfaced from the gateway PRICING table (Lane A). */
export interface PriceTier {
  id?: string
  tier: string
  label?: string
  usdPerCall?: number
  usdPerMonth?: number
  currency?: string
  notes?: string
}

/** OAuth resource metadata (Lane A). Absent until the registry ships it. */
export interface OAuthMeta {
  enabled: boolean
  resource?: string
  authorizationServers?: string[]
}

/** Enterprise approval state (Lane E). Absent until the registry ships it. */
export type Approval = 'approved' | 'pending' | 'blocked'

export interface ServerSummary {
  id: string
  name: string
  endpoint: string
  kind: 'remote' | 'local'
  category: Category
  description: string
  tags: string[]
  author: string
  icon?: string
  status: Status
  verify?: VerifyMeta
  review?: ReviewMeta
  scan?: ScanMeta
  needsReview?: boolean
  capabilities?: CapabilityManifest
  readOnlySafe: boolean
  health: Health
  healthDetail?: string
  latencyMs: number
  checkedAt: string
  toolCount: number
  tools: string[]
  localNote?: string
  contentHash?: string
  baselineHash?: string | null
  drifted?: boolean
  /** Governed metadata — optional until the registry federation lanes ship. */
  source?: CatalogSource
  protocol?: string | null
  oauth?: OAuthMeta | null
  priceTier?: PriceTier | null
  approval?: Approval | null
}

export interface ToolSchema {
  type?: 'object'
  properties?: Record<string, unknown>
  required?: string[]
}

export interface ToolDef {
  name: string
  description?: string
  inputSchema?: ToolSchema
  risk: 'read' | 'write'
}

export interface ServerDetail extends Omit<ServerSummary, 'tools'> {
  tools: ToolDef[]
  baselineTools?: Array<{ name: string; description: string }>
}

export interface CategoryCount {
  id: Category
  count: number
  toolCount: number
}

/** One playground session event (a tool invocation). */
export interface SessionEvent {
  id: string
  serverId: string
  serverName: string
  tool: string
  args: Record<string, unknown>
  status: 'running' | 'done' | 'error'
  risk: 'read' | 'write'
  result?: unknown
  error?: string
  latencyMs?: number
  /** Raw JSON-RPC exchange (C-1): exact request body + raw response body. */
  request?: string
  response?: string
  ts: number
}

// ─── Dual lens (B-3) ────────────────────────────────────────────────────────

/** public = catalog as-is; governed = approvals/private/analytics/publish. */
export type Lens = 'public' | 'governed'

// ─── Inspect-any-URL (B-2) ──────────────────────────────────────────────────

export interface ExternalServerInfo {
  name: string
  version?: string
}

export interface ExternalProbeResult {
  url: string
  /** ok = full handshake + tools/list; degraded = partial; dead = nothing. */
  status: 'ok' | 'degraded' | 'dead'
  error?: string
  latencyMs?: number
  protocolVersion?: string
  serverInfo?: ExternalServerInfo
  tools?: ToolDef[]
  /** Raw probe transcripts (honesty surface). */
  initializeRequest?: string
  initializeResponse?: string
  toolsRequest?: string
  toolsResponse?: string
  probedAt: string
}

// ─── LLM Test Console (C-4) ─────────────────────────────────────────────────

export type LlmBackend = 'litellm' | 'hosted' | 'disabled'

export interface LlmConfig {
  backend: LlmBackend
  litellmUrl: string
  litellmModel: string
  hostedBaseUrl: string
  hostedApiKey: string
  hostedModel: string
}

export interface LlmToolCall {
  tool: string
  args: Record<string, unknown>
  reason?: string
}

export interface LlmConsoleMessage {
  role: 'user' | 'assistant'
  text: string
  calls?: LlmToolCall[]
  ts: number
}

// ─── Keep the original kernel intent types (used by vendored @p31ca/ui helpers) ──

export type IntentKind = 'forge-letter' | 'forge-memo' | 'forge-report' | 'unknown'
export type PlanStage = 'classify' | 'render'
export interface Intent {
  kind: IntentKind
  title: string
  theme: 'hub' | 'scene'
  raw: string
}