#!/usr/bin/env node
// P31 Forge — render-doc.mjs. One path for every document type:
//   IR -> template (by IR.type) -> HTML -> packer -> PDF -> gates.
// Usage:
//   node scripts/render-doc.mjs --ir session:btc-callkit [--theme ats] [--out file.pdf]
//   node scripts/render-doc.mjs --ir path/to/doc.json [--type T] [--theme X]
//   node scripts/render-doc.mjs --ir md:/path/to/notes.md --type brief
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { convergenceToIR, loadClaims } from './ir/from-convergence.mjs'
import { validate } from './ir/validate.mjs'
import { resolveTemplate, buildHtml, renderMarkdown } from './template.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const S = (f) => resolve(HERE, f)
const REPORT_DIR = '/tmp/report'
const SESSION_DIR = '/tmp/phos-jitterbug'

function parseArgs(a = process.argv.slice(2)) {
  const get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d }
  return {
    ir: get('--ir'),
    type: get('--type'),
    theme: get('--theme'),
    out: get('--out'),
    quiet: a.includes('--quiet'),
  }
}

function marginMm(tpl) {
  const m = String(tpl.page?.margin ?? '12mm').split(/\s+/).map((v) => parseFloat(v))
  const [t = 12, r = t, b = t, l = r] = m.length === 1 ? [m[0], m[0], m[0], m[0]] : m.length === 2 ? [m[0], m[1], m[0], m[1]] : m
  return { t, r, b, l }
}

export function usableArea(tpl) {
  const m = marginMm(tpl)
  const px = (mm) => (mm * 96) / 25.4
  // Inner gutter on .page (5mm vertical, 6mm horizontal in the print block)
  // sits inside the @page margin; subtract it so the packer's viewport matches
  // the real content box.
  return {
    usableW: Math.round(tpl.page.widthIn * 96 - px(m.l) - px(m.r) - px(6) * 2),
    usableH: Math.round(tpl.page.heightIn * 96 - px(m.t) - px(m.b) - px(5) * 2),
  }
}

function wordCounts(ir) {
  return (ir.blocks ?? []).map((b) => {
    let words = 0
    const walk = (x) => {
      if (x.kind === 'prose') words += String(x.data?.text ?? '').split(/\s+/).filter(Boolean).length
      if (x.kind === 'table') for (const r of x.data?.rows ?? []) for (const c of (Array.isArray(r) ? r : Object.values(r))) words += String(c ?? '').split(/\s+/).filter(Boolean).length
      ;(x.children ?? []).forEach(walk)
    }
    walk(b)
    return { id: b.id ?? b.title ?? '?', words, budget: b.wordBudget ?? null }
  })
}

export function buildIR(spec) {
  if (spec.startsWith('session:')) {
    const name = spec.slice(8)
    const conv = resolve(SESSION_DIR, name, 'level-1', 'convergence-2.md')
    if (!existsSync(conv)) throw new Error(`no convergence at ${conv}`)
    const overridePath = resolve(ROOT, 'booklet', 'layout', 'sessions', `${name}.layout.json`)
    const override = existsSync(overridePath) ? JSON.parse(readFileSync(overridePath, 'utf8')) : {}
    const claims = loadClaims(resolve(REPORT_DIR, 'claims.verified.json'))
    return { ir: convergenceToIR({ md: readFileSync(conv, 'utf8'), claims, session: name, override }), name, override }
  }
  if (spec.startsWith('md:')) {
    const name = basename(spec.slice(3)).replace(/\.md$/, '')
    return { ir: convergenceToIR({ md: readFileSync(spec.slice(3), 'utf8'), session: name, override: {} }), name, override: {} }
  }
  const name = basename(spec).replace(/\.json$/, '')
  return { ir: JSON.parse(readFileSync(spec, 'utf8')), name, override: {} }
}

