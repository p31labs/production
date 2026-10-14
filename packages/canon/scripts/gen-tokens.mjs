#!/usr/bin/env node
/**
 * @p31ca/canon — gen-tokens.mjs
 *
 * THE ONLY token writer. There is exactly one source of truth —
 * ../../src/theming/theme-store.ts (THEMES + BASE) — and this script
 * derives every artifact from it:
 *
 *   1. dist/tokens.css  — :root carries BASE + DEFAULT_THEME palette,
 *                         and one [data-theme="<id>"] block per theme,
 *                         ALL variable names are the runtime
 *                         --p31-* names. Constant names, per-theme
 *                         values. No second namespace can ever exist.
 *   2. tokens/tokens.dtc.json — W3C DTCG-shaped portable export
 *                         (primitives + per-theme semantic groups).
 *   3. Style Dictionary then VALIDATES the emitted DTCG file. SD does
 *                         not generate CSS; it only proves the export
 *                         is spec-conformant. Any parse failure exits 1.
 *
 * Everything in this file reads THEMES/BASE — nothing here owns a
 * value. A value you cannot find in theme-store.ts does not exist.
 *
 * Run: node scripts/gen-tokens.mjs  (from packages/canon)
 */
import { writeFileSync, appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { THEMES, THEME_IDS, DEFAULT_THEME, BASE, SEMANTIC_MAP, GLOBAL_COMPAT, COMPAT_ROOT, CONDITIONAL_CSS, ROSE_MODE } from '../src/theming/theme-store.ts'
import { buildTokenArtifacts } from './sd-config.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const distDir = join(root, 'dist')
const tokensDir = join(root, 'tokens')
const dtcgPath = join(tokensDir, 'tokens.dtc.json')

mkdirSync(distDir, { recursive: true })
mkdirSync(join(tokensDir, 'dist'), { recursive: true })

/** Map a --p31-* name to its DTCG $type. */
function typeFor(name) {
  if (name === 'glass-shadow' || name.startsWith('glow-')) return 'shadow'
  if (name.startsWith('font-')) return 'fontFamily'
  if (name.startsWith('duration-')) return 'duration'
  if (name.endsWith('-ms')) return 'duration'
  if (name.startsWith('easing-') || name.startsWith('spring-')) return 'cubicBezier'
  if (name.startsWith('z-') || name === 'speed-factor' || name.includes('tint')) return 'number'
  if (
    name.startsWith('scale-') || name.startsWith('radius-') ||
    name.startsWith('space-') || name.startsWith('spacing-') ||
    name.startsWith('type-') || name.startsWith('blur-') ||
    name.startsWith('touch-') || name.startsWith('fluid-') ||
    name.startsWith('control-') || name.startsWith('gap-') ||
    name.startsWith('page-') || name.startsWith('prose-') ||
    name.startsWith('form-') || name.startsWith('shell-') ||
    name.startsWith('grid-') || name.startsWith('split-') ||
    name === 'focus-offset' ||
    name === 'base' ||
    name === 'topbar-height' || name === 'header-height' ||
    name === 'glass-blur' ||
    name === 'glass-radius' || name === 'card-padding' ||
    ['h1', 'h2', 'h3', 'h4', 'body', 'body-sm', 'label', 'caption'].includes(name)
  ) return 'dimension'
  return 'color'
}

// ---------------------------------------------------------------------
// CSS-string -> DTCG structured value converters.
// theme-store.ts holds CSS-native values (oklch(...), 16px, calc(...)).
// The strict DTCG 2025.10 schema requires structured $value objects, not
// CSS strings — SD's validation is lenient, dtokens check is strict. These
// converters emit the structured form so the file conforms to the schema it
// declares. CSS-function values (calc/var/blur) have NO portable DTCG form;
// they are excluded from the DTCG export (they belong to the CSS-emit layer).
// ---------------------------------------------------------------------

const CSS_FUNCTION_RE = /^(calc|var|clamp|min|max|blur|drop-shadow)\(/

function oklchToObject(value) {
  const m = String(value).match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/i)
  if (!m) return null
  const num = (s) => (typeof s === 'string' && s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s))
  const components = [num(m[1]), num(m[2]), num(m[3])]
  return m[4] !== undefined ? { colorSpace: 'oklch', components, alpha: num(m[4]) } : { colorSpace: 'oklch', components }
}

function dimToObject(value) {
  const m = String(value).match(/^([\d.]+)([a-z%]*)$/i)
  if (!m) return null
  // `ch` is a valid CSS unit but not portable in the DTCG dimension schema
  // (canon v2's --p31-prose-max is 65ch) — treat it like other CSS-only
  // values: dropped from the DTCG export, kept in the CSS emit layer.
  if (m[2] === 'ch') return null
  // A bare `0` dimension is semantically 0px — DTCG rejects empty unit.
  const unit = m[2] || (parseFloat(m[1]) === 0 ? 'px' : '')
  return { value: parseFloat(m[1]), unit }
}

function cubicToArray(value) {
  // Accept both '0.4 0 0.2 1' and 'cubic-bezier(0.4, 0, 0.2, 1)' forms.
  const m = String(value).match(/cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i)
  const parts = m
    ? [m[1], m[2], m[3], m[4]].map(Number)
    : String(value).trim().split(/\s+/).map(Number)
  return parts.length === 4 && parts.every((n) => !Number.isNaN(n)) ? parts : null
}

function fontFamilyToArray(value) {
  return String(value).split(',').map((s) => s.replace(/['"]/g, '').trim()).filter(Boolean)
}

// Emit a strict-DTCG $value for a given $type + raw CSS string.
// Returns null for css-function values (not portable) and unparseable values.
function dtcgValue(type, raw) {
  if (typeof raw !== 'string') return raw
  if (raw.startsWith('{') && raw.endsWith('}')) return raw // alias ref
  if (CSS_FUNCTION_RE.test(raw)) return null // calc/var/blur — not portable
  switch (type) {
    case 'color': return oklchToObject(raw)
    case 'dimension': return dimToObject(raw)
    case 'duration': return dimToObject(raw)
    case 'fontFamily': return fontFamilyToArray(raw)
    case 'cubicBezier': return cubicToArray(raw)
    case 'number': {
      const n = parseFloat(raw)
      return Number.isNaN(n) ? null : n
    }
    case 'boxShadow': return raw // shadow strings stay as CSS — flagged below
    case 'shadow': return null // composite shadow parsing is a separate concern; not portable as a string
    default: return raw
  }
}

/** Build a DTCG token node, converting CSS-string values to structured form. */
function dt(value, type, desc) {
  const structured = dtcgValue(type, value)
  const node = { $value: structured ?? value, $type: type }
  if (typeof value === 'string' && value.length) {
    // The RAW CSS string rides as a vendor extension so the SD v5 pipeline
    // emits byte-identical CSS (no reserialization of oklch/dimensions).
    node.$extensions = { p31: { css: value } }
  }
  if (structured === null) {
    // css-function value: mark non-portable so the export step can drop it.
    node.$description = `${desc ?? ''} [css-dependent: '${value}']`.trim()
  } else if (desc) {
    node.$description = desc
  }
  return node
}

/** '--p31-scale-xs' -> 'scale-xs' */
function bare(name) {
  return name.replace(/^--p31-/, '')
}

// ---------------------------------------------------------------------
// 1. DTCG export — both semantic AND per-theme palette
// ---------------------------------------------------------------------
// The DTCG tree serves TWO consumers with different questions:
//
//   - `p31.*` = semantic slots (contract-resolvable)
//       Contracts resolve against this tree; a token not in SEMANTIC_MAP
//       cannot be referenced by any contract (validate-contracts hard-fails).
//       Default-theme value in $value, per-theme overrides in $extensions.p31.themes.
//
//   - `themes.<id>.p31.*` = full per-theme palette (informational, not contract-resolvable)
//       A designer who opens tokens.dtc.json to see "what colors exist in cipher"
//       needs the raw palette, not just semantic slots. This section carries every
//       token from THEMES[id].tokens per theme.
//
// Two questions, two answers, one file. That's what DTCG is for.
// Contracts resolve against p31.* only (namespace gate in validate-contracts).
// External consumers (Figma, Tokens Studio) inspect themes.<id>.* for palettes.

/** Reduce an OKLCH color's chroma component, preserving hue + lightness. */
function reduceChroma(value, chroma) {
  const m = value.match(/^oklch\(([^\s]+)\s+([^\s]+)\s+([^\s/]+)(\s*\/\s*[^)]+)?\)$/)
  if (!m) return value
  return `oklch(${m[1]} ${chroma} ${m[3]}${m[4] ?? ''})`
}

/** Resolve a semantic slot for a specific theme. */
function resolveSlot(slot, themeId) {
  if (slot.literal !== undefined) return slot.literal
  const paletteKey = `--p31-${slot.palette}`
  const palette = THEMES[themeId]?.tokens?.[paletteKey]
  if (!palette) return undefined
  let value = palette
  if (slot.chroma !== undefined) value = reduceChroma(value, slot.chroma)
  if (slot.opacity === undefined) return value
  // OKLCH opacity: inject `/ alpha` before the closing paren.
  return value.replace(/\)$/, ` / ${slot.opacity})`)
}

const p31 = {}

// Primitives (theme-agnostic)
for (const [full, value] of Object.entries(BASE)) {
  const name = bare(full)
  const node = dt(value, typeFor(name))
  // css-dependent (calc/var/blur) — no portable DTCG form; skip.
  if ((node.$description ?? '').includes('css-dependent')) continue
  p31[name] = node
}

// design-core compatibility tokens (Phase 1 absorption) — same namespace,
// verbatim values, no reconciliation yet.
for (const [full, value] of Object.entries(GLOBAL_COMPAT)) {
  const name = bare(full)
  const node = dt(value, typeFor(name))
  if ((node.$description ?? '').includes('css-dependent')) continue
  p31[name] = node
}

// Semantic slots — default-theme value in $value, per-theme map in $extensions
for (const [path, slot] of Object.entries(SEMANTIC_MAP)) {
  const defaultValue = resolveSlot(slot, DEFAULT_THEME)
  // Convert the default value to structured DTCG; css-dependent slots are
  // dropped from the contract-resolvable tree (they are not portable).
  const defaultStructured = dtcgValue(slot.type, defaultValue)
  if (defaultStructured === null) continue // css-dependent — not portable
  const node = { $value: defaultStructured, $type: slot.type }
  if (typeof defaultValue === 'string' && defaultValue.length) {
    // Raw CSS string for the SD v5 emission — the default-theme value must
    // not be reserialized from the structured form.
    node.$extensions = { p31: { css: defaultValue } }
  }

  // Per-theme overrides ride along in two forms: `themes` (structured, for
  // external DTCG consumers) and `themesCss` (raw store strings, for the SD
  // v5 CSS emission — every theme block carries every semantic slot, exactly
  // like the pre-v5 export). Style Dictionary ignores unknown $extensions.
  const themesExt = {}
  const themesCss = {}
  for (const id of THEME_IDS) {
    const v = resolveSlot(slot, id)
    if (v === undefined) continue
    themesCss[id] = v
    const sv = dtcgValue(slot.type, v)
    if (sv !== null && JSON.stringify(sv) !== JSON.stringify(defaultStructured)) themesExt[id] = sv
  }
  const extP31 = { ...(node.$extensions?.p31 ?? {}) }
  if (Object.keys(themesExt).length) extP31.themes = themesExt
  extP31.themesCss = themesCss
  node.$extensions = { p31: extP31 }

  // Nest under `p31` using dotted path — e.g. 'color.action.primary' → p31.color.action.primary
  const parts = path.split('.')
  let cursor = p31
  for (let i = 0; i < parts.length - 1; i++) {
    cursor = cursor[parts[i]] ??= {}
  }
  cursor[parts[parts.length - 1]] = node
}

// ---------------------------------------------------------------------
// 1b. Per-theme palette blocks — for external consumers (Figma, Tokens Studio)
// ---------------------------------------------------------------------
// The p31.* semantic tree is contract-resolvable. But a designer who opens
// the DTCG to see "what colors exist in the cipher theme" needs the FULL
// palette, not just semantic slots. This section emits themes.<id>.p31.*
// with every token from THEMES[id].tokens, so both needs are met:
//   - p31.* = contract-resolvable semantic namespace
//   - themes.<id>.p31.* = per-theme palette (informational, not contract-resolvable)
//
// Two questions, two answers, one file. That's what DTCG is for.
const themes = {}
for (const id of THEME_IDS) {
  const themeP31 = {}
  for (const [full, value] of Object.entries(THEMES[id].tokens)) {
    const name = bare(full)
    const node = dt(value, typeFor(name))
    if ((node.$description ?? '').includes('css-dependent')) continue
    themeP31[name] = node
  }
  themes[id] = { p31: themeP31 }
}

// ---------------------------------------------------------------------
// 1c. Accent MODES — ratified unification D1.
// ---------------------------------------------------------------------
// Cyan is the canonical estate accent (default + every theme). The rose
// family the hub renders today is a MODE: tokens carry `$extensions.mode:
// "rose"` and emit as a [data-theme="rose"] block — a semantic-tier value
// swap (Seven Laws #3), never a component or theme fork.
const modes = {}
for (const [full, value] of Object.entries(ROSE_MODE)) {
  const name = bare(full)
  const node = dt(value, typeFor(name), `Rose accent mode — runtime var ${full}`)
  node.$extensions = { mode: 'rose', ...(node.$extensions ?? {}) }
  modes[name] = node
}

// D3 — the ONE header token. --p31-topbar-height (56px legacy, 64px in
// canon) is DEPRECATED: the DTCG carries it as a validated alias ref to
// p31.header-height, the CSS emits var(--p31-header-height). Removed at
// Phase 3 port time. The GLOBAL_COMPAT entry with the same bare name is
// css-dependent (var()) and drops out of the primitive loop above.
// NOTE (resume 2026-10-14): the node is nested at the PRE-EDIT path
// p31.topbar.height — the path bottom-nav.contract.ts / topbar.contract.ts
// resolve against (validate-contracts walkTokens builds dotted paths from
// nested groups). A flat p31['topbar-height'] leaf breaks that resolution.
p31.topbar = {
  height: {
    $value: '{p31.header-height}',
    $type: 'dimension',
    $deprecated: 'Use --p31-header-height (4rem) — the single header token (unification D3). Alias removed at Phase 3 port time.',
    $description: 'DEPRECATED alias of --p31-header-height (4rem).',
    $extensions: { p31: { css: 'var(--p31-header-height)' } },
  },
}

// DTCG top-level metadata. `$schema` declares the Format Module version this
// export conforms to; `$extensions.p31` carries the vendor namespace (P31)
// with version + provenance. This matches the version @p31ca/design-core already
// declares in its manifest.json so the two token systems agree on one spec
// revision. NOTE: "2025.10" is the best-known current snapshot available
// offline; bump it here AND in design-core/manifest.json once a newer snapshot
// is verified against design-tokens.org.
const dtcg = {
  $schema: 'https://design-tokens.org/schemas/format/2025.10',
  $extensions: {
    p31: {
      version: '2025.10',
      name: 'P31 Labs Design System',
      description: 'Design canon DTCG export — primitives, semantic slots, per-theme palettes, accent modes (rose).',
    },
  },
  p31,
  themes,
  modes: { rose: modes },
  component: {},
}

// Merge the deprecation manifest (flat --p31-* → $deprecated) into the DTCG
// tree. The p31 subtree is mixed flat-leaves + nested groups, so flatten it to
// a --p31-path-segments → node map and match by CSS var name. Tokens whose
// value was not portable (dropped from the export) are absent and stay un-merged.
const deprecationsPath = join(tokensDir, '..', 'deprecations.json')
if (existsSync(deprecationsPath)) {
  const deprecations = JSON.parse(readFileSync(deprecationsPath, 'utf8'))
  const flat = new Map()
  const walk = (node, path) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue
      if (v && typeof v === 'object' && !Array.isArray(v) && v.$value === undefined) {
        walk(v, [...path, k])
      } else {
        flat.set(`--p31-${[...path, k].join('-')}`, v)
      }
    }
  }
  walk(p31, [])
  for (const [cssName, meta] of Object.entries(deprecations)) {
    const node = flat.get(cssName)
    if (node && typeof node === 'object') node.$deprecated = meta.$deprecated
  }
  // DTCG deprecation workflow stage 2 — emit a build warning for deprecated
  // tokens so anyone regenerating sees the surface shrinking.
  console.warn(`⚠️  ${Object.keys(deprecations).length} tokens are deprecated — see deprecations.json (removal v1.0.0)`)
}

