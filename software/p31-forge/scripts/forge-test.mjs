#!/usr/bin/env node
// P31 Forge — forge:test. Renders every fixture through the universal pipeline
// and runs all gates; btc-callkit is the regression case. Prints a per-template
// table: template, mode, theme, pages, fill, gates.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { renderDoc } from './render-doc.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const PY = '/tmp/report/venv/bin/python'

function pdfPages(path) {
  if (!existsSync(path)) return 0
  const out = execFileSync(PY, ['-c', `import pymupdf;print(len(pymupdf.open('${path}')))`], { encoding: 'utf8' })
  return parseInt(out.trim(), 10)
}

async function main() {
  const fixtures = readdirSync(resolve(ROOT, 'fixtures')).filter((f) => f.endsWith('.json')).sort()
  const rows = []

  for (const f of fixtures) {
    const path = resolve(ROOT, 'fixtures', f)
    const name = f.replace('.json', '')
    let gate = '✅'
    try {
      await renderDoc({ args: { ir: path, out: `/tmp/report/fixture-${name}.pdf`, quiet: true }, lenient: true, fixture: true })
    } catch (e) { gate = `❌ ${e.message.split('\n')[0].slice(0, 60)}` }
    const pdf = `/tmp/report/fixture-${name}.pdf`
    const pages = pdfPages(pdf)
    const packPath = `/tmp/report/${name}.pack.json`
    const pack = existsSync(packPath) ? JSON.parse(readFileSync(packPath, 'utf8')) : null
    const tpl = pack?.template ?? '?'
    const fills = pack?.pages?.map((p) => p.fillPct).filter((x) => x != null) ?? []
    const fill = fills.length ? `${Math.round(fills.reduce((a, b) => a + b, 0) / fills.length)}%` : '—'
    rows.push({ fixture: name, tpl, mode: pack?.mode ?? '?', pages, fill, gate })
  }

  // Regression: btc-callkit session through the wrapper CLI
  {
    let gate = '✅'
    try {
      await renderDoc({ args: { ir: 'session:btc-callkit', theme: 'ats', out: '/home/p31/BIG-THINK-CALL-KIT.pdf', quiet: true }, lenient: true })
    } catch (e) { gate = `❌ ${e.message.split('\n')[0].slice(0, 60)}` }
    const pack = JSON.parse(readFileSync('/tmp/report/btc-callkit.pack.json', 'utf8'))
    const fills = pack.pages.map((p) => p.fillPct).filter((x) => x != null)
    rows.push({ fixture: 'btc-callkit (regression)', tpl: 'report', mode: pack.mode, pages: pdfPages('/home/p31/BIG-THINK-CALL-KIT.pdf'), fill: `${Math.round(fills.reduce((a, b) => a + b, 0) / fills.length)}%`, gate })
  }

  // Theme matrix: the same template in different themes — the engine's proof.
  const combos = [
    ['fixtures/letter.json', 'family', 'letter-family'],
    ['fixtures/letter.json', 'friends', 'letter-friends'],
    ['fixtures/grant.json', 'professional', 'grant-professional'],
    ['fixtures/grant.json', 'ink', 'grant-ink'],
    ['fixtures/letter.json', 'professional', 'letter-professional'],
    ['fixtures/report.json', 'professional', 'report-professional'],
  ]
  for (const [path, theme, tag] of combos) {
    let gate = '✅'
    try {
      await renderDoc({ args: { ir: resolve(ROOT, path), theme, out: `/tmp/report/combo-${tag}.pdf`, quiet: true }, lenient: true, fixture: true })
    } catch (e) { gate = `❌ ${e.message.split('\n')[0].slice(0, 60)}` }
    rows.push({ fixture: `${tag} (${theme})`, tpl: 'combo', mode: '—', pages: pdfPages(`/tmp/report/combo-${tag}.pdf`), fill: '—', gate })
  }

  console.log('\nPER-TEMPLATE FIXTURE TABLE')
  console.log('fixture                  template        mode           pages  fill   gates')
  for (const r of rows) {
    console.log(`${r.fixture.padEnd(24)} ${r.tpl.padEnd(14)} ${String(r.mode).padEnd(14)} ${String(r.pages).padEnd(6)} ${String(r.fill).padEnd(6)} ${r.gate}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })