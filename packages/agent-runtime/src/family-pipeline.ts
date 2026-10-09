/**
 * FamilyPipeline — the end-to-end agentic document pipeline.
 *
 *   intent → coordinator decomposes → drafting agents write sections →
 *   evidence resolved → forge-ready pack assembled → policy gate decides →
 *   approval surfaced (Class C) → output returned.
 *
 * This is the kernel's public face: a family member describes a document,
 * and the pipeline produces a forge-ready themed pack (which the Forge MCP
 * then renders to a .docx). Every step is recorded on the event bus so the
 * Loom can hash-chain the provenance.
 */
import { EventBus } from './event-bus.js'
import { ScopedMemoryStore } from './scoped-memory.js'
import { PolicyGate, type ApprovalSurface } from './policy-gate.js'
import { Coordinator } from './coordinator.js'
import type { Agent, AgentContext } from './agent.js'
import type { ForgePack, MemoryRecord } from './types.js'

export interface FamilyPipelineOptions {
  member: string
  householdMembers: string[]
  coordinator: Coordinator
  memory: ScopedMemoryStore
  policy: PolicyGate
  bus?: EventBus
}

export interface PipelineOutput {
  pack: ForgePack
  runId: string
  approval: { required: boolean; allowed: boolean }
  provenance: MemoryRecord[]
}

export class FamilyPipeline {
  private member: string
  private coordinator: Coordinator
  memory: ScopedMemoryStore
  policy: PolicyGate
  bus: EventBus

  constructor(opts: FamilyPipelineOptions) {
    this.member = opts.member
    this.coordinator = opts.coordinator
    this.memory = opts.memory
    this.policy = opts.policy
    this.bus = opts.bus ?? new EventBus()
  }

  /** Consent a Class B action for the rest of the session. */
  consent(action: string): void {
    this.policy.consentB(action)
  }

  async run(intent: string, sessionId?: string): Promise<PipelineOutput> {
    const runId = `run-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    const ctx: AgentContext = { runId, member: this.member, sessionId }
    this.bus.emit('pipeline.start', { runId, intent }, 'family-pipeline')

    const res = await this.coordinator.run(intent, ctx)
    const parsed = (res.content ? JSON.parse(res.content) : null) as {
      tasks: string[]
      evidence: Array<{ claim: string; value?: string; source: string; verified: string }>
      pack: ForgePack
    } | null

    // The coordinator assembles the forge-ready pack directly.
    const assembled: ForgePack =
      parsed?.pack ?? {
        kind: 'letter',
        theme: 'hub',
        title: 'Untitled',
        body: [],
      }

    // Record memory writes from the pipeline (household: the family's shared facts).
    const provenance: MemoryRecord[] = []
    if (parsed) {
      for (const e of parsed.evidence ?? []) {
        const rec = this.memory.write(
          this.member,
          'household',
          `evidence:${e.claim}`,
          e,
          `family-pipeline:${runId}`,
          0.95,
        )
        provenance.push(rec)
      }
    }

    // Policy: rendering is Class A; the final "send/commit" is the family's call.
    const decision = await this.policy.decide('forge.render', runId, `render document for "${intent}"`)
    this.bus.emit('pipeline.done', { runId, allowed: decision.allow }, 'family-pipeline')

    return {
      pack: assembled,
      runId,
      approval: { required: decision.requiresApproval, allowed: decision.allow },
      provenance,
    }
  }
}