// template.js — HTML builder for the render worker. Port of the forge's
// scripts/template.mjs; reads CSS/templates from the generated assets module
// (no node:fs — workerd-safe). The forge remains the SSOT.
import { renderBlock } from './components.js'
import * as assets from './assets.mjs'
import {
  REPORT_CSS, THEMES_CSS, LAYOUT_CSS, PAGES_CSS, THEME_PICKER_JS,
  INDEX_JSON, TEMPLATE_FILES,
} from './assets.mjs'

const ALL_TEMPLATES = Object.fromEntries(
  TEMPLATE_FILES.map((f) => {
    const key = `TEMPLATE_${f.replace(/\.json$/, '').toUpperCase().replace(/-/g, '_')}`
    return [key, JSON.parse(assets[key])]
  }),
)

const TEMPLATES = {}

export function resolveTemplate(ir) {
  const index = JSON.parse(INDEX_JSON)
  const entry = index.types[ir.type]
  if (!entry) throw new Error(`no registry entry for type "${ir.type}"`)
  const key = `TEMPLATE_${entry.template.replace(/\.json$/, '').toUpperCase().replace(/-/g, '_')}`
  return { template: ALL_TEMPLATES[key], variant: entry.variant ?? null }
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function themeColors(theme) {
  const m = THEMES_CSS.match(new RegExp(`\\[data-theme="${theme}"\\][\\s\\S]*?\\n\\}`))
  if (!m) return {}
  const get = (name) => {
    const r = new RegExp(`${name}:\\s*([^;]+);`)
    const v = r.exec(m[0])
    return v ? v[1].trim() : null
  }
  return { pageBg: get('--page-bg'), accent: get('--accent'), muted: get('--text-muted') }
}

function replacePagePlaceholders(pagesCss, tpl) {
  const size = `${tpl.page.widthIn}in ${tpl.page.heightIn}in`
  return pagesCss
    .replace(/__PAGE_SIZE__/g, size)
    .replace(/__MARGIN__/g, tpl.page.margin)
    .replace(/__PAGE_BG__/g, tpl.page.background)
    .replace(/__FOOTER__/g, `'${tpl.footer ?? 'P31 LABS'}'`)
    .replace(/__FOOTER_COLOR__/g, tpl.footerColor ?? '#64748b')
    .replace(/__ACCENT__/g, tpl.accent ?? '#5eead4')
}

export function buildStyle(tpl, theme) {
  const tc = themeColors(theme)
  const chrome = {
    ...tpl,
    page: { ...tpl.page, background: tc.pageBg ?? tpl.page.background },
    footerColor: tc.muted ?? tpl.footerColor ?? '#64748b',
    accent: tc.accent ?? tpl.accent ?? '#5eead4',
  }
  const pagesCss = replacePagePlaceholders(PAGES_CSS, chrome)
  return `<style>
@layer reset, tokens, base, components, layout, print;
@layer tokens {
${THEMES_CSS}
}
@layer base {
${REPORT_CSS}
}
@layer layout {
${LAYOUT_CSS}
}
${pagesCss}
</style>`
}

function hoistKpi(ir) {
  const kpiItems = []
  let kpiMeta = null
  ir.blocks = (ir.blocks ?? []).filter((b) => {
    if (b.moveTo === 'executive-summary') {
      for (const c of b.children ?? []) {
        if (c.kind === 'kpi-set') {
          kpiItems.push(...(c.data?.items ?? []))
          if (c.data) kpiMeta = { label: c.data.label, caption: c.data.caption }
        }
      }
      return false
    }
    return true
  })
  ir.exec = { ...(ir.exec ?? {}), kpiItems, ...(kpiMeta ? { kpiMeta } : {}) }
}

function execUnitHtml(ir, tpl) {
  if (!ir.exec || tpl.type !== 'report') return ''
  const takeaway = ir.exec.takeaway ?? ''
  const findings = ir.exec.keyFindings ?? []
  return `<section class="chapter" data-role="summary">
  <div class="chapter-kicker">EXECUTIVE SUMMARY</div>
  <h2>Executive Summary</h2>
  <div class="summary-grid">
    <div class="summary-card summary-card--wide"><div class="label">Takeaway</div><div class="value">${esc(takeaway)}</div></div>
  </div>
  ${findings.length ? `<h3>Key findings</h3><ul>${findings.map((k) => `<li><strong>${esc(String(k).split(':')[0])}:</strong> ${esc(String(k).split(':').slice(1).join(':'))}</li>`).join('')}</ul>` : ''}
</section>`
}

function kpiFigureHtml(ir) {
  const kpi = ir.exec?.kpiItems ?? []
  const meta = ir.exec?.kpiMeta ?? null
  if (!kpi.length) return ''
  return `<figure class="figure chapter" id="fig-1">
  <figcaption class="figure-title"><span class="figure-number">Figure 1.</span> ${esc(meta?.label ?? 'Metrics at a Glance')}</figcaption>
  <div class="metric-strip">${kpi.map((i) => `<div class="metric-tile"><div class="metric-label">${esc(i.label)}</div><div class="metric-value">${esc(i.value)}</div>${i.detail ? `<div class="metric-detail">${esc(i.detail)}</div>` : ''}</div>`).join('')}</div>
  ${meta?.caption ? `<figcaption class="figure-caption">${esc(meta.caption)}</figcaption>` : ''}
</figure>`
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
      <div>${esc(ir.meta.date ?? '')}</div>
      <div>sovereign pipeline · ${(ir.blocks ?? []).length} sections</div>
    </div>
    <div class="cover-stat">${(ir.blocks ?? []).length}</div>
    <div class="cover-stat-label">sections</div>
  </section>` : ''

  const exec = execUnitHtml(ir, tpl)
  const kpiFig = kpiFigureHtml(ir)

  const body = (ir.blocks ?? []).map((b) => {
    let html = renderBlock(b, ctx)
    if (b.role === 'colophon') html = html.replace('<section class="chapter"', '<section class="methodology"')
    return html
  }).join('\n')

  const children = (ir.children ?? []).map((c) => {
    const sub = buildHtml(c, tpl, theme)
    return sub.match(/<body>[\s\S]*<\/body>/)?.[0]?.replace(/<\/?body>/g, '') ?? ''
  }).join('\n<div class="pagebreak" style="break-before: page"></div>\n')

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
${children}
</main>
<script>${THEME_PICKER_JS}</script>
</body>
</html>`
}