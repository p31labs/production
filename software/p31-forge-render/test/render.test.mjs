// render.test.mjs — local verification of the render worker's pure-JS paths
// (validate, buildHtml, DOCX). The Browser Run PDF path is deploy-time only;
// the HTML it feeds is what this test asserts on.
import { validate } from '../src/validate.js'
import { resolveTemplate, buildHtml } from '../src/template.js'
import { irToDocx } from '../src/docx-render.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIX = (f) => JSON.parse(readFileSync(resolve(HERE, '..', '..', 'p31-forge', 'fixtures', f), 'utf8'))

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1) } }
const results = []

for (const f of ['report.json', 'letter.json', 'grant.json', 'runbook.json', 'guide.json', 'family-letter.json', 'brief.json', 'agenda.json', 'table-report.json', 'packet.json', 'deck.json']) {
  const ir = FIX(f)
  const v = validate(ir)
  assert(v.ok, `${f}: ${v.errors.join('; ')}`)
  const { template } = resolveTemplate(ir)
  const theme = ir.theme ?? template.defaultTheme ?? 'ats'
  const html = buildHtml(structuredClone(ir), template, theme)
  assert(html.includes('<html'), `${f}: no html`)
  assert(html.includes('data-theme="' + theme + '"'), `${f}: theme attr missing`)
  const docx = await irToDocx(structuredClone(ir), theme)
  assert(Buffer.isBuffer(docx) && docx.length > 1000, `${f}: docx too small (${docx.length})`)
  results.push(`${f}: validate ✓ html ✓ docx ${docx.length}b`)
}

console.log(results.join('\n'))
console.log('✅ render worker local tests passed')