writeFileSync(dtcgPath, JSON.stringify(dtcg, null, 2) + '\n')

// ---------------------------------------------------------------------
// 2. CSS output — SD v5 generates the portable-token layer from the DTCG
//    export (sd-config.mjs); this script appends the css-emit layer:
//    values with no portable DTCG form (calc/clamp/var/blur/color-mix/hex/
//    rgba/…), the COMPAT_ROOT :root overrides, and CONDITIONAL_CSS. That is
//    the documented architectural split (see file header) — SD is the token
//    generator, this script owns the css-emit layer. Same cascade positions
//    as the pre-v5 export: same @layer canon.tokens, later-in-layer wins.
// ---------------------------------------------------------------------
/** GLOBAL_COMPAT entries whose value has no portable DTCG form. */
function cssOnlyPairs(record, typeOf) {
  const out = []
  for (const [full, value] of Object.entries(record)) {
    if (dtcgValue(typeOf(bare(full)), value) === null) out.push([full, value])
  }
  return out
}

const compatCssOnly = cssOnlyPairs(GLOBAL_COMPAT, typeFor)
const baseCssOnly = cssOnlyPairs(BASE, typeFor)

// Flat dashed-name set of every token the DTCG p31 tree carries (primitives
// + semantic slots). The SD v5 layer emits exactly these; the css-emit
// supplement must NOT re-emit them (later-in-layer wins would invert the
// pre-v5 cascade, e.g. semantic scale.xs 12px vs BASE scale-xs calc()).
const dtcgEmittedNames = new Set()
{
  const walkFlat = (node, path) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue
      if (v && typeof v === 'object' && !Array.isArray(v) && v.$value === undefined) {
        walkFlat(v, [...path, k])
      } else {
        dtcgEmittedNames.add(`--p31-${[...path, k].join('-')}`)
      }
    }
  }
  walkFlat(p31, [])
}
const baseCssOnlyRoot = baseCssOnly.filter(([p]) => !dtcgEmittedNames.has(p))
const baseCssOnlyTheme = baseCssOnly.filter(([p]) => !dtcgEmittedNames.has(p))
// Per-theme palette entries with no portable form (e.g. glass-shadow rgba
// strings) — the DTCG themes tree drops them, so they ride the css-emit layer.
// Same dtcgEmittedNames filter: never re-emit a name the SD layer covers
// (themes spread BASE, whose css-only entries must not shadow the semantic
// slots the SD layer emits, e.g. scale.xs 12px vs BASE scale-xs calc()).
const themeCssOnly = new Map(
  THEME_IDS.map((id) => [
    id,
    cssOnlyPairs(THEMES[id].tokens, typeFor).filter(([p]) => !dtcgEmittedNames.has(p)),
  ]),
)
const semanticCssOnlyRoot = []
const semanticCssOnlyTheme = new Map(THEME_IDS.map((id) => [id, []]))
for (const [path, slot] of Object.entries(SEMANTIC_MAP)) {
  const name = `--p31-${path.split('.').join('-')}`
  const vDefault = resolveSlot(slot, DEFAULT_THEME)
  if (vDefault !== undefined && dtcgValue(slot.type, vDefault) === null) {
    semanticCssOnlyRoot.push([name, vDefault])
  }
  for (const id of THEME_IDS) {
    const v = resolveSlot(slot, id)
    if (v !== undefined && dtcgValue(slot.type, v) === null) {
      semanticCssOnlyTheme.get(id).push([name, v])
    }
  }
}

