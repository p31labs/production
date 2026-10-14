// docx-render.js — IR → DOCX via the pure-JS `docx` package (workerd-safe).
// One renderer per block kind; theme accent colors the headings.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ExternalHyperlink,
} from 'docx'
import { THEMES_CSS } from './assets.mjs'

function themeAccent(theme) {
  const m = THEMES_CSS.match(new RegExp(`\\[data-theme="${theme}"\\][\\s\\S]*?\\n\\}`))
  if (!m) return '1E40AF'
  const r = /--accent:\s*([^;]+);/.exec(m[0])
  return (r ? r[1].trim() : '1E40AF').replace(/^#/, '')
}

const runs = (text) => String(text ?? '').split('\n').map((t) => new TextRun({ text: t }))

export function irToDocx(ir, theme) {
  const accent = themeAccent(theme)
  const children = []
  let ctx = { counter: 0 }

  const walk = (block, depth) => {
    switch (block.kind) {
      case 'section':
        children.push(new Paragraph({ text: '', spacing: { before: 240 } }))
        children.push(new Paragraph({
          heading: depth === 0 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          children: [new TextRun({ text: block.title ?? '', bold: true, color: accent })],
        }))
        ;(block.children ?? []).forEach((c) => walk(c, depth + 1))
        break
      case 'heading':
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: block.title, bold: true, color: accent })] }))
        break
      case 'prose':
        for (const p of String(block.data?.text ?? '').split(/\n{2,}/)) {
          if (p.trim()) children.push(new Paragraph({ children: runs(p.trim()) }))
        }
        break
      case 'list':
        for (const item of block.data?.items ?? []) {
          children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: item })] }))
        }
        break
      case 'steps':
        ;(block.data?.items ?? []).forEach((item, i) => {
          children.push(new Paragraph({ numbering: { reference: 'steps', level: 0 }, children: [new TextRun({ text: `${item.title} — ${item.body ?? ''}`, bold: false })] }))
        })
        break
      case 'cards': {
        const variant = block.data?.variant ?? 'rec'
        for (const item of block.data?.items ?? []) {
          children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: item.title, bold: true, color: accent })] }))
          if (item.body) children.push(new Paragraph({ children: [new TextRun({ text: item.body })] }))
        }
        break
      }
      case 'kpi-set': {
        const rows = (block.data?.items ?? []).map((i) => new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: i.label, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: i.value, bold: true, color: accent })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: i.detail ?? '' })] })] }),
        ] }))
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }))
        break
      }
      case 'table': {
        const cols = block.data?.columns ?? []
        const dataRows = block.data?.rows ?? []
        const head = new TableRow({ children: cols.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, color: accent })] })] })) })
        const body = dataRows.map((r) => new TableRow({ children: (Array.isArray(r) ? r : cols.map((c) => r?.[c] ?? '')).map((cell) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? '') })] })] })) }))
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...body] }))
        break
      }
      case 'callout': {
        children.push(new Paragraph({
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 8 } },
          children: [new TextRun({ text: `${block.data?.label ?? 'Note'}: `, bold: true, color: accent }), ...runs(`${block.data?.value ? block.data.value + ' — ' : ''}${block.data?.body ?? ''}`)],
        }))
        break
      }
      case 'email': {
        const e = block.data ?? {}
        if (e.subject) children.push(new Paragraph({ children: [new TextRun({ text: e.subject, bold: true })] }))
        if (e.greeting) children.push(new Paragraph({ children: runs(e.greeting) }))
        for (const p of e.paragraphs ?? []) children.push(new Paragraph({ children: runs(p) }))
        if (e.signoff) children.push(new Paragraph({ children: runs(e.signoff) }))
        break
      }
      case 'quote':
        children.push(new Paragraph({ indent: { left: 480 }, children: [new TextRun({ text: block.data?.text ?? '', italics: true })] }))
        break
      case 'timeline': {
        const rows = (block.data?.entries ?? []).map((e) => new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: e.time ?? '', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: e.text ?? '' })] })] }),
        ] }))
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }))
        break
      }
      case 'checklist': {
        const glyph = { checked: '☑', unchecked: '☐', blocked: '⊘' }
        for (const item of block.data?.items ?? []) {
          children.push(new Paragraph({ children: [new TextRun({ text: `${glyph[item.state ?? 'unchecked'] ?? '☐'}  ${item.text ?? ''}` })] }))
        }
        break
      }
      case 'toc': {
        if (block.data?.title) children.push(new Paragraph({ children: [new TextRun({ text: block.data.title, bold: true, color: accent })] }))
        for (const t of ctx.titles ?? []) children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: t })] }))
        break
      }
      case 'signature':
        children.push(new Paragraph({ children: [new TextRun({ text: block.data?.name ?? '', bold: true })] }))
        if (block.data?.line) children.push(new Paragraph({ children: [new TextRun({ text: block.data.line, color: '666666' })] }))
        break
      case 'methodology':
        children.push(new Paragraph({ children: [new TextRun({ text: block.data?.text ?? '', size: 18 })] }))
        break
      case 'figure':
        if (block.data?.caption) children.push(new Paragraph({ children: [new TextRun({ text: block.data.caption, italics: true })] }))
        break
      case 'pagebreak':
        children.push(new Paragraph({ pageBreakBefore: true, children: [] }))
        break
      default:
        children.push(new Paragraph({ children: [new TextRun({ text: `[${block.kind}]` })] }))
    }
  }

  ctx.titles = (ir.blocks ?? []).filter((b) => b.kind === 'section' && b.title).map((b) => b.title)
  if (ir.meta?.title) {
    children.unshift(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: ir.meta.title, bold: true, color: accent })] }))
    children.unshift(new Paragraph({ text: ir.meta.kicker ?? '', color: '888888' }))
  }
  for (const b of ir.blocks ?? []) walk(b, 0)
  for (const c of ir.children ?? []) {
    children.push(new Paragraph({ pageBreakBefore: true, children: [] }))
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: c.meta?.title ?? '', bold: true, color: accent })] }))
    for (const b of c.blocks ?? []) walk(b, 0)
  }

  const doc = new Document({
    numbering: { config: [{ reference: 'steps', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }] }] },
    sections: [{ children }],
  })
  return Packer.toBuffer(doc)
}