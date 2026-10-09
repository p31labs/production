#!/usr/bin/env node
/**
 * @p31ca/canon — verify-token-parity.mjs
 *
 * The no-regression guarantee for making canon the SOLE token source.
 *
 * Baseline:  packages/design-core/src/css/tokens.css   (what ships today)
 * Candidate: packages/canon/dist/tokens.css            (what will ship)
 *
 * It asserts, using postcss (design-core nests conditional rules inside
 * :root, which a regex cannot parse):
 *
 *   1. COVERAGE — every --p31-* name design-core defines anywhere exists
 *      somewhere in canon.
 *   2. PARITY   — for every selector context BOTH files share (:root,
 *      [data-brand=*], [data-spoons=*], [data-dark-mode], [data-theme="light"],
 *      [data-portal=*]), each shared token declares the SAME value.
 *
 * Any missing name or divergent value exits 1. Until the 19 known shared-name
 * divergences are reconciled, this gate is RED by design — it is the switch
 * that blocks the Phase 3 flip.
 *
 * Usage: node scripts/verify-token-parity.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { converter, differenceCiede2000 } from 'culori';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..');
const BASELINE = resolve(root, 'packages', 'canon', 'baseline', 'design-core-css', 'all.css');
const CANDIDATE = resolve(root, 'packages', 'canon', 'dist', 'tokens.css');

/** Load a CSS file, inlining local @import './x.css' in source order, so the
 *  baseline is design-core's FULL loaded surface (base + tokens + layout +
 *  recipes + motion + typography), not just tokens.css. */
function loadWithImports(entry, seen = new Set()) {
  const file = resolve(entry);
  if (seen.has(file)) return '';
  seen.add(file);
  const css = readFileSync(file, 'utf8');
  return css.replace(/@import\s+['"]\.\/([^'"]+)['"]\s*;/g, (_, rel) =>
    loadWithImports(resolve(dirname(file), rel), seen),
  );
}

/** selector -> Map(token -> value), using each rule's DIRECT declarations. */
function parse(css) {
  const tree = postcss.parse(css);
  const contexts = new Map();
  tree.walkRules((rule) => {
    const selector = rule.selector.replace(/\s+/g, ' ').trim();
    let vars = contexts.get(selector);
    if (!vars) contexts.set(selector, (vars = new Map()));
    rule.each((node) => {
      if (node.type === 'decl' && node.prop.startsWith('--p31-')) {
        vars.set(node.prop, node.value.replace(/\s+/g, ' ').trim());
      }
    });
  });
  return contexts;
}

function tokenUnion(contexts) {
  const out = new Map();
  for (const vars of contexts.values()) for (const [k, v] of vars) if (!out.has(k)) out.set(k, v);
  return out;
}

/** Evaluate an innermost calc() of the form `A op B` in px. */
function evalInnermostCalc(expr) {
  const m = expr.trim().match(/^(-?[\d.]+)px\s*([+\-*/])\s*(-?[\d.]+)(?:px)?$/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = parseFloat(m[3]);
  const r = m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === '*' ? a * b : a / b;
  return Number.isFinite(r) ? `${r}px` : null;
}

/** Resolve var(--p31-*) chains and simple px calc() so `calc(x/2)` and its
 *  computed literal compare equal. Unknown/unsupported forms pass through. */
function resolveValue(value, vars) {
  let v = value;
  for (let i = 0; i < 25; i++) {
    const m = v.match(/var\((--p31-[a-z0-9-]+)\)/);
    if (!m || !vars.has(m[1])) break;
    v = v.replace(m[0], vars.get(m[1]));
  }
  for (let i = 0; i < 25; i++) {
    const m = v.match(/calc\(([^()]+)\)/);
    if (!m) break;
    const r = evalInnermostCalc(m[1]);
    if (r === null) break;
    v = v.replace(m[0], r);
  }
  return v;
}

/** design-core's generator emits `oklch(0% 0 NaN / a)` for achromatic colors
 *  (NaN hue when chroma is 0). Browser-safe but refuses to round-trip through
 *  color parsers. Normalize the NaN into 0 — numerically it is (L C 0). */
function repairNaNColor(value) {
  return value.replace(/oklch\(([^)]*)\)/g, (_m, inner) => {
    const parts = inner.split('/');
    const coords = parts[0].trim().split(/\s+/).slice(0, 3).join(' ');
    if (!/NaN/i.test(coords)) return _m;
    const fixed = coords.replace(/NaN+/gi, '0').replace(/\s+/g, ' ');
    return parts.length > 1 ? `oklch(${fixed} / ${parts[1].trim()})` : `oklch(${fixed})`;
  });
}

