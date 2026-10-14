// IR builders — each workspace surface exports its data as a Document IR.
// The forge registry (booklet/layout/templates/index.json) owns the
// surface → type mapping; these builders mirror it. Pickle names only —
// no human names, no internal identifiers in output.

import type { DocumentIR, IRBlock, SourceSurface } from '@/types/ir'

const today = () => new Date().toISOString().slice(0, 10)

export const SURFACE_TYPES: Record<SourceSurface, DocumentIR['type']> = {
  docs: 'brief',
  sheets: 'table-report',
  slides: 'deck',
  mail: 'letter',
  calendar: 'agenda',
  forum: 'report',
  life: 'report',
  passports: 'credential',
  drive: 'packet',
}

function baseIR(type: DocumentIR['type'], title: string, source: SourceSurface): DocumentIR {
  return { type, meta: { title, date: today(), source }, blocks: [] }
}

/** Strip surface HTML down to semantic prose paragraphs. */
function htmlToParagraphs(html: string): string[] {
  return String(html ?? '')
    .replace(/<(h[1-6]|p|li|div)[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** Docs surface: HTML body → brief (or grant when the doc says so). */
export function fromDocsHtml(doc: { title: string; body?: string; kind?: 'grant' | 'brief' }): DocumentIR {
  const ir = baseIR(doc.kind === 'grant' ? 'grant' : 'brief', doc.title, 'docs')
  const paras = htmlToParagraphs(doc.body ?? '')
  ir.blocks = paras.map((text, i) => ({
    kind: 'section' as const,
    id: `section-${i + 1}`,
    title: text.split(' ').slice(0, 6).join(' ') || `Section ${i + 1}`,
    children: [{ kind: 'prose' as const, data: { text } }],
  }))
  return ir
}

/** Sheets surface: rows/columns → table-report. */
export function fromSheets(sheet: { title: string; columns: string[]; rows: unknown[][] }): DocumentIR {
  const ir = baseIR('table-report', sheet.title, 'sheets')
  ir.blocks = [{ kind: 'table', data: { columns: sheet.columns, rows: sheet.rows } }]
  return ir
}

/** Slides surface: slides → deck. */
export function fromSlides(deck: { title: string; slides: { title: string; body: string }[] }): DocumentIR {
  const ir = baseIR('deck', deck.title, 'slides')
  ir.blocks = deck.slides.map((s, i) => ({
    kind: 'section', id: `slide-${i + 1}`, title: s.title,
    children: [{ kind: 'prose', data: { text: s.body } }],
  }))
  return ir
}

/** Mail surface: draft → letter. */
export function fromMail(mail: { subject: string; greeting?: string; body: string; signoff?: string; author?: string }): DocumentIR {
  const ir = baseIR('letter', mail.subject, 'mail')
  ir.blocks = [
    {
      kind: 'email',
      data: {
        subject: mail.subject,
        greeting: mail.greeting,
        paragraphs: htmlToParagraphs(mail.body),
        signoff: mail.signoff,
      },
    },
  ]
  if (mail.author) ir.blocks.push({ kind: 'signature', data: { name: mail.author, line: 'P31 Labs' } })
  return ir
}

/** Calendar surface: entries → agenda. */
export function fromCalendar(cal: { title: string; entries: { time: string; text: string }[] }): DocumentIR {
  const ir = baseIR('agenda', cal.title, 'calendar')
  ir.blocks = [{ kind: 'timeline', data: { entries: cal.entries } }]
  return ir
}

/** Forum/Life surface: thread or log → report. */
export function fromForum(post: { title: string; thesis?: string; sections: { title: string; body: string }[] }): DocumentIR {
  const ir = baseIR('report', post.title, 'forum')
  if (post.thesis) ir.meta.thesis = post.thesis
  ir.blocks = post.sections.map((s, i) => ({
    kind: 'section', id: `section-${i + 1}`, title: s.title,
    children: [{ kind: 'prose', data: { text: s.body } }],
  }))
  return ir
}

/** Drive surface: several documents → packet. */
export function fromDrive(bundle: { title: string; children: DocumentIR[] }): DocumentIR {
  const ir = baseIR('packet', bundle.title, 'drive')
  ir.blocks = [{
    kind: 'section', id: 'contents', title: 'Contents',
    children: [{ kind: 'list', data: { items: bundle.children.map((c, i) => `${i + 1}. ${c.meta.title}`) } }],
  }, { kind: 'pagebreak', data: {} }]
  ir.children = bundle.children
  return ir
}

/** Surface → IR: the single entry point the export dialog calls. */
export function buildIR(surface: SourceSurface, payload: Record<string, unknown>): DocumentIR {
  switch (surface) {
    case 'docs': return fromDocsHtml(payload as { title: string; body?: string; kind?: 'grant' | 'brief' })
    case 'sheets': return fromSheets(payload as never)
    case 'slides': return fromSlides(payload as never)
    case 'mail': return fromMail(payload as never)
    case 'calendar': return fromCalendar(payload as never)
    case 'forum':
    case 'life': return fromForum(payload as never)
    case 'drive': return fromDrive(payload as never)
    case 'passports': return baseIR('credential', (payload as { title?: string }).title ?? 'Credential', 'passports')
  }
}

export type { IRBlock }