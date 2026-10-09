/**
 * Coordinator — the chief-of-staff agent.
 *
 * Decomposes a family intent ("draft an IEP request letter for Willow with
 * her diagnosis date") into pipeline tasks, routes them to drafting/context
 * agents, collects evidence, and assembles a forge-ready pack.
 *
 * The decomposition is deterministic (section-rule based), not LLM-scripted:
 * families get predictable behavior. Per the research, "the hardest part was
 * making powerful automation feel predictable."
 */
import { Agent, type AgentContext, type AgentResult } from './agent.js'
import type { AgentIdentityRef, ForgePack, PipelineTask } from './types.js'

export interface CoordinatorConfig {
  // section title -> instruction template. {INTENT} is substituted.
  sections?: Array<{ key: string; title: string; prompt: (intent: string) => string }>
  /** Signature: find an evidence item. Returns claim/value/source/verified or null. */
  evidenceResolver?: (intent: string) => Promise<{
    claim: string
    value?: string
    source: string
    verified: string
  } | null>
}

const DEFAULT_SECTIONS: CoordinatorConfig['sections'] = [
  {
    key: 'request',
    title: 'Request',
    prompt: (i) => `Write the request section of: ${i}`,
  },
  {
    key: 'evidence',
    title: 'Evidence',
    prompt: () => 'List the supporting evidence for this request with sources.',
  },
  {
    key: 'closing',
    title: 'Closing',
    prompt: () => 'Write a courteous closing asking for timely action.',
  },
]

export class Coordinator extends Agent {
  private config: CoordinatorConfig
  private drafting: Record<string, Agent>

  constructor(
    ref: AgentIdentityRef,
    draftingAgents: Record<string, Agent>,
    config: Partial<CoordinatorConfig> = {},
  ) {
    super(ref)
    this.drafting = draftingAgents
    this.config = {
      sections: config.sections ?? DEFAULT_SECTIONS,
      evidenceResolver: config.evidenceResolver,
    }
  }

  async run(task: string, ctx: AgentContext): Promise<AgentResult> {
    // Decompose the intent into tasks.
    const sectionRules = this.config.sections!
    const tasks: PipelineTask[] = sectionRules.map((s, i) => ({
      id: `${ctx.runId}-${s.key}`,
      section: s.key,
      kind: s.key === 'evidence' ? 'evidence' : 'write',
      instruction: s.prompt(task),
    }))

    const evidence: Array<{ claim: string; value?: string; source: string; verified: string }> = []
    const sections: Array<{ type: 'para' | 'h1' | 'h2' | 'evidence'; text?: string; claim?: string; value?: string; source?: string; verified?: string }> = []

    // Route each task to the matching drafting agent (or resolve evidence).
    for (const t of tasks) {
      if (t.kind === 'evidence' && this.config.evidenceResolver) {
        const found = await this.config.evidenceResolver(task)
        if (found) {
          evidence.push(found)
          sections.push({ type: 'evidence', ...found })
        }
        continue
      }
      const drafter = this.drafting[t.section] ?? this.drafting['default']
      if (!drafter) continue
      const res = await drafter.run(t.instruction, ctx)
      if (res.ok && res.content) {
        sections.push({ type: t.section === 'request' ? 'h1' : 'h2', text: t.section })
        sections.push({ type: 'para', text: res.content })
      }
    }

    // Assemble a forge-ready pack.
    const output: ForgePack = {
      kind: 'letter',
      theme: 'hub',
      title: task.replace(/^draft\s+(a|an)\s+/i, '').replace(/\s+for\s+.*$/i, '') || 'Untitled',
      body: sections.map((s) => {
        if (s.type === 'evidence') {
          return { type: 'evidence', claim: s.claim!, value: s.value, source: s.source!, verified: s.verified! }
        }
        return { type: s.type as 'para' | 'h1' | 'h2', text: s.text! }
      }),
    }

    return {
      ok: true,
      content: JSON.stringify({
        tasks: tasks.map((t) => t.section),
        evidence,
        pack: output,
      }),
      evidence,
    }
  }
}