const toRgb = converter('rgb');

/** Normalize a resolved value's color tokens to an sRGB tuple string with
 *  millisecond precision so colors written as oklch()/rgba()/#hex — describing
 *  the same color — compare equal modulo rounding. Non-color segments are
 *  whitespace-collapsed and preserved verbatim. */
const COLOR_TOKEN = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-fA-F]{3,8}/g;

function cap(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function rgbStr(c) {
  const r = (cap(c.r) * 255).toFixed(3);
  const g = (cap(c.g) * 255).toFixed(3);
  const b = (cap(c.b) * 255).toFixed(3);
  const a = c.alpha === undefined ? '1' : (cap(c.alpha) * 1000).toFixed(3) / 1000;
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgb(${r}, ${g}, ${b}, ${a})`;
}

function normalizeValue(value) {
  const v = repairNaNColor(value).trim().replace(/\s+/g, ' ');
  if (!/(oklch|oklab|lab|lch|rgba?|hsla?|#[0-9a-fA-F]{3,8})/.test(v)) return v;
  return v.replace(COLOR_TOKEN, (tok) => {
    const c = toRgb(tok);
    return c ? rgbStr(c) : tok;
  });
}

const deltaE = differenceCiede2000();

/** ΔE2000 threshold in CIEDE2000 units. ~1.0 is the strict JND under controlled
 *  side-by-side conditions — stricter than the widely-cited graphic-workflow JND
 *  (~2.3). Deliberate: this is a reference gate, so any perceptible delta should
 *  be flagged; a false positive costs one evidence-cited exempt entry, while a
 *  false negative can ship an unseen rendering change. Genuine drift sits far
 *  above (research glow = 12.7, hue drift = 31.9); round-off equivalence sits
 *  well below (care glow = 0.41, accent-cyan = 0.01). */
const DELTA_E_MAX = 1.0;

/** Split a normalized color-bearing value into its non-color skeleton and its
 *  sRGB color tuples. Whitespace-collapsed non-color text must match exactly;
 *  each color tuple is judged by ΔE2000 against its twin. */
function splitColors(v) {
  const skeleton = [];
  const colors = [];
  let last = 0;
  for (const m of v.matchAll(/rgb\(([^)]+)\)/g)) {
    skeleton.push(v.slice(last, m.index));
    const nums = m[1].split(',').map((x) => parseFloat(x.trim()));
    colors.push({ r: nums[0] / 255, g: nums[1] / 255, b: nums[2] / 255, a: nums[3] });
    last = m.index + m[0].length;
  }
  skeleton.push(v.slice(last));
  return { skeleton, colors };
}

/** Compare two resolved values. Color-bearing values are split; non-color
 *  text must be identical and each sRGB color pair must sit within ΔE2000 ≤ 1
 *  with equal alpha. Non-color values compare by exact whitespace-collapsed
 *  string. This replaces the per-channel 3/255 rule, which both manufactured
 *  a divergence from round-off (care glow: ΔE 0.41) — and could mask real
 *  drift. */
function valuesEqual(a, b) {
  if (a === b) return true;
  const na = normalizeValue(a);
  const nb = normalizeValue(b);
  if (na === nb) return true;
  const aIsColor = /rgb\(/.test(na);
  const bIsColor = /rgb\(/.test(nb);
  if (aIsColor !== bIsColor) return false;
  if (aIsColor) {
    const A = splitColors(na);
    const B = splitColors(nb);
    if (A.skeleton.join('∅') !== B.skeleton.join('∅')) return false;
    if (A.colors.length !== B.colors.length) return false;
    for (let i = 0; i < A.colors.length; i++) {
      const ca = A.colors[i];
      const cb = B.colors[i];
      const aAlpha = ca.a === undefined || Number.isNaN(ca.a) ? 1 : ca.a;
      const bAlpha = cb.a === undefined || Number.isNaN(cb.a) ? 1 : cb.a;
      if (Math.abs(aAlpha - bAlpha) > 0.005) return false;
      const de = deltaE({ mode: 'rgb', r: ca.r, g: ca.g, b: ca.b }, { mode: 'rgb', r: cb.r, g: cb.g, b: cb.b });
      if (!(de <= DELTA_E_MAX)) return false;
    }
    return true;
  }
  return false;
}

/** Intentional, source-of-truth divergences that must NOT change back to the
 *  design-core baseline. Each entry cites the canon SSOT line that is correct.
 *  The gate fails if a NON-listed value diverges, so adding a color to this
 *  list requires evidence — it is a verified fact, not an escape hatch. */
const INTENTIONAL_DIVERGENCES = [
  {
    selector: '[data-portal="research"]',
    token: '--p31-portal-glow',
    reason:
      'Baseline copied quantum\'s glow (oklch 61/0.219/293 ≈ rgb 139,92,246). Canon ships ' +
      'rgba(167,139,250) = #A78BFA, design-core\'s own canonical violet ' +
      '(design-core/src/math/colors.ts:34), which is what research\'s accent resolves to ' +
      '(--p31-accent-violet oklch 65% 0.18 285, theme-store.ts:813; design-core all.css:155). ' +
      'Canon = source-of-truth correction.',
  },
];

const baseline = parse(loadWithImports(BASELINE));
const candidate = parse(readFileSync(CANDIDATE, 'utf8'));

const baseTokens = tokenUnion(baseline);
const candTokens = tokenUnion(candidate);

const missing = [...baseTokens.keys()].filter((t) => !candTokens.has(t));

const baseRoot = baseline.get(':root') ?? new Map();
const candRoot = candidate.get(':root') ?? new Map();

const divergences = [];
const intentional = [];
for (const [selector, vars] of baseline) {
  const cand = candidate.get(selector);
  if (!cand) continue; // context absent from candidate; coverage catches its tokens
  const bVars = new Map([...baseRoot, ...vars]);
  const cVars = new Map([...candRoot, ...cand]);
  for (const [token, value] of vars) {
    if (!cand.has(token)) continue;
    const bResolved = resolveValue(value, bVars);
    const cResolved = resolveValue(cand.get(token), cVars);
    if (valuesEqual(bResolved, cResolved)) continue;
    const known = INTENTIONAL_DIVERGENCES.find((d) => d.selector === selector && d.token === token);
    if (known) {
      intentional.push({ selector, token, baseline: value, candidate: cand.get(token), reason: known.reason });
    } else {
      divergences.push({ selector, token, baseline: value, candidate: cand.get(token) });
    }
  }
}

console.log('token parity — design-core (baseline) vs canon (candidate)\n');
console.log(`  baseline tokens: ${baseTokens.size}`);
console.log(`  candidate tokens: ${candTokens.size}`);
console.log(`  missing from canon: ${missing.length}`);
console.log(`  shared-context divergences: ${divergences.length}`);
console.log(`  intentional (source-of-truth) divergences: ${intentional.length}`);

if (missing.length) {
  console.error('\n❌ MISSING TOKENS (canon cannot replace design-core):');
  for (const t of missing) console.error(`   • ${t}`);
}

if (divergences.length) {
  console.error('\n❌ VALUE DIVERGENCES (would change rendering after the flip):');
  for (const d of divergences) {
    console.error(`   • ${d.selector}  ${d.token}`);
    console.error(`       design-core: ${d.baseline}`);
    console.error(`       canon:       ${d.candidate}`);
  }
}

if (intentional.length) {
  console.log('\nℹ️  INTENTIONAL DIVERGENCES (canon = source of truth; verified):');
  for (const d of intentional) {
    console.log(`   • ${d.selector}  ${d.token}`);
    console.log(`       design-core: ${d.baseline}`);
    console.log(`       canon:       ${d.candidate}`);
    console.log(`       why: ${d.reason}`);
  }
}

if (missing.length || divergences.length) {
  console.error('\n❌ PARITY FAILED — canon is not yet a drop-in for design-core.');
  process.exit(1);
}

console.log('\n✅ PARITY OK — canon is a drop-in for design-core.');
