#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V2-D-designv2/validates.mjs — Lane D v2.0, D-1: multi-brand inheritance
// validator. Zero dependencies. Node 24 ESM. Canon is READ-ONLY.
//
// Formalizes the canon's top-level `themes` group (11 packs, flat per-pack
// p31.* overrides) as RFC-0006-style inheritance:
//
//   Base  (23 structural token names, defaults = live theme `cipher`;
//          the 23rd name `text` exists only in `sunlight` and defaults to the
//          canonical p31.text value — see multi-brand-schema.md finding F1)
//     └─ per-brand override files (one per theme pack, extracted READ-ONLY)
//
// RULES (RFC-0006 shape, runbook §2.8 / §7 D-1):
//   R1  Parent validates first. Base must be structurally sound: every token
//       carries $type + $value, no duplicate names.
//   R2  Override-only names. A child may override tokens that exist in the
//       parent chain; it may NOT introduce new structure (names).
//   R3  Thresholds tighten only. For numeric tokens (dimension with matching
//       unit, or number), the child value must be >= the parent floor.
//       Floors can raise, never lower. Non-numeric types (color hue swaps,
//       fontFamily lists) are exempt — documented in multi-brand-schema.md.
//   R4  Type/unit fidelity. A child override must keep the parent's $type
//       (and unit, for dimensions).
//
// USAGE:
//   node validates.mjs                 main report (union Base) — exit 0 clean
//   node validates.mjs --strict        intersection Base: proves R2 catches
//                                      sunlight's extra `text` token (canon
//                                      drift — contribution proposal F1)
//   node validates.mjs --fixture <path>   validate one fixture child file
//                                      against Base; exit 1 on violations
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

const CANON = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';

// ── Canon extraction (READ-ONLY) ────────────────────────────────────────────

function loadCanon() {
  return JSON.parse(readFileSync(CANON, 'utf8'));
}

/** themes.<name>.p31.* → flat map { tokenName: {$value, $type} }. */
function extractThemePack(pack) {
  const out = {};
  for (const [name, def] of Object.entries(pack.p31 ?? {})) {
    out[name] = { $value: def.$value, $type: def.$type };
  }
  return out;
}

/** 11 brand override sets, READ-ONLY, straight from the canon themes group. */
function extractThemes() {
  const canon = loadCanon();
  const themes = {};
  for (const [name, pack] of Object.entries(canon.themes)) {
    themes[name] = extractThemePack(pack);
  }
  return { themes, canon };
}

// ── Base construction ───────────────────────────────────────────────────────

/**
 * Union Base: every name present in ANY theme pack. Defaults come from the
 * live theme `cipher`; `text` (sunlight-only) defaults to the canonical
 * p31.text top-level token value — the only legitimate canonical default.
 */
function buildUnionBase(themes, canon) {
  const names = new Set();
  for (const pack of Object.values(themes)) for (const n of Object.keys(pack)) names.add(n);
  const base = {};
  for (const n of names) {
    if (n in themes.cipher) {
      base[n] = { $value: themes.cipher[n].$value, $type: themes.cipher[n].$type };
    } else if (n === 'text' && canon.p31?.text) {
      base[n] = { $value: canon.p31.text.$value, $type: canon.p31.text.$type };
    } else {
      // Unreachable given the canon, but fail closed rather than guess.
      base[n] = { $value: null, $type: 'missing' };
    }
  }
  return base;
}

/** Intersection Base (--strict): names present in ALL packs. */
function buildIntersectionBase(themes, canon) {
  const packs = Object.values(themes);
  const common = packs
    .map((p) => new Set(Object.keys(p)))
    .reduce((acc, s) => new Set([...acc].filter((n) => s.has(n))));
  return buildUnionBase(
    Object.fromEntries(
      Object.entries(themes).map(([k, v]) => [k, Object.fromEntries([...common].map((n) => [n, v[n]]).filter(([, d]) => d))]),
    ),
    canon,
  );
}

// ── Validation core ─────────────────────────────────────────────────────────

const NUMERIC_FLOOR_TYPES = new Set(['dimension', 'number']);

/** Numeric floor of a token value, or null when not a comparable number. */
function numericValue(def) {
  const t = def?.$type;
  const v = def?.$value;
  if (t === 'number' && typeof v === 'number') return { n: v, unit: null };
  if (t === 'dimension' && v && typeof v.value === 'number') return { n: v.value, unit: v.unit ?? null };
  return null;
}

/** Validate Base itself (R1). Returns list of violations. */
function validateParent(base) {
  const seen = new Set();
  const violations = [];
  for (const [name, def] of Object.entries(base)) {
    if (seen.has(name)) violations.push({ rule: 'R1', theme: 'Base', token: name, msg: 'duplicate name' });
    seen.add(name);
    if (!def.$type) violations.push({ rule: 'R1', theme: 'Base', token: name, msg: 'missing $type' });
    if (def.$value === undefined || def.$value === null)
      violations.push({ rule: 'R1', theme: 'Base', token: name, msg: 'missing $value' });
  }
  return violations;
}

