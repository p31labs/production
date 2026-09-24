/**
 * @file kernel.ts — the deterministic routing layer.
 *
 * Not an LLM. A router: takes a family member's intent, classifies it,
 * builds an execution plan, and dispatches to the right surface action.
 *
 * Honest scope: this file routes intent to a Forge render. What it does NOT
 * do yet (and therefore does not claim to do):
 *   - no event bus (there is no pub/sub; dispatch is a direct call)
 *   - no multi-agent scheduling or conflict resolution
 *   - no chain journaling (a Loom append is identity-gated and unwired)
 * The plan emitted reflects only stages that actually run.
 *
 * Intent shapes we route today:
 *   "draft a letter about X"     → Forge (letter, hub theme)
 *   "make a memo about X"        → Forge (memo, hub theme)
 *   "generate a report on X"     → Forge (report, scene theme)
 *   (default)                    → Forge (memo, hub theme)
 */

export type IntentKind = 'forge-letter' | 'forge-memo' | 'forge-report' | 'unknown'

export interface Intent {
  kind: IntentKind
  title: string
  theme: 'hub' | 'scene'
  raw: string
}

export type PlanStage = 'classify' | 'render'

/** The plan only names stages that actually run in this build. */
export function classifyIntent(raw: string): Intent {
  const s = raw.trim().toLowerCase()
  if (s.includes('letter')) return { kind: 'forge-letter', title: raw.trim(), theme: 'hub', raw }
  if (s.includes('report')) return { kind: 'forge-report', title: raw.trim(), theme: 'scene', raw }
  return { kind: 'forge-memo', title: raw.trim(), theme: 'hub', raw }
}

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
 * the forge pack that will be rendered. The caller (Drive) runs the render.
 */
export function dispatch(raw: string): { intent: Intent; plan: PlanStage[]; pack: { kind: 'letter' | 'memo' | 'report'; theme: 'hub' | 'scene' } } {
  const intent = classifyIntent(raw)
  const plan = planFor()
  const pack = forgeKindFor(intent)
  return { intent, plan, pack }
}