let cssSupplement = ''
cssSupplement +=
  '\n/* ── css-emit layer — values with no portable DTCG form (calc/clamp/var/\n' +
  '   blur/color-mix/hex/…) + COMPAT_ROOT overrides. Same layer; later wins.\n' +
  '   DEPRECATED (unification D3): --p31-topbar-height aliases the ONE header\n' +
  '   token --p31-header-height (4rem); removed at Phase 3 port time. ── */\n'
cssSupplement += '@layer canon.tokens {\n:root {\n'
for (const [p, v] of [
  ...compatCssOnly,
  ...baseCssOnlyRoot,
  ...themeCssOnly.get(DEFAULT_THEME),
  ...semanticCssOnlyRoot,
  ...Object.entries(COMPAT_ROOT),
]) {
  cssSupplement += `  ${p}: ${v};\n`
}
cssSupplement += '}\n'
for (const id of THEME_IDS) {
  // BASE css-only values (calc/clamp/var scale + control tokens) are
  // theme-independent; the pre-v5 export carried them in every theme block
  // (themes spread BASE) — reproduce that name coverage + cascade order
  // (palette before semantic, as pre-v5).
  const rows = [...baseCssOnlyTheme, ...themeCssOnly.get(id), ...semanticCssOnlyTheme.get(id)]
  if (!rows.length) continue
  cssSupplement += `[data-theme="${id}"] {\n${rows.map(([p, v]) => `  ${p}: ${v};`).join('\n')}\n}\n`
}
cssSupplement += '}\n'
cssSupplement += '\n/* ── design-core compatibility (unlayered) — Phase 1 absorption ── */\n'
cssSupplement += CONDITIONAL_CSS

