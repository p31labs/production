// ============================================================================
// Shared types for the P31 Quantum Material Workspace
// ============================================================================

/** The seven surfaces available in the workspace. */
export type SurfaceId =
  | 'home'
  | 'docs'
  | 'sheets'
  | 'slides'
  | 'calendar'
  | 'mail'
  | 'drive'
  | 'profile'
  | 'identity'

/** Session elevation modes. */
export type Mode = 'spark' | 'maker' | 'workshop'

/** Spoon dial energy levels (0–5). 0 = crisis. */
export type SpoonLevel = 0 | 1 | 2 | 3 | 4 | 5

/** Kernel intent kinds (honest: only Forge routing, no calendar-schedule yet). */
export type IntentKind = 'forge-letter' | 'forge-memo' | 'forge-report' | 'unknown'

/** The deterministic routing plan — only stages that actually run. */
export type PlanStage = 'classify' | 'render'

/** A kernel intent. */
export interface Intent {
  kind: IntentKind
  title: string
  theme: 'hub' | 'scene'
  raw: string
}

/** A Forge content block. */
export interface ForgeBlock {
  type: 'h1' | 'h2' | 'para' | 'evidence'
  text?: string
  claim?: string
  value?: string
  source?: string
  verified?: string
}

/** A Forge request payload. */
export interface ForgeRequest {
  kind: 'letter' | 'memo' | 'report'
  theme: 'hub' | 'scene'
  title: string
  body: ForgeBlock[]
}