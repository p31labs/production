/**
 * @p31ca/forge-mcp — shared types.
 *
 * Mirrors the P31 Forge content-pack contract (software/p31-forge/forge.js):
 * typed body items → themed .docx. The `evidence` item is the P31 credibility
 * transducer: claim + value + source + verified date. No claim without a
 * source, no source without a date.
 */

/** A typed body item the Forge renders. */
export type ForgeBodyItem =
  | { type: 'para'; text: string }
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'numbered'; text: string }
  | { type: 'affects'; text: string }
  | {
      type: 'evidence'
      claim: string
      value?: string
      source: string
      verified: string
    }
  | { type: 'timeline'; entries: Array<{ date: string; event: string }> }

/** The content-pack kinds the Forge supports. */
export type ForgeKind =
  | 'paper'
  | 'court'
  | 'letter'
  | 'resolution'
  | 'memo'
  | 'grant'
  | 'report'

/** Two-mode theming. */
export type ForgeTheme = 'hub' | 'scene'

/** A complete content pack. */
export interface ForgePack {
  kind: ForgeKind
  theme?: ForgeTheme
  title: string
  date?: string
  filename?: string
  amount?: string
  body: ForgeBodyItem[]
}

/** The Forge /brand response shape. */
export interface ForgeBrand {
  colors: Record<string, string>
  themes: Record<ForgeTheme, Record<string, string>>
  type: Record<string, string | number>
  entity: Record<string, string>
  social: Record<string, unknown>
}