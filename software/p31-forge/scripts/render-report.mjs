#!/usr/bin/env node
// P31 Forge — render-report.mjs (v2 thin wrapper).
// Backward-compatible CLI: --session <id> [--theme X] [--out file.pdf]
// delegates to the universal pipeline (render-doc.mjs).
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderDoc } from './render-doc.mjs'

const isMain = fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')
if (isMain) {
  const a = process.argv.slice(2)
  const get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d }
  const session = get('--session')
  if (!session) {
    console.error('usage: node scripts/render-report.mjs --session <id> [--theme scene|editorial|consulting|midnight|ats|ink] [--out file.pdf]')
    process.exit(2)
  }
  renderDoc({ args: { ir: `session:${session}`, theme: get('--theme'), out: get('--out') } })
    .then((r) => console.log(`\n✅ report "${r.ir.meta.title}" (${r.tpl.name}, ${r.theme}) -> ${r.pdfPath}`))
    .catch((e) => { console.error(e.message); process.exit(1) })
}

// Re-exports for programmatic use (tests, fixtures).
export { renderDoc }