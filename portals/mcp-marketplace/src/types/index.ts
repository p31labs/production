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
  ts: number
}

// ─── Keep the original kernel intent types (used by vendored @p31/ui helpers) ──

export type IntentKind = 'forge-letter' | 'forge-memo' | 'forge-report' | 'unknown'
export type PlanStage = 'classify' | 'render'
export interface Intent {
  kind: IntentKind
  title: string
  theme: 'hub' | 'scene'
  raw: string
}