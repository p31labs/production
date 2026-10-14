#!/usr/bin/env node
// P31 Forge — pack-pages.mjs. Measures units in a real Chromium (playwright-core,
// already resolvable from /home/p31/node_modules; executablePath /usr/bin/chromium)
// and packs them into <div class="page"> wrappers. Modes:
//   greedy        — pack in document order, honor keepWith glue, 2-col oversize fallback
//   page-per-unit — one unit per page (decks)
//   fit-to-pages  — one page, shrink via data-fit tiers until it fits maxPages
//   flow          — no wrapping; fragmentation engine + CSS handles it
// Emits JSON: per page {n, units, fillPct, overflow}, fitTier, mode.
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function args() {
  const a = process.argv.slice(2)
  const get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d }
  return {
    html: get('--html'),
    tpl: get('--tpl'),
    mode: get('--mode', 'greedy'),
    outHtml: get('--out-html'),
    outJson: get('--out-json'),
    maxPages: parseInt(get('--max-pages', '0'), 10),
    usableW: parseInt(get('--usable-w', '965'), 10),
    usableH: parseInt(get('--usable-h', '717'), 10),
  }
}

function measureUnits() {
  const units = [...document.querySelectorAll('main.page > [data-unit]')]
  return units.map((u) => {
    const r = u.getBoundingClientRect()
    const s = getComputedStyle(u)
    return {
      id: u.dataset.unitId || u.textContent.slice(0, 24),
      role: u.dataset.role || 'body',
      keepWith: u.dataset.keepWith || null,
      h: r.height + (parseFloat(s.marginTop) || 0),
    }
  })
}

function wrapPages(pages) {
  const main = document.querySelector('main.page')
  if (!main) return 0
  const units = [...main.querySelectorAll(':scope > [data-unit]')]
  const byId = new Map(units.map((u) => [u.dataset.unitId, u]))
  let made = 0
  for (const pg of pages) {
    const div = document.createElement('div')
    div.className = 'page'
    if (pg.fit) div.dataset.fit = String(pg.fit)
    if (pg.cols2) div.classList.add('cols-2-page')
    for (const uid of pg.units) {
      const u = byId.get(uid)
      if (u) { div.appendChild(u); made++ }
      // cols-2 fallback: wrap oversize unit's body in column layout
      if (pg.cols2 && u) {
        const body = u.querySelector('.body')
        if (body) body.classList.add('cols-2')
      }
    }
    main.appendChild(div)
  }
  return made
}

function pageFills() {
  const pages = [...document.querySelectorAll('main.page > .page')]
  const H = window.innerHeight
  return pages.map((p) => {
    const pr = p.getBoundingClientRect()
    const last = p.lastElementChild
    const lr = last ? last.getBoundingClientRect() : null
    const bottom = lr ? lr.bottom - pr.top : 0
    return { fillPct: H ? Math.round((bottom / H) * 100) : 0 }
  })
}

function setFitTier(tier) {
  const p = document.querySelector('main.page > .page')
  if (p) p.dataset.fit = String(tier)
  return p ? p.scrollHeight : 0
}

function greedy(units, usableH) {
  // Pack to 82% of usable height: headroom against print-vs-measure drift
  // (typography at 12pt drifts more than at 10pt), per the typography pass.
  const packH = usableH * 0.82
  const byId = new Map(units.map((u) => [slug(u.id), u]))
  const groups = []
  const inGroup = new Set()
  for (const u of units) {
    if (inGroup.has(u)) continue
    const target = u.keepWith ? byId.get(slug(u.keepWith)) : null
    if (target && target !== u) {
      // merge into an existing group that already holds the target, else make a pair
      const existing = groups.find((g) => g.units.includes(target))
      if (existing) { existing.units.push(u); existing.h += u.h; inGroup.add(u) }
      else { groups.push({ id: `${u.id}+${target.id}`, h: u.h + target.h, units: [u, target], role: u.role, keep: true }); inGroup.add(u); inGroup.add(target) }
    } else { groups.push({ id: u.id, h: u.h, units: [u], role: u.role }); inGroup.add(u) }
  }
  const pages = []
  let cur = []
  let curH = 0
  const warnings = []
  const flush = () => { if (cur.length) pages.push(cur); cur = []; curH = 0 }
  for (const g of groups) {
    const forced = g.units.some((u) => u.role === 'appendix')
    if (forced && cur.length) flush()
    // Glued pair taller than a page: break the glue, place separately.
    if (g.h > usableH && g.units.length > 1) {
      for (const u of g.units) {
        const single = { id: u.id, units: [u.id], h: u.h, cols2: false, overflow: u.h > usableH }
        if (cur.length && curH + single.h > usableH) flush()
        cur.push(single); curH += Math.min(single.h, usableH)
      }
      warnings.push(`keepWith broken: ${g.id} taller than a page (${g.h}px)`)
      continue
    }
    const oversize = g.h > usableH
    if (cur.length && curH + (oversize ? packH : g.h) > packH) flush()
    cur.push({ id: g.id, units: g.units.map((u) => u.id), h: g.h, cols2: false, overflow: oversize, fit: oversize ? 2 : null })
    curH += oversize ? packH : g.h
  }
  flush()
  return {
    pages: pages.map((units, i) => ({ n: i + 1, units: units.flatMap((g) => g.units), fit: units.some((g) => g.fit) ? 2 : null, cols2: units.some((g) => g.cols2), overflow: units.some((g) => g.overflow) })),
    warnings,
  }
}

