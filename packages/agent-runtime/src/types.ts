/**
 * @p31ca/agent-runtime — shared types.
 *
 * The family orchestration kernel contract. Per the 2026 research:
 *   - scoped memory is enforced BELOW the prompt layer (isolation fails at
 *     retrieval, not after),
 *   - every memory record carries owner + provenance + confidence +
 *     supersession (without provenance a family agent can't tell a direct
 *     instruction from a weak pattern),
 *   - policy is risk classes A/B/C with a human approval surface for Class C,
 *   - the pipeline is: chief-of-staff → context → drafting agents → forge
 *     render → QA → human approval → loom chain.
 */

/** Event bus message. */
export interface KernelEvent {
  type: string
  payload: unknown
  source: string
  ts: number
}

/** Memory scope — enforced before retrieval. */
export type MemoryScope = 'personal' | 'household' | 'session'

export interface MemoryRecord {
  id: string
  scope: MemoryScope
  owner: string
  key: string
  value: unknown
  provenance: string
  confidence: number
  supersededBy?: string
  ts: number
}

/** Risk classes — the policy engine. */
export type RiskClass = 'A' | 'B' | 'C'

export interface PolicyDecision {
  risk: RiskClass
  allow: boolean
  requiresApproval: boolean
  reason: string
}

export interface AgentIdentityRef {
  role: string
  did: string
  name: string
}

export interface EvidenceRef {
  claim: string
  value?: string
  source: string
  verified: string
}

/** A forge-ready body item (mirrors @p31ca/forge-mcp types). */
export type ForgeBodyItem =
  | { type: 'para'; text: string }
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'evidence'; claim: string; value?: string; source: string; verified: string }

export interface ForgePack {
  kind: 'memo' | 'report' | 'letter' | 'grant'
  theme: 'hub' | 'scene'
  title: string
  body: ForgeBodyItem[]
}

/** A decomposed pipeline task. */
export interface PipelineTask {
  id: string
  section: string
  kind: 'write' | 'retrieve' | 'evidence'
  instruction: string
}

/** The full pipeline run. */
export interface PipelineRun {
  id: string
  intent: string
  tasks: PipelineTask[]
  provenance: AgentIdentityRef[]
  memoryWrites: MemoryRecord[]
  evidence: EvidenceRef[]
  policy: PolicyDecision[]
  output: ForgePack | null
  status: 'decomposed' | 'drafted' | 'rendered' | 'pending_approval' | 'approved' | 'failed'
}