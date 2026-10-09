/**
 * PolicyGate — risk-class A/B/C authorization.
 *
 * Class A: auto-execute (formatting, headings, citations).
 * Class B: standing approval (one consent per session; the agent drafts freely).
 * Class C: explicit approval per action (sending externally, signing, committing to chain).
 *
 * The gate is the trust boundary between "the agents may act" and "the family
 * decides". It mirrors the QPJ ModeGate: elevated actions require a human.
 */
import type { PolicyDecision, RiskClass } from './types.js'

export interface PolicyRule {
  /** Matcher for action names, e.g. 'forge.render', 'send.external', 'sign.pqc'. */
  pattern: RegExp
  risk: RiskClass
}

export interface ApprovalSurface {
  /** Called when a Class C action needs explicit human approval. */
  requestApproval(action: string, reason: string, runId: string): Promise<boolean>
}

const DEFAULT_RULES: PolicyRule[] = [
  { pattern: /^forge\.render$/, risk: 'A' },
  { pattern: /^draft\.(section|evidence)$/, risk: 'B' },
  { pattern: /^send\.(external|school)$/, risk: 'C' },
  { pattern: /^sign\./, risk: 'C' },
  { pattern: /^chain\.commit$/, risk: 'C' },
]

export { DEFAULT_RULES }

export class PolicyGate {
  private rules: PolicyRule[]
  private approvals = new Set<string>() // B-consented action names for the session
  private surface: ApprovalSurface

  constructor(surface: ApprovalSurface, rules: PolicyRule[] = DEFAULT_RULES) {
    this.surface = surface
    this.rules = rules
  }

  private classify(action: string): RiskClass {
    for (const rule of this.rules) {
      if (rule.pattern.test(action)) return rule.risk
    }
    return 'A'
  }

  /** Consent a Class B action for the rest of the session. */
  consentB(action: string): void {
    this.approvals.add(action)
  }

  /**
   * Decide an action. Returns allow/requiresApproval. For Class C, asks the
   * human via the approval surface (unless already consented as B).
   */
  async decide(action: string, runId: string, reason = 'agent action'): Promise<PolicyDecision> {
    const risk = this.classify(action)
    switch (risk) {
      case 'A':
        return { risk, allow: true, requiresApproval: false, reason: 'class A — auto' }
      case 'B': {
        if (this.approvals.has(action)) {
          return { risk, allow: true, requiresApproval: false, reason: 'class B — standing approval' }
        }
        return { risk, allow: true, requiresApproval: true, reason: 'class B — needs one-time consent' }
      }
      case 'C': {
        const ok = await this.surface.requestApproval(action, reason, runId)
        return {
          risk,
          allow: ok,
          requiresApproval: true,
          reason: ok ? 'class C — human approved' : 'class C — human declined',
        }
      }
    }
  }
}