export async function renderDoc(opts) {
  const a = opts.args ?? {}
  const { ir, name, override } = buildIR(a.ir)
  if (a.type) ir.type = a.type
  const v = validate(ir)
  if (!v.ok) throw new Error(`IR invalid:\n  ${v.errors.join('\n  ')}`)

  const { template: tpl0 } = resolveTemplate(ir, override)
  // Fixture mode: tiny IRs exercise the pipeline (IR -> template -> pack ->
  // PDF), while the session regression carries the real gate calibration.
  const tpl = opts.fixture
    ? { ...tpl0, gates: { ...(tpl0.gates ?? {}), minFill: 0, pageCountRange: [1, 60], maxPages: null, noSplitAtoms: false, appendixOwnPage: false } }
    : tpl0

  // Theme resolution with fallback: disallowed combos render in the template's
  // default theme with a warning — never a hard error for the workspace user.
  const allowed = tpl.themes ?? [tpl.defaultTheme ?? 'ats']
  let theme = a.theme ?? ir.theme ?? tpl.defaultTheme ?? 'ats'
  if (allowed.length && !allowed.includes(theme)) {
    console.warn(`theme "${theme}" not allowed for ${tpl.type} — using "${tpl.defaultTheme}"`)
    theme = tpl.defaultTheme
  }
  const html = buildHtml(ir, tpl, theme)

  mkdirSync(REPORT_DIR, { recursive: true })
  const base = a.ir.startsWith('session:') ? a.ir.slice(8) : name
  const htmlPath = resolve(REPORT_DIR, `${base}.report.html`)
  writeFileSync(htmlPath, html, 'utf8')
  writeFileSync(resolve(REPORT_DIR, `${base}.report.md`), renderMarkdown(ir) + '\n', 'utf8')

  // Pack (flow modes skip wrapping)
  let packJson = null
  const mode = tpl.packing?.mode ?? 'greedy'
  const { usableW, usableH } = usableArea(tpl)
  if (mode !== 'flow') {
    const packOut = resolve(REPORT_DIR, `${base}.pack.json`)
    const packedHtml = resolve(REPORT_DIR, `${base}.packed.html`)
    const args = ['pack-pages.mjs', '--html', htmlPath, '--tpl', resolve(ROOT, 'booklet', 'layout', 'templates', `${tpl.name}.json`), '--mode', mode, '--out-html', packedHtml, '--out-json', packOut, '--usable-w', String(usableW), '--usable-h', String(usableH)]
    if (tpl.packing?.maxPages || tpl.gates?.maxPages) args.push('--max-pages', String(tpl.packing?.maxPages ?? tpl.gates?.maxPages))
    execFileSync(process.execPath, [S('pack-pages.mjs'), ...args.slice(1)], { stdio: 'inherit' })
    packJson = JSON.parse(readFileSync(packOut, 'utf8'))
    packJson.gates = tpl.gates ?? {}
    packJson.theme = theme
    packJson.sections = wordCounts(ir)
    writeFileSync(packOut, JSON.stringify(packJson, null, 2) + '\n', 'utf8')
  } else {
    const flowPack = { mode: 'flow', template: tpl.name, gates: tpl.gates ?? {}, theme, sections: wordCounts(ir) }
    writeFileSync(resolve(REPORT_DIR, `${base}.pack.json`), JSON.stringify(flowPack, null, 2) + '\n', 'utf8')
    packJson = flowPack
  }

  // PDF (packed html when packed, else the report html)
  const srcHtml = mode !== 'flow' ? resolve(REPORT_DIR, `${base}.packed.html`) : htmlPath
  const pdfPath = a.out ?? resolve(REPORT_DIR, `${base}.report.pdf`)
  execFileSync(process.execPath, [S('render-pdf.mjs'), '--html', srcHtml, '--out', pdfPath], { stdio: 'inherit' })

  // Gates
  const fkExempt = !(tpl.gates?.readability)
  const vocabExempt = tpl.type !== 'report'
  execFileSync(process.execPath, [S('check-report.mjs'), '--session', base, ...(fkExempt ? ['--fk-exempt'] : []), ...(vocabExempt ? ['--vocab-exempt'] : [])], { stdio: 'inherit' })
  const pyArgs = [S('check-layout.py'), pdfPath, '--cover-pages', tpl.cover ? '1' : '0']
  if (packJson) pyArgs.push('--pack', resolve(REPORT_DIR, `${base}.pack.json`))
  try {
    execFileSync('/tmp/report/venv/bin/python', pyArgs, { stdio: 'inherit' })
  } catch (e) {
    console.error('check-layout failed (see above)')
    if (!opts.lenient) process.exit(1)
  }

  return { ir, tpl, theme, htmlPath, pdfPath, packJson, name: base }
}

const isMain = fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')
if (isMain) {
  const a = parseArgs()
  if (!a.ir) { console.error('usage: render-doc.mjs --ir session:NAME | file.json | md:file.md [--type T] [--theme X] [--out file.pdf]'); process.exit(2) }
  renderDoc({ args: a }).then((r) => {
    console.log(`\n✅ rendered "${r.ir.meta.title}" (${r.tpl.name}, ${r.theme}) -> ${r.pdfPath}`)
    if (r.packJson?.pages) {
      console.log('per-page fill:')
      for (const p of r.packJson.pages) console.log(`  p${String(p.n).padStart(2)} ${String(p.fillPct ?? '?').padStart(3)}% [${p.units.join(', ')}]`)
    }
  }).catch((e) => { console.error(e.message); process.exit(1) })
}