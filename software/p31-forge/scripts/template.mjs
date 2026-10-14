// P31 Forge — template loader + HTML builder.
// Resolves IR.type via booklet/layout/templates/index.json, merges the session
// override, selects the theme, builds the single <style> block (cascade
// layers: tokens/base/layout + UNLAYERED pages.css) and the document HTML.
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderBlock } from './components/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const BOOKLET = resolve(ROOT, 'booklet')
const TEMPLATES = resolve(BOOKLET, 'layout', 'templates')

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')

export function resolveTemplate(ir, override = {}) {
  const index = JSON.parse(read(resolve(TEMPLATES, 'index.json')))
  const entry = index.types[ir.type]
  if (!entry) throw new Error(`no registry entry for type "${ir.type}"`)
  const tpl = JSON.parse(read(resolve(TEMPLATES, entry.template)))
  if (override && override.extends && override.extends !== tpl.name) {
    console.warn(`template: override extends "${override.extends}" != template "${tpl.name}" — ignoring override`)
    return { template: tpl, variant: entry.variant ?? null, override: {} }
  }
  return { template: tpl, variant: entry.variant ?? null, override: override ?? {} }
}

function replacePagePlaceholders(pagesCss, tpl) {
  const size = `${tpl.page.widthIn}in ${tpl.page.heightIn}in`
  const bg = tpl.page.background
  return pagesCss
    .replace(/__PAGE_SIZE__/g, size)
    .replace(/__MARGIN__/g, tpl.page.margin)
    .replace(/__PAGE_BG__/g, bg)
    .replace(/__FOOTER__/g, `'${tpl.footer ?? 'P31 LABS'}'`)
    .replace(/__FOOTER_COLOR__/g, tpl.footerColor ?? '#64748b')
    .replace(/__ACCENT__/g, tpl.accent ?? '#5eead4')
}

// Theme-driven page chrome: @page margin boxes cannot see CSS custom
// properties (separate tree), so parse the active theme block and inject
// literal values. Falls back to template values when the theme lacks them.
function themeColors(theme) {
  const css = read(resolve(BOOKLET, 'report-themes.css'))
  const m = css.match(new RegExp(`\\[data-theme="${theme}"\\][\\s\\S]*?\\n\\}`))
  if (!m) return {}
  const get = (name) => {
    const r = new RegExp(`${name}:\\s*([^;]+);`)
    const v = r.exec(m[0])
    return v ? v[1].trim() : null
  }
  return { pageBg: get('--page-bg'), accent: get('--accent'), muted: get('--text-muted') }
}

export function buildStyle(tpl, theme) {
  const themesCss = read(resolve(BOOKLET, 'report-themes.css'))
  const baseCss = read(resolve(BOOKLET, 'report.css'))
  const layoutCss = read(resolve(BOOKLET, 'layout', 'layout.css'))
  const tc = themeColors(theme)
  const chrome = {
    ...tpl,
    page: { ...tpl.page, background: tc.pageBg ?? tpl.page.background },
    footerColor: tc.muted ?? tpl.footerColor ?? '#64748b',
    accent: tc.accent ?? tpl.accent ?? '#5eead4',
  }
  const pagesCss = replacePagePlaceholders(read(resolve(BOOKLET, 'layout', 'pages.css')), chrome)
  return `<style>
@layer reset, tokens, base, components, layout, print;
@layer tokens {
${themesCss}
}
@layer base {
${baseCss}
}
@layer layout {
${layoutCss}
}
${pagesCss}
</style>`
}

function execUnitHtml(ir, tpl) {
  if (!ir.exec || tpl.type !== 'report') return ''
  const takeaway = ir.exec.takeaway ?? ''
  const findings = ir.exec.keyFindings ?? []
  const question = ir.meta?.question
  return `<section class="chapter" data-unit data-role="summary" data-unit-id="executive-summary">
  <div class="chapter-kicker">EXECUTIVE SUMMARY</div>
  <h2>Executive Summary</h2>
  <div class="summary-grid">
    ${question ? `<div class="summary-card"><div class="label">Question</div><div class="value">${esc(question)}</div></div>` : ''}
    <div class="summary-card summary-card--wide"><div class="label">Takeaway</div><div class="value">${esc(takeaway)}</div></div>
  </div>
  ${findings.length ? `<h3>Key findings</h3><ul>${findings.map((k) => `<li><strong>${esc(k.split(':')[0])}:</strong> ${esc(k.split(':').slice(1).join(':'))}</li>`).join('')}</ul>` : ''}
</section>`
}