/** Validate one child against the parent chain. Returns violations. */
function validateChild(themeName, child, parent) {
  const violations = [];
  for (const [name, def] of Object.entries(child)) {
    const p = parent[name];
    // R2: override-only names — no new structure in children.
    if (!p) {
      violations.push({
        rule: 'R2', theme: themeName, token: name,
        msg: `override name '${name}' does not exist in the parent chain (new structure forbidden)`,
      });
      continue;
    }
    // R4: type fidelity.
    if (def.$type !== p.$type) {
      violations.push({
        rule: 'R4', theme: themeName, token: name,
        msg: `$type '${def.$type}' ≠ parent $type '${p.$type}'`,
      });
    }
    // R3: numeric floors tighten only (child >= parent).
    const cn = numericValue(def);
    const pn = numericValue(p);
    if (cn && pn && cn.unit === pn.unit) {
      if (cn.n < pn.n) {
        violations.push({
          rule: 'R3', theme: themeName, token: name,
          msg: `child floor ${cn.n}${cn.unit ?? ''} lowers parent floor ${pn.n}${pn.unit ?? ''} (floors may raise, never lower)`,
        });
      }
    }
  }
  return violations;
}

// ── Reporting ───────────────────────────────────────────────────────────────

function runReport({ strict = false } = {}) {
  const { themes, canon } = extractThemes();
  const names = Object.keys(themes).sort();
  const base = strict ? buildIntersectionBase(themes, canon) : buildUnionBase(themes, canon);

  const parentViolations = validateParent(base);
  let overrides = 0;
  let validated = 0;
  const rows = [];

  for (const name of names) {
    const child = themes[name];
    const violations = validateChild(name, child, base);
    overrides += Object.keys(child).length;
    validated += Object.keys(child).length - violations.length;
    rows.push({ theme: name, tokens: Object.keys(child).length, violations });
  }

  console.log('=== P31 multi-brand inheritance validation (D-1) ===');
  console.log(`canon: ${CANON}`);
  console.log(`base mode: ${strict ? 'INTERSECTION (strict)' : 'UNION (migration target)'}`);
  console.log(`Base structural tokens: ${Object.keys(base).length}`);
  console.log(`Base violations (R1): ${parentViolations.length}`);
  if (parentViolations.length) for (const v of parentViolations) console.log(`  [R1] ${v.token}: ${v.msg}`);
  console.log('');
  console.log('per-theme results:');
  for (const r of rows) {
    if (r.violations.length === 0) {
      console.log(`  ${r.theme.padEnd(9)} ${String(r.tokens).padStart(3)} overrides  ALL PASS`);
    } else {
      console.log(`  ${r.theme.padEnd(9)} ${String(r.tokens).padStart(3)} overrides  ${r.violations.length} VIOLATION(S)`);
      for (const v of r.violations) console.log(`      [${v.rule}] ${v.token}: ${v.msg}`);
    }
  }
  const totalViolations = rows.reduce((n, r) => n + r.violations.length, 0) + parentViolations.length;
  console.log('');
  console.log(`REPORT: ${names.length} themes, ${overrides} overrides, ${validated} validated, ${totalViolations} violation(s).`);
  return totalViolations;
}

// ── Fixture mode (negative controls) ────────────────────────────────────────

function runFixture(path) {
  const { themes, canon } = extractThemes();
  const base = buildUnionBase(themes, canon);
  const fixture = JSON.parse(readFileSync(path, 'utf8'));
  if (!fixture.name || typeof fixture.tokens !== 'object') {
    console.error(`FIXTURE INVALID: ${path} must be { name, extends, tokens }`);
    process.exit(2);
  }
  const violations = validateChild(fixture.name, fixture.tokens, base);
  console.log(`=== fixture validation: ${path} ===`);
  console.log(`  name: ${fixture.name}  extends: ${JSON.stringify(fixture.extends ?? [])}`);
  console.log(`  tokens: ${Object.keys(fixture.tokens).length}`);
  if (violations.length === 0) {
    console.log('  RESULT: PASS (0 violations)');
    return 0;
  }
  console.log(`  RESULT: FAIL (${violations.length} violation(s))`);
  for (const v of violations) console.log(`    [${v.rule}] ${v.token}: ${v.msg}`);
  return 1;
}

// ── Main ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
if (argv[0] === '--strict') process.exit(runReport({ strict: true }) > 0 ? 1 : 0);
if (argv[0] === '--fixture' && argv[1]) process.exit(runFixture(argv[1]));
process.exit(runReport() > 0 ? 1 : 0);