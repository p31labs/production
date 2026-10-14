// Document IR types — TypeScript mirror of the forge's
// schema/document-ir.schema.json. The workspace builds IR; the render worker
// (and the local CLI) consumes it.

export type DocType =
  | 'report' | 'brief' | 'letter' | 'memo' | 'deck' | 'grant'
  | 'table-report' | 'agenda' | 'digest' | 'credential' | 'packet'
  | 'runbook' | 'guide' | 'family-letter'

export type BlockKind =
  | 'section' | 'heading' | 'prose' | 'list' | 'kpi-set' | 'table' | 'callout'
  | 'email' | 'cards' | 'quote' | 'steps' | 'timeline' | 'signature' | 'figure'
  | 'methodology' | 'checklist' | 'toc' | 'pagebreak'

export type BlockRole = 'summary' | 'body' | 'support' | 'appendix' | 'colophon'

export type SourceSurface =
  | 'docs' | 'sheets' | 'slides' | 'mail' | 'calendar' | 'forum' | 'life' | 'passports' | 'drive'

export interface IRMeta {
  title: string
  kicker?: string
  thesis?: string
  session?: string
  date?: string
  author?: string
  footer?: string
  source?: SourceSurface
}

export interface IRBlock {
  kind: BlockKind
  id?: string
  title?: string
  role?: BlockRole
  keepWith?: string
  columns?: number
  wordBudget?: number
  moveTo?: string
  children?: IRBlock[]
  data?: Record<string, unknown>
}

export interface DocumentIR {
  type: DocType
  template?: string
  theme?: string
  meta: IRMeta
  blocks: IRBlock[]
  children?: DocumentIR[]
  exec?: { takeaway?: string; keyFindings?: string[]; kpiItems?: unknown[]; kpiMeta?: Record<string, string> }
}