async function main() {
  const o = args()
  if (!o.html || !o.tpl) { console.error('usage: pack-pages.mjs --html <f> --tpl <f> --mode <mode> --out-html <f> --out-json <f>'); process.exit(2) }
  const html0 = readFileSync(o.html, 'utf8')
  const tpl = JSON.parse(readFileSync(o.tpl, 'utf8'))
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-gpu'] })
  const page = await browser.newPage({ viewport: { width: o.usableW, height: o.usableH }, deviceScaleFactor: 1 })
  // Measure in PRINT emulation so packer heights match the PDF's actual
  // @media print layout (fonts, margins, density rules).
  await page.emulateMedia({ media: 'print' })
  await page.setContent(html0, { waitUntil: 'load' })

  let report = { mode: o.mode, template: tpl.name, usableW: o.usableW, usableH: o.usableH }
  if (o.mode === 'flow') {
    report.pages = [{ n: 1, units: 'flow (no wrapping)', fillPct: null, overflow: [] }]
    report.note = 'flow mode: breaks handled by CSS fragmentation'
  } else {
    const units = await page.evaluate(measureUnits)
    let pages
    if (o.mode === 'page-per-unit') {
      pages = units.map((u, i) => ({ n: i + 1, units: [u.id], fit: null, cols2: u.h > o.usableH }))
    } else if (o.mode === 'fit-to-pages') {
      pages = [{ n: 1, units: units.map((u) => u.id), fit: 1, cols2: false }]
    } else {
      const g = greedy(units, o.usableH)
      pages = g.pages
      if (g.warnings.length) report.warnings = g.warnings
    }
    await page.evaluate(wrapPages, pages)

    if (o.mode === 'fit-to-pages') {
      const maxPages = o.maxPages || tpl.packing?.maxPages || tpl.gates?.maxPages || 1
      let fit = 0
      for (const tier of [1, 2, 3]) {
        const h = await page.evaluate(setFitTier, tier)
        if (h <= maxPages * o.usableH) { fit = tier; break }
      }
      report.fitTier = fit || null
      if (!fit) report.overflow = ['fit-to-pages: content exceeds maxPages at tier 3']
    }

    const fills = await page.evaluate(pageFills)
    const nMade = fills.length
    report.pages = pages.map((p, i) => {
      const fill = fills[i]?.fillPct ?? null
      // Compaction check: a fit-tier page that now fits is no longer overflow.
      const overflow = p.overflow && p.fit && fill !== null && fill <= 100
        ? [] : p.overflow ? ['oversize unit: fragmented between atoms (atoms intact)'] : []
      return { n: p.n, units: p.units, fillPct: fill, overflow, fitTier: p.fit }
    })
    report.nMade = nMade
  }

  const finalHtml = await page.evaluate(() => '<!DOCTYPE html>\n' + document.documentElement.outerHTML)
  await browser.close()

  if (o.outHtml) { mkdirSync(dirname(resolve(o.outHtml)), { recursive: true }); writeFileSync(o.outHtml, finalHtml, 'utf8') }
  if (o.outJson) { mkdirSync(dirname(resolve(o.outJson)), { recursive: true }); writeFileSync(o.outJson, JSON.stringify(report, null, 2) + '\n', 'utf8') }
  console.log(`packed: mode=${o.mode} pages=${report.pages.length}${report.fitTier ? ` fitTier=${report.fitTier}` : ''} -> ${o.outJson ?? '(no json)'}`)
  for (const p of report.pages) {
    console.log(`  p${String(p.n).padStart(2)} fill=${p.fillPct ?? '?'}% units=[${p.units.join(', ')}]${p.overflow.length ? ' OVERFLOW:' + p.overflow.join(';') : ''}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })