#!/usr/bin/env node
/**
 * compliance-scan.mjs — Lane D v6.0 (runbook §7 D-2) consumer token-compliance scan.
 *
 * Zero-dependency walker over READ-ONLY consumer surfaces. Flags:
 *   1. raw hex colors  #RGB / #RGBA / #RRGGBB / #RRGGBBAA
 *   2. rgb() / rgba() color literals (with a numeric first channel)
 *   3. raw px values on SCALABLE APPEARANCE properties
 *      (font-size, line-height, letter-spacing, word-spacing, border-radius)
 *
 * Scope decision (documented, per production AGENTS.md Law 1 "the shell owns
 * geometry"): px on margin/padding/gap/width/height is NOT flagged — geometry
 * is the shell's lawful domain. px on appearance properties is the violation
 * class the canon token audit cares about.
 *
 * Regex reference (colors): production/packages/design-core/scripts/token-audit.mjs
 *   HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g  (extended here
 *   to 4-digit RGBA shorthand, which the canon audit does not catch)
 *   RAW_RGB = /rgba?\(\s*\d/g
 *
 * Usage:
 *   node compliance-scan.mjs                    → full baseline scan, writes compliance-baseline.md
 *   node compliance-scan.mjs --fixtures         → negative + positive control only (paste output)
 *   node compliance-scan.mjs --surface <dir>    → scan one surface, print findings
 *
 * Hard boundaries honored: all scanned roots are opened READ-ONLY (readFileSync
 * only). This script writes only under V6-D-adoption/.
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, resolve, basename } from 'node:path'

// ─── Surfaces (READ-ONLY) ─────────────────────────────────────────────────
const SURFACES = [
  {
    label: 'design-portal-src',
    root: '/home/p31/production/portals/design/src',
    note: 'reference design portal (React 19 + Vite) — canon consumer #1',
  },
  {
    label: 'p31ca-public',
    root: '/home/p31/production/apps/p31ca/public',
    note: 'flagship p31ca.org portal public assets (html/css/js)',
  },
  {
    label: 'ws-planetary-planet',
    root: '/home/p31/P31-local-workspace/phosphorus31.org/planetary-planet/src',
    note: 'P31-local-workspace selected surface (Astro marketing site src)',
  },
]

const FIXTURE_DIR = join(resolve(new URL('.', import.meta.url).pathname), 'fixtures')

// ─── Patterns ─────────────────────────────────────────────────────────────
const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
const RAW_RGB = /rgba?\(\s*\d/g
// px on scalable appearance properties (CSS declarations) — Law 1 keeps
// geometry out of this audit, so margin/padding/gap/width/height are excluded.
const PX_SCALABLE = /(?:font-size|line-height|letter-spacing|word-spacing|border-radius)\s*:\s*[^;{}]*\b\d+(?:\.\d+)?px\b/gi
// TSX/HTML inline style objects: fontSize: '16px' etc.
const PX_INLINE = /\b(fontSize|lineHeight|letterSpacing|wordSpacing|borderRadius)\s*:\s*['"]?\d+(?:\.\d+)?px['"]?/g

const EXT = /\.(css|tsx|html|astro|mdx)$/
const SKIP_DIRS = new Set(['node_modules', 'dist', 'vendor', '.git', '.wrangler', 'storybook-static', 'dist-storybook', '.astro', '.kilo', 'coverage', 'archive'])

// ─── Walker ───────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const p = join(dir, entry)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, out)
    else if (EXT.test(entry)) out.push(p)
  }
  return out
}

function scanFile(file, root) {
  const content = readFileSync(file, 'utf8')
  const rel = relative(root, file)
  const hex = (content.match(HEX) || []).map(s => s.toUpperCase())
  const rgb = content.match(RAW_RGB) || []
  const px = [...new Set((content.match(PX_SCALABLE) || []).concat(content.match(PX_INLINE) || []).map(s => s.trim()))]
  return { file: rel, hex: hex.length, rgb: rgb.length, px: px.length, samples: { hex: hex.slice(0, 3), rgb: rgb.slice(0, 3), px: px.slice(0, 3) } }
}

function scanSurface(surface) {
  const files = walk(surface.root)
  const findings = []
  let totals = { files: files.length, hexFiles: 0, rgbFiles: 0, pxFiles: 0, hex: 0, rgb: 0, px: 0, clean: 0 }
  for (const f of files) {
    const r = scanFile(f, surface.root)
    if (!r.hex && !r.rgb && !r.px) { totals.clean++; continue }
    if (r.hex) { totals.hexFiles++; totals.hex += r.hex }
    if (r.rgb) { totals.rgbFiles++; totals.rgb += r.rgb }
    if (r.px) { totals.pxFiles++; totals.px += r.px }
    findings.push(r)
  }
  findings.sort((a, b) => (b.hex + b.rgb + b.px) - (a.hex + a.rgb + a.px))
  return { surface, totals, findings }
}

// ─── Fixture controls (negative MUST flag all three; positive MUST flag none) ──
function runFixtureControls() {
  console.log('=== NEGATIVE CONTROL (planted hex + rgba + px must ALL be flagged) ===')
  const neg = scanFile(join(FIXTURE_DIR, 'negative-control.tsx'), FIXTURE_DIR)
  console.log(JSON.stringify(neg, null, 2))
  const negOk = neg.hex > 0 && neg.rgb > 0 && neg.px > 0
  console.log(`NEGATIVE CONTROL: ${negOk ? 'PASS (all three violation classes flagged)' : 'FAIL'}`)
  console.log('\n=== POSITIVE CONTROL (token-only file must flag NOTHING) ===')
  const pos = scanFile(join(FIXTURE_DIR, 'positive-control.css'), FIXTURE_DIR)
  console.log(JSON.stringify(pos, null, 2))
  const posOk = pos.hex === 0 && pos.rgb === 0 && pos.px === 0
  console.log(`POSITIVE CONTROL: ${posOk ? 'PASS (zero false positives)' : 'FAIL'}`)
  return negOk && posOk
}

// ─── Markdown baseline (capped: 30 findings + counts) ─────────────────────
function emitBaseline(results, timestamp) {
  const lines = []
  lines.push('<!-- P31-HEADER')
  lines.push('id: p31_v6_d2_compliance_baseline_20261011_v1.0')
  lines.push('type: compliance-baseline (generated by compliance-scan.mjs)')
  lines.push('component: design-workflow/V6-D-adoption')
  lines.push('status: baseline')
  lines.push('retention: keep-forever')
  lines.push('created: ' + timestamp)
  lines.push('owner: lane-d-v6')
  lines.push('-->')
  lines.push('')
  lines.push('# D-2 Consumer Token-Compliance Baseline (Lane D v6.0)')
  lines.push('')
  lines.push('Generated by `compliance-scan.mjs` (zero-dep, read-only walker).')
  lines.push('Flag classes: raw hex `#RGB/#RGBA/#RRGGBB/#RRGGBBAA`, `rgb()/rgba()`')
  lines.push('literals, raw px on scalable appearance properties (`font-size`,')
  lines.push('`line-height`, `letter-spacing`, `word-spacing`, `border-radius`).')
  lines.push('Per production AGENTS.md Law 1, geometry px (margin/padding/gap/')
  lines.push('width/height) is NOT flagged. Regex reference: design-core')
  lines.push('`scripts/token-audit.mjs` (hex extended to 4-digit RGBA shorthand).')
  lines.push('')
  lines.push('## Per-surface counts')
  lines.push('')
  lines.push('| Surface | Files | Clean | Hex files (hits) | RGB files (hits) | px files (hits) |')
  lines.push('|---|---|---|---|---|---|')
  const grand = { files: 0, clean: 0, hexFiles: 0, rgbFiles: 0, pxFiles: 0, hex: 0, rgb: 0, px: 0 }
  for (const r of results) {
    const t = r.totals
    for (const k of Object.keys(grand)) grand[k] += t[k]
    lines.push(`| ${r.surface.label} | ${t.files} | ${t.clean} | ${t.hexFiles} (${t.hex}) | ${t.rgbFiles} (${t.rgb}) | ${t.pxFiles} (${t.px}) |`)
  }
  lines.push(`| **total** | ${grand.files} | ${grand.clean} | ${grand.hexFiles} (${grand.hex}) | ${grand.rgbFiles} (${grand.rgb}) | ${grand.pxFiles} (${grand.px}) |`)
  lines.push('')
  lines.push('## Top findings (capped at 30)')
  lines.push('')
  let n = 0
  for (const r of results) {
    for (const f of r.findings) {
      if (n++ >= 30) break
      const bits = []
      if (f.hex) bits.push(`${f.hex}×hex`)
      if (f.rgb) bits.push(`${f.rgb}×rgb`)
      if (f.px) bits.push(`${f.px}×px`)
      lines.push(`- \`${r.surface.label}/${f.file}\` — ${bits.join(', ')}`)
      const s = [...f.samples.hex.map(x => '`' + x + '`'), ...f.samples.rgb.map(x => '`' + x + '`'), ...f.samples.px.map(x => '`' + x + '`')].join(' ')
      if (s) lines.push(`  samples: ${s}`)
    }
  }
  const totalFindings = results.reduce((a, r) => a + r.findings.length, 0)
  lines.push('')
  lines.push(`_${totalFindings} files carry at least one flag across all surfaces (report capped at 30 rows)._`)
  lines.push('')
  return lines.join('\n') + '\n'
}

// ─── Main ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const val = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }

if (flag('--fixtures')) {
  const ok = runFixtureControls()
  process.exit(ok ? 0 : 1)
}

const timestamp = new Date().toISOString()
if (val('--surface')) {
  const label = val('--surface')
  const surface = SURFACES.find(s => s.label === label) || { label, root: label }
  const r = scanSurface(surface)
  console.log(`surface=${r.surface.label} root=${r.surface.root}`)
  console.log(JSON.stringify(r.totals))
  for (const f of r.findings) console.log(`${f.hex}xH ${f.rgb}xR ${f.px}xP  ${f.file}`)
  process.exit(0)
}

// Default: full baseline scan + write compliance-baseline.md
const outDir = resolve(new URL('.', import.meta.url).pathname)
const results = SURFACES.map(scanSurface)
console.log('=== D-2 COMPLIANCE SCAN (real surfaces) ===')
for (const r of results) {
  const t = r.totals
  console.log(`${r.surface.label}: files=${t.files} clean=${t.clean} hexFiles=${t.hexFiles}(${t.hex}) rgbFiles=${t.rgbFiles}(${t.rgb}) pxFiles=${t.pxFiles}(${t.px})`)
}
const totalFindings = results.reduce((a, r) => a + r.findings.length, 0)
console.log(`total flagged files: ${totalFindings}`)
const md = emitBaseline(results, timestamp)
writeFileSync(join(outDir, 'compliance-baseline.md'), md)
console.log(`wrote ${join(outDir, 'compliance-baseline.md')} (${md.length} bytes)`)