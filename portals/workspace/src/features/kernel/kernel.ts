/**
 * @file kernel.ts — the deterministic routing layer.
 *
 * Not an LLM. A router: takes a family member's intent, classifies it,
 * and returns the Forge pack that will be rendered.
 *
 * Honest scope: this file routes intent to a Forge render. It does NOT do
 * (and does not claim to do):
 *   - no event bus (dispatch is a direct call)
 *   - no multi-agent scheduling or conflict resolution
 *   - no chain journaling (a Loom append is identity-gated and unwired)
 */
import type { Intent, IntentKind, PlanStage } from '@/types'

export type { Intent, IntentKind, PlanStage }

export function classifyIntent(raw: string): Intent {
  const s = raw.trim().toLowerCase()
  if (s.includes('letter')) return { kind: 'forge-letter', title: raw.trim(), theme: 'hub', raw }
  if (s.includes('report')) return { kind: 'forge-report', title: raw.trim(), theme: 'scene', raw }
  return { kind: 'forge-memo', title: raw.trim(), theme: 'hub', raw }
}

/** The plan only names stages that actually run in this build. */
export function planFor(): PlanStage[] {
  return ['classify', 'render']
}

/** Map an intent to the forge pack shape (kind + theme). */
export function forgeKindFor(intent: Intent): { kind: 'letter' | 'memo' | 'report'; theme: 'hub' | 'scene' } {
  switch (intent.kind) {
    case 'forge-letter':
      return { kind: 'letter', theme: 'hub' }
    case 'forge-report':
      return { kind: 'report', theme: 'scene' }
    default:
      return { kind: 'memo', theme: 'hub' }
  }
}

/**
 * Dispatch — the single execution path. Takes a raw family intent and returns
 * the forge pack + honest plan. The caller (Drive) runs the render.
 */
export function dispatch(raw: string): {
  intent: Intent
  plan: PlanStage[]
  pack: { kind: 'letter' | 'memo' | 'report'; theme: 'hub' | 'scene' }
} {
  const intent = classifyIntent(raw)
  return { intent, plan: planFor(), pack: forgeKindFor(intent) }
}