// The KPI figure is its OWN packable unit so it never fragments mid-strip:
// it lands on a page alone (labeled — acceptable) or packs with a neighbor.
function kpiFigureHtml(ir) {
  const kpi = ir.exec?.kpiItems ?? []
  const meta = ir.exec?.kpiMeta ?? null
  if (!kpi.length) return ''
  return `<figure class="figure chapter" data-unit data-role="summary" data-unit-id="bridge-metrics-figure" id="fig-1">
  <figcaption class="figure-title"><span class="figure-number">Figure 1.</span> ${esc(meta?.label ?? 'Metrics at a Glance')}</figcaption>
  <div class="metric-strip">${kpi.map((i) => `<div class="metric-tile"><div class="metric-label">${esc(i.label)}</div><div class="metric-value">${esc(i.value)}</div>${i.detail ? `<div class="metric-detail">${esc(i.detail)}</div>` : ''}</div>`).join('')}</div>
  ${meta?.caption ? `<figcaption class="figure-caption">${esc(meta.caption)}</figcaption>` : ''}
</figure>`
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function hoistKpi(ir) {
  // move-into exec: pull kpi-set items (and figure metadata) into ir.exec
  const kpiItems = []
  let kpiMeta = null
  ir.blocks = (ir.blocks ?? []).filter((b) => {
    if (b.moveTo === 'executive-summary') {
      for (const c of b.children ?? []) {
        if (c.kind === 'kpi-set') {
          kpiItems.push(...(c.data?.items ?? []))
          if (c.data) kpiMeta = { label: c.data.label, intro: c.data.intro, caption: c.data.caption, source: c.data.source }
        }
      }
      return false
    }
    return true
  })
  ir.exec = { ...(ir.exec ?? {}), kpiItems, ...(kpiMeta ? { kpiMeta } : {}) }
}

export function buildHtml(ir, tpl, theme) {
  hoistKpi(ir)
  const ctx = {
    counter: 0,
    titles: (ir.blocks ?? []).filter((b) => b.kind === 'section' && b.title).map((b) => b.title),
  }
  const cover = tpl.cover
    ? `<section class="cover">
    <div class="cover-kicker">${esc(ir.meta.kicker ?? 'P31 Labs')}</div>
    <h1>${esc(ir.meta.title)}</h1>
    <p class="cover-thesis">${esc(ir.meta.thesis ?? '')}</p>
    <div class="cover-meta">
      <div>Session ${esc(ir.meta.session ?? '')}</div>
      <div>${esc(ir.meta.date ?? '')}</div>
      <div>sovereign pipeline · ${(ir.blocks ?? []).length} sections synthesized</div>
    </div>
    <div class="cover-stat">${(ir.blocks ?? []).length}</div>
    <div class="cover-stat-label">sections synthesized</div>
  </section>` : ''

  const exec = execUnitHtml(ir, tpl)
  const kpiFig = kpiFigureHtml(ir)

  const body = (ir.blocks ?? []).map((b, i) => {
    const force = b.forceBreakBefore || b.role === 'appendix'
    let html = renderBlock(b, ctx)
    if (b.role === 'colophon') html = html.replace('<section class="chapter"', '<section class="methodology"')
    else if (force) html = html.replace('<section class="chapter"', '<section class="chapter force-break"')
    return html
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ir.meta.title)} — P31 Document</title>
${buildStyle(tpl, theme)}
</head>
<body>
${cover}
<main class="page">
${exec}
${kpiFig}
${body}
</main>
<script>${read(resolve(BOOKLET, 'theme-picker.js'))}</script>
</body>
</html>`
}

export function renderMarkdown(ir) {
  const lines = [`# ${ir.meta.title}`, '', `**Session ${ir.meta.session}** · ${ir.meta.date}`, '']
  if (ir.exec?.takeaway) lines.push(`## Executive Summary`, '', `**Takeaway:** ${ir.exec.takeaway}`, '')
  for (const b of ir.blocks ?? []) {
    lines.push(`## ${b.title ?? ''}`, '')
    const walk = (x) => {
      if (x.kind === 'prose') lines.push(x.data?.text ?? '', '')
      if (x.kind === 'table') lines.push((x.data?.columns ?? []).join(' | '), '---', ...(x.data?.rows ?? []).map((r) => (Array.isArray(r) ? r : Object.values(r)).join(' | ')), '')
      ;(x.children ?? []).forEach(walk)
    }
    walk(b)
  }
  return lines.join('\n')
}

export { esc }