// ---------------------------------------------------------------------
// 3. SD v5 build — dist/tokens.css (token layer), dist/tokens.mjs (typed
//    JS), tokens/dist/tokens.resolved.json (agent-consumable).
// ---------------------------------------------------------------------
try {
  await buildTokenArtifacts({
    root,
    meta: { $schema: dtcg.$schema, $extensions: dtcg.$extensions },
  })
} catch (err) {
  console.error('\nSD v5 BUILD FAILED — emitted tokens.dtc.json is not spec-conformant.\n')
  console.error(String(err.message ?? err))
  process.exit(1)
}
appendFileSync(join(distDir, 'tokens.css'), cssSupplement)
const finalCss = readFileSync(join(distDir, 'tokens.css'), 'utf8')

// ---------------------------------------------------------------------
// 2b. Typed name contract — src/tokens.ts
// ---------------------------------------------------------------------
// The `:root` block defines the full --p31-* name set (BASE + compat +
// default-theme palette + semantic slots + compat-root overrides). Emit that
// exact set as a TypeScript union so consumers (Canvas resolvers, fallback
// maps, manifest schemas) type their keys against real canon names — a
// typo'd token name becomes a compile error, not a silent fallback. Additive:
// nothing here changes tokens.css or the DTCG export.
function semanticCssVars(themeId) {
  const vars = {}
  for (const [path, slot] of Object.entries(SEMANTIC_MAP)) {
    const value = resolveSlot(slot, themeId)
    if (value === undefined) continue
    vars[`--p31-${path.split('.').join('-')}`] = value
  }
  return vars
}
const nameSet = new Set()
for (const full of Object.keys(BASE)) nameSet.add(full)
for (const full of Object.keys(GLOBAL_COMPAT)) nameSet.add(full)
for (const full of Object.keys(THEMES[DEFAULT_THEME].tokens)) nameSet.add(full)
for (const full of Object.keys(COMPAT_ROOT)) nameSet.add(full)
for (const full of Object.keys(semanticCssVars(DEFAULT_THEME))) nameSet.add(full)
const sortedNames = [...nameSet].sort()
const tokensTs = `/**
 * @p31ca/canon — tokens.ts (GENERATED by scripts/gen-tokens.mjs — do not edit).
 * Derived from src/theming/theme-store.ts (single source of truth).
 *
 * The typed name contract for --p31-*. Consumers (Canvas resolvers, fallback
 * maps, manifest schemas) type their keys against P31_TOKEN_NAMES so a
 * typo'd token name is a compile error, not a silent fallback. Values are
 * resolved at runtime from the emitted tokens.css; this file carries names
 * only.
 */

export type P31TokenName = ${sortedNames.map((n) => `'${n}'`).join(' | ')}

export const P31_TOKEN_NAMES: readonly P31TokenName[] = ${JSON.stringify(sortedNames)} as const
`
writeFileSync(join(root, 'src', 'tokens.ts'), tokensTs)

const themeCount = THEME_IDS.length
const semanticCount = Object.keys(SEMANTIC_MAP).length
console.log(`gen:tokens — ${themeCount} themes + 1 accent mode (rose) + ${semanticCount} semantic slots from theme-store.ts`)
console.log(`  dist/tokens.css           (${finalCss.length} bytes — SD v5 token layer + css-emit supplement)`)
console.log(`  dist/tokens.mjs           (typed JS — SD v5)`)
console.log(`  tokens/dist/tokens.resolved.json (SD v5, resolved)`)
console.log(`  tokens/tokens.dtc.json    (${(await import('node:fs')).statSync(dtcgPath).size} bytes, DTCG — SD validated)`)