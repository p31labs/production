#!/usr/bin/env node
/**
 * emit-embedded-shell.mjs — W4 embedded tier emitter (ESP-32 Node Zero).
 *
 * Emits a MINIMAL css subset from the canon DTCG token set
 * (packages/canon/tokens/tokens.dtc.json — structured $value nodes, so this
 * script has ZERO dependencies: plain node, no style-dictionary, no tsx).
 *
 * Subset contract (~20–30 tokens): surface/text/accent colors, status trio,
 * radius base, spacing 2–3 steps, one font stack, one focus ring, the
 * embedded device-tier adjustments (p31.device.embedded.*), and --p31-base.
 *
 * Budget (ESP-32 LittleFS 512KB → web UI < 100KB):
 *   raw     < 20 KB
 *   gzipped <  8 KB   (zlib level 9 — matches gzip -c within a few bytes)
 *
 * Modes:
 *   (default)    emit dist/embedded/p31-embedded.css(.gz) + README.md
 *   --check      emit + enforce the budget; exits 1 when over budget
 *   --self-test  negative control: proves the budget check FAILS when a fake
 *                oversized token is injected (and that the real subset passes)
 *
 * Output dir is dist/embedded (gitignored — generated, not committed).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const PKG = resolve(here, '..')
const CANON_DTCG = join(PKG, '..', 'canon', 'tokens', 'tokens.dtc.json')
const OUT_DIR = join(PKG, 'dist', 'embedded')
const OUT_CSS = join(OUT_DIR, 'p31-embedded.css')
const OUT_GZ = join(OUT_DIR, 'p31-embedded.css.gz')
const OUT_README = join(OUT_DIR, 'README.md')

export const BUDGET_RAW = 20480 // < 20 KB
export const BUDGET_GZIP = 8192 // < 8 KB

/**
 * The embedded subset — [dtcg path, css var name] pairs. DTCG paths map to
 * --p31-<dashed> runtime names exactly as canon's gen-tokens.mjs emits them.
 * Ordered: colors → radius → spacing → font → embedded tier → base.
 */
export const EMBEDDED_SUBSET = [
  // colors — surface hierarchy
  ['surface.background', '--p31-surface-background'],
  ['surface.raised', '--p31-surface-raised'],
  ['surface.overlay', '--p31-surface-overlay'],
  // colors — text hierarchy
  ['color.text.primary', '--p31-color-text-primary'],
  ['color.text.secondary', '--p31-color-text-secondary'],
  ['color.text.muted', '--p31-color-text-muted'],
  // colors — action + status
  ['color.action.primary', '--p31-color-action-primary'],
  ['color.action.secondary', '--p31-color-action-secondary'],
  ['status.success', '--p31-status-success'],
  ['status.warning', '--p31-status-warning'],
  ['status.error', '--p31-status-error'],
  // radius — base scale (component-level)
  ['radius.sm', '--p31-radius-sm'],
  ['radius.md', '--p31-radius-md'],
  ['radius.lg', '--p31-radius-lg'],
  // spacing — 3 steps of the inline scale
  ['space.inline.sm', '--p31-space-inline-sm'],
  ['space.inline.md', '--p31-space-inline-md'],
  ['space.inline.lg', '--p31-space-inline-lg'],
  // typography — one font stack (embedded devices ship no web fonts)
  ['font.family.sans', '--p31-font-family-sans'],
  // embedded device tier — the W4 tier adjustments ride along
  ['device.embedded.type.base', '--p31-device-embedded-type-base'],
  ['device.embedded.type.sm', '--p31-device-embedded-type-sm'],
  ['device.embedded.spacing.xs', '--p31-device-embedded-spacing-xs'],
  ['device.embedded.spacing.md', '--p31-device-embedded-spacing-md'],
  ['device.embedded.radius.sm', '--p31-device-embedded-radius-sm'],
  ['device.embedded.radius.md', '--p31-device-embedded-radius-md'],
  // root font base
  ['base', '--p31-base'],
]

