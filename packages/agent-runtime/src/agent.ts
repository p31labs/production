/**
 * Agent base — the kernel's agent primitive.
 *
 * Each agent has an identity (role + did), a job, and runs within the bus.
 * The coordinator composes these into a pipeline; no agent reaches outside
 * its lane.
 */
import type { AgentIdentityRef } from './types.js'

export interface AgentContext {
  runId: string
  member: string
  sessionId?: string
}

export interface AgentResult {
  ok: boolean
  content?: string
  evidence?: Array<{ claim: string; value?: string; source: string; verified: string }>
  memoryWrites?: Array<{ scope: 'personal' | 'household' | 'session'; key: string; value: unknown; provenance: string }>
  error?: string
}

export abstract class Agent {
  readonly role: string
  readonly did: string
  readonly name: string

  constructor(ref: AgentIdentityRef) {
    this.role = ref.role
    this.did = ref.did
    this.name = ref.name
  }

  abstract run(task: string, ctx: AgentContext): Promise<AgentResult>
}