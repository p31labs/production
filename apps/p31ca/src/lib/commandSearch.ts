import { NAV_ATOMS, LAB_ITEMS, ACT_NAMES } from './nav'
import { DESTINATIONS } from './portalRouter'

/**
 * @file commandSearch.ts — the command palette's searchable index.
 *
 * Pure + edge-safe (no DOM, no React). Builds a flat, ranked index of every
 * navigable destination: the 11 act-atoms, the 3 lab items, and the 6 journey
 * portals. The palette queries this.
 */

export type CommandKind = 'atom' | 'lab' | 'portal'

export interface Command {
  id: string
  kind: CommandKind
  label: string
  hint: string
  href?: string
  keywords?: string[]
}

export function buildIndex(): Command[] {
  const out: Command[] = []

  for (const atom of NAV_ATOMS) {
    const act = ACT_NAMES[atom.act]
    out.push({
      id: `atom-${atom.id}`,
      kind: 'atom',
      label: atom.label,
      hint: `${act.name} · ${act.label}`,
      href: atom.href,
    })
  }

  for (const item of LAB_ITEMS) {
    out.push({
      id: `lab-${item.id}`,
      kind: 'lab',
      label: item.label,
      hint: item.description,
      href: item.href,
      keywords: ['lab', 'admin'],
    })
  }

  for (const dest of DESTINATIONS) {
    out.push({
      id: `portal-${dest.id}`,
      kind: 'portal',
      label: dest.label,
      hint: dest.description,
      href: dest.url,
      keywords: ['portal', 'journey', 'family'],
    })
  }

  return out
}

export const COMMAND_INDEX: Command[] = buildIndex()

/**
 * Ranked search over the command index.
 *
 * Ranking: exact label > label starts-with > label contains > keyword > hint.
 * Ties break by label length (shorter first). Empty query returns the full index.
 */
export function searchCommands(query: string, index: Command[] = COMMAND_INDEX): Command[] {
  const q = query.trim().toLowerCase()
  if (!q) return index

  const scored = index
    .map((cmd) => {
      const label = cmd.label.toLowerCase()
      let score = 0
      if (label === q) score = 100
      else if (label.startsWith(q)) score = 80
      else if (label.includes(q)) score = 60
      else if (cmd.keywords?.some((k) => k.toLowerCase().includes(q))) score = 40
      else if (cmd.hint.toLowerCase().includes(q)) score = 20
      return { cmd, score }
    })
    .filter((x) => x.score > 0)

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.cmd.label.length - b.cmd.label.length
  })

  return scored.map((x) => x.cmd)
}

export function groupByKind(commands: Command[]): Record<CommandKind, Command[]> {
  const out: Record<CommandKind, Command[]> = { atom: [], lab: [], portal: [] }
  for (const c of commands) out[c.kind].push(c)
  return out
}

export const KIND_LABELS: Record<CommandKind, string> = {
  atom: 'Navigate',
  lab: 'Lab',
  portal: 'Journey',
}