/** Resolve a dotted path inside the p31 subtree of the DTCG tree. */
function resolveToken(p31, path) {
  let node = p31
  for (const seg of path.split('.')) {
    node = node?.[seg]
    if (node === undefined || node === null) return null
  }
  return node
}

/** Convert a structured DTCG $value to a CSS value string. */
function valueToCss(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value // defensive: raw CSS-shaped value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    // fontFamily: quote entries containing whitespace
    return value.map((s) => (/\s/.test(String(s)) ? `"${s}"` : s)).join(', ')
  }
  if (typeof value === 'object') {
    // dimension: { value, unit }
    if (value.unit !== undefined && value.value !== undefined) {
      return `${value.value}${value.unit}`
    }
    // color: { colorSpace, components, alpha? }
    if (value.colorSpace && Array.isArray(value.components)) {
      if (value.colorSpace !== 'oklch') return null // subset stance: OKLCH only
      const [l, c, h] = value.components
      if (l === undefined || c === undefined || h === undefined) return null
      const alpha = value.alpha !== undefined ? ` / ${value.alpha}` : ''
      return `oklch(${l} ${c} ${h}${alpha})`
    }
  }
  return null
}

/**
 * Build the embedded CSS from the canon DTCG tree.
 * Hard-fails (throws) on any missing/unconvertible subset token — a silent
 * fallback would be a drift source, not a subset.
 */
export function buildEmbeddedCss(dtcgJson) {
  const p31 = dtcgJson?.p31
  if (!p31 || typeof p31 !== 'object') {
    throw new Error('canon tokens.dtc.json has no p31 subtree')
  }
  const lines = []
  for (const [path, cssName] of EMBEDDED_SUBSET) {
    const node = resolveToken(p31, path)
    if (node === null) throw new Error(`embedded subset: missing token p31.${path}`)
    const css = valueToCss(node.$value !== undefined ? node.$value : node)
    if (css === null) throw new Error(`embedded subset: unconvertible token p31.${path}`)
    lines.push(`  ${cssName}: ${css};`)
  }
  const banner = [
    '/* p31-embedded.css — generated by design-core scripts/emit-embedded-shell.mjs.',
    ' * Minimal embedded-tier subset of @p31ca/canon tokens (ESP-32 Node Zero).',
    ' * Source: packages/canon/tokens/tokens.dtc.json (p31.* structured values).',
    ' * Budget: < 20 KB raw, < 8 KB gzipped — enforced by --check / --self-test. */',
  ].join('\n')
  const focus = [
    '',
    '/* One focus ring, built from the accent token (no extra token needed). */',
    ':focus-visible {',
    '  outline: 2px solid var(--p31-color-action-primary);',
    '  outline-offset: 2px;',
    '}',
    '',
  ].join('\n')
  return `${banner}\n\n:root {\n${lines.join('\n')}\n}\n${focus}`
}

/** Enforce the byte budgets. Returns { pass, raw, gzip }. */
export function checkBudgets(cssText) {
  const raw = Buffer.byteLength(cssText, 'utf8')
  const gzip = gzipSync(cssText, { level: 9, mtime: 0 }).length
  const over = []
  if (raw >= BUDGET_RAW) over.push(`raw ${raw} >= ${BUDGET_RAW}`)
  if (gzip >= BUDGET_GZIP) over.push(`gzip ${gzip} >= ${BUDGET_GZIP}`)
  return { pass: over.length === 0, raw, gzip, over }
}

/** Emit the CSS + .gz + README into dist/embedded. Returns { css, sizes }. */
export function emit(dtcgJson) {
  const css = buildEmbeddedCss(dtcgJson)
  const sizes = checkBudgets(css)
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_CSS, css)
  writeFileSync(OUT_GZ, gzipSync(css, { level: 9, mtime: 0 }))
  writeFileSync(OUT_README, embeddedReadme(sizes))
  return { css, sizes }
}

function embeddedReadme(sizes) {
  return [
    '# p31-embedded.css — ESP-IDF LittleFS guidance',
    '',
    'Generated by `packages/design-core/scripts/emit-embedded-shell.mjs`.',
    'Do not edit by hand — the subset allowlist lives in that script.',
    '',
    '## LittleFS `.gz` naming convention',
    '',
    '- Upload BOTH files to the LittleFS image: `p31-embedded.css` and',
    '  `p31-embedded.css.gz`. Same base name, `.gz` suffix — never a',
    '  different name (e.g. NOT `p31-embedded.min.gz`).',
    '- Serve the pre-compressed file with `Content-Encoding: gzip`. With',
    '  esp_http_server, point the URI handler at the `.gz` sibling and set',
    '  the header explicitly (check your IDF version — newer file-server',
    '  examples detect the `.gz` sibling automatically).',
    '- Skip the compression step at runtime: the ESP-32 never gzips on the',
    '  fly. The `.gz` on disk IS the served body.',
    '- Keep `p31-embedded.css` alongside for clients that do not advertise',
    '  `Accept-Encoding: gzip` (rare on embedded dashboards, but cheap).',
    '',
    `Sizes at last emit — raw ${sizes.raw} B (< ${BUDGET_RAW}), `,
    `gzip ${sizes.gzip} B (< ${BUDGET_GZIP}).`,
    '',
  ].join('\n')
}

/** Deterministic pseudo-random filler (LCG) — incompressible enough to blow
 *  BOTH budgets in the self-test negative control. */
function lcgFiller(len, seed = 0x5eed) {
  let s = seed
  let out = ''
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  for (let i = 0; i < len; i++) {
    s = (s * 1103515245 + 12345) % 2147483648
    out += alphabet[s % alphabet.length]
  }
  return out
}

/** Negative control: prove the budget check can fail. */
export function selfTest(dtcgJson) {
  const { css } = emit(dtcgJson)
  const baseline = checkBudgets(css)
  if (!baseline.pass) {
    console.error('✗ --self-test: baseline subset already exceeds budget')
    console.error(`   ${baseline.over.join('; ')}`)
    process.exitCode = 1
    return false
  }
  // Inject a fake oversized token — exceeds BOTH budgets (raw by size,
  // gzip by incompressibility).
  const injected = css.replace(
    ':root {\n',
    `:root {\n  --p31-fake-oversized-padding: "${lcgFiller(BUDGET_RAW + 512)}";\n`,
  )
  const negative = checkBudgets(injected)
  if (negative.pass) {
    console.error('✗ --self-test: budget check did NOT fail on an injected oversized token')
    process.exitCode = 1
    return false
  }
  console.log(`✅ --self-test: baseline passes (${baseline.raw} B raw, ${baseline.gzip} B gzip)`)
  console.log(`✅ --self-test: budget check FAILS on injected oversized token (${negative.over.join('; ')}) — negative control proven`)
  return true
}

export function loadCanon() {
  return JSON.parse(readFileSync(CANON_DTCG, 'utf8'))
}

function main() {
  const args = process.argv.slice(2)
  const dtcg = loadCanon()
  if (args.includes('--self-test')) {
    process.exitCode = selfTest(dtcg) ? 0 : 1
    return
  }
  const { sizes } = emit(dtcg)
  console.log(`embedded shell emitted → ${OUT_CSS}`)
  console.log(`  tokens: ${EMBEDDED_SUBSET.length}   raw: ${sizes.raw} B   gzip: ${sizes.gzip} B`)
  if (args.includes('--check')) {
    if (!sizes.pass) {
      console.error(`✗ embedded budget exceeded: ${sizes.over.join('; ')}`)
      process.exitCode = 1
    } else {
      console.log(`✅ embedded budget OK (raw < ${BUDGET_RAW} B, gzip < ${BUDGET_GZIP} B)`)
    }
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isMain) main()