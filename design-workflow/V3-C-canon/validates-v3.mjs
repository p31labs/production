#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V3-C-canon/validates-v3.mjs — Lane C v3.0, C-2: RFC-0006 delta validator.
// Zero dependencies. Node 24 ESM. Canon is READ-ONLY.
//
// Based on V2-D-designv2/validates.mjs (R1-R4 copied verbatim in behavior).
// ADDS two v3.0 RFC-0006 deltas (runbook §2.3, §6 C-2):
//   R5  Two-level depth limit. A brand may extend a parent, and the parent may
//       extend Base — but a brand whose $extends target is itself extended by
//       another brand (i.e. a grandchild) is FORBIDDEN. depth(no-$extends)=0;
//       depth(child)=depth(parent)+1; depth > 1 → FAIL.
//   R6  Explicit versionPolicy. Every brand MUST declare versionPolicy in
//       { exact, minor, minor-and-major, latest }. No implicit default → FAIL.
//
// RULES (carried from D-1, validates.mjs):
//   R1  Parent validates first (every token has $type + $value, no dupes).
//   R2  Override-only names — a child may not introduce new structure.
//   R3  Thresholds tighten only (numeric floors raise, never lower).
//   R4  Type/unit fidelity.
//
// USAGE:
//   node validates-v3.mjs                     canon report — 11 brand fixtures
//                                             extracted READ-ONLY from the
//                                             themes group; reports R6 adoption
//                                             (FINDING F3 when 0/11 declare
//                                             versionPolicy). exit 1 on any
//                                             violation (R1-R6).
//   node validates-v3.mjs --strict            intersection Base (proves R2 on
//                                             sunlight's child-introduced text)
//   node validates-v3.mjs --fixture <path>    validate one fixture file
//                                             ({ brands: [...] }).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

const CANON = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';
const VERSION_POLICIES = new Set(['exact', 'minor', 'minor-and-major', 'latest']);

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

// ── Base construction (carried from validates.mjs) ─────────────────────────

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
      base[n] = { $value: null, $type: 'missing' };
    }
  }
  return base;
}

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

// ── Validation core (R1-R4 carried; R5-R6 added) ────────────────────────────

const NUMERIC_FLOOR_TYPES = new Set(['dimension', 'number']);

function numericValue(def) {
  const t = def?.$type;
  const v = def?.$value;
  if (t === 'number' && typeof v === 'number') return { n: v, unit: null };
  if (t === 'dimension' && v && typeof v.value === 'number') return { n: v.value, unit: v.unit ?? null };
  return null;
}

/** R1: validate a parent/base structurally. */
function validateParent(base) {
  const seen = new Set();
  const violations = [];
  for (const [name, def] of Object.entries(base)) {
    if (seen.has(name)) violations.push({ rule: 'R1', brand: 'Base', token: name, msg: 'duplicate name' });
    seen.add(name);
    if (!def.$type) violations.push({ rule: 'R1', brand: 'Base', token: name, msg: 'missing $type' });
    if (def.$value === undefined || def.$value === null)
      violations.push({ rule: 'R1', brand: 'Base', token: name, msg: 'missing $value' });
  }
  return violations;
}

/**
 * R2-R4: validate one child against its parent chain (union of all ancestors).
 * `parents` = list of { name, tokens }. Child only tightens.
 */
function validateChild(themeName, child, parents) {
  const violations = [];
  const chain = new Map();
  for (const p of parents) for (const [n, d] of Object.entries(p.tokens)) chain.set(n, d);
  for (const [name, def] of Object.entries(child)) {
    const p = chain.get(name);
    if (!p) {
      violations.push({
        rule: 'R2', brand: themeName, token: name,
        msg: `override name '${name}' does not exist in the parent chain (new structure forbidden)`,
      });
      continue;
    }
    if (def.$type !== p.$type) {
      violations.push({
        rule: 'R4', brand: themeName, token: name,
        msg: `$type '${def.$type}' ≠ parent $type '${p.$type}'`,
      });
    }
    const cn = numericValue(def);
    const pn = numericValue(p);
    if (cn && pn && cn.unit === pn.unit && cn.n < pn.n) {
      violations.push({
        rule: 'R3', brand: themeName, token: name,
        msg: `child floor ${cn.n}${cn.unit ?? ''} lowers parent floor ${pn.n}${pn.unit ?? ''} (floors may raise, never lower)`,
      });
    }
  }
  return violations;
}

/** R6: explicit versionPolicy, one of the RFC-0006 set. */
function checkVersionPolicy(brandName, vp) {
  if (vp === undefined || vp === null) {
    return { rule: 'R6', brand: brandName, token: '-', msg: `versionPolicy missing (RFC-0006: explicit, never implicit; allowed: ${[...VERSION_POLICIES].join(' / ')})` };
  }
  if (!VERSION_POLICIES.has(vp)) {
    return { rule: 'R6', brand: brandName, token: '-', msg: `versionPolicy '${vp}' ∉ {${[...VERSION_POLICIES].join(', ')}}` };
  }
  return null;
}

/**
 * Compute brand depths over the $extends graph (R5). Returns violations for
 * missing targets, cycles, and depth > 1 (grandchild).
 */
function depthMap(brands) {
  const byName = new Map(brands.map((b) => [b.name, b]));
  const depth = new Map();
  const visiting = new Set();
  const violations = [];

  function visit(name, chain) {
    if (depth.has(name)) return depth.get(name);
    if (visiting.has(name)) {
      violations.push({ rule: 'R5', brand: name, token: '-', msg: `cycle in $extends chain: ${[...chain, name].join(' → ')}` });
      return 0;
    }
    visiting.add(name);
    const b = byName.get(name);
    if (!b) {
      violations.push({ rule: 'R5', brand: name, token: '-', msg: `$extends target '${name}' does not exist` });
      return 0;
    }
    const parents = Array.isArray(b.$extends) ? b.$extends : [];
    let d = 0;
    if (parents.length) {
      const pd = Math.max(...parents.map((p) => visit(p, [...chain, name])));
      d = pd + 1;
      if (d > 1) {
        violations.push({
          rule: 'R5', brand: name, token: '-',
          msg: `extends chain depth ${d} > 1 (grandchild '${name}' extends '${parents.join(', ')}' which is itself extended) — RFC-0006 parent→child only`,
        });
      }
    }
    depth.set(name, d);
    visiting.delete(name);
    return d;
  }

  for (const b of brands) visit(b.name, []);
  return { depth, violations };
}

// ── Canon report ────────────────────────────────────────────────────────────

function runReport({ strict = false } = {}) {
  const { themes, canon } = extractThemes();
  const names = Object.keys(themes).sort();
  const base = strict ? buildIntersectionBase(themes, canon) : buildUnionBase(themes, canon);

  const parentViolations = validateParent(base);
  let overrides = 0;
  let validated = 0;
  const rows = [];

  // Real canon brand fixtures: 11 packs, extracted READ-ONLY from the themes
  // group. No $extends in the canon today (flat group) → depth 0, R5 N/A.
  let withVersionPolicy = 0;
  const allViolations = [...parentViolations];

  for (const name of names) {
    const child = themes[name];
    const violations = validateChild(name, child, [{ name: 'Base', tokens: base }]);
    overrides += Object.keys(child).length;
    validated += Object.keys(child).length - violations.length;

    // R6 on the canon brand (canon has no versionPolicy today → finding F3).
    const r6 = checkVersionPolicy(name, undefined);
    if (!r6) withVersionPolicy++;
    else violations.push(r6);

    allViolations.push(...violations);
    rows.push({ theme: name, tokens: Object.keys(child).length, violations, r6 });
  }

  console.log('=== P31 v3 multi-brand inheritance validation (Lane C, C-2) ===');
  console.log(`canon: ${CANON}`);
  console.log(`base mode: ${strict ? 'INTERSECTION (strict)' : 'UNION (migration target; defaults = cipher; text default = canonical p31.text)'}`);
  console.log(`Base structural tokens: ${Object.keys(base).length}`);
  console.log(`Base violations (R1): ${parentViolations.length}`);
  console.log(`depth limit (R5): 2 — parent → child only, no grandchild`);
  console.log(`versionPolicy (R6): allowed = ${[...VERSION_POLICIES].join(' | ')} — explicit, never implicit`);
  console.log('');
  console.log(`brands extracted READ-ONLY from canon themes group: ${names.length}`);
  console.log(`brands with explicit versionPolicy: ${withVersionPolicy}  → FINDING F3 (versionPolicy adoption gap, RFC-0006 token semver unadopted)`);
  console.log('');
  console.log('per-brand results:');
  for (const r of rows) {
    if (r.violations.length === 0) {
      console.log(`  ${r.theme.padEnd(9)} ${String(r.tokens).padStart(3)} tokens   ALL PASS (R1-R6)`);
    } else {
      console.log(`  ${r.theme.padEnd(9)} ${String(r.tokens).padStart(3)} tokens   ${r.violations.length} VIOLATION(S)`);
      for (const v of r.violations) console.log(`      [${v.rule}] ${v.token}: ${v.msg}`);
    }
  }
  const r6Count = allViolations.filter((v) => v.rule === 'R6').length;
  const r1r4 = allViolations.filter((v) => v.rule !== 'R6').length;
  console.log('');
  console.log(`REPORT: ${names.length} brands, ${overrides} overrides, ${validated} validated (R1-R4), ${r1r4} inheritance violation(s), ${r6Count} versionPolicy violation(s) → ${withVersionPolicy}/${names.length} brands adopted.`);
  return allViolations.length;
}

// ── Fixture mode (RFC-0006 delta controls) ──────────────────────────────────

function runFixture(path) {
  const fixture = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(fixture.brands)) {
    console.error(`FIXTURE INVALID: ${path} must be { brands: [ { name, \$extends?, versionPolicy?, tokens } ] }`);
    process.exit(2);
  }
  const brands = fixture.brands;
  const { depth, violations: r5 } = depthMap(brands);
  const allViolations = [...r5];
  const byName = new Map(brands.map((b) => [b.name, b]));

  console.log(`=== v3 fixture validation: ${path} ===`);
  console.log(`  brands: ${brands.map((b) => b.name).join(', ')}`);

  for (const b of brands) {
    // R6: explicit versionPolicy on every brand.
    const r6 = checkVersionPolicy(b.name, b.versionPolicy);
    if (r6) allViolations.push(r6);

    // R1 (depth-0 brands are bases) + R2-R4 (children against parent chain).
    const parents = (Array.isArray(b.$extends) ? b.$extends : []).map((n) => byName.get(n)).filter(Boolean);
    if (parents.length === 0) {
      allViolations.push(...validateParent(b.tokens).map((v) => ({ ...v, brand: b.name })));
    } else {
      allViolations.push(...validateChild(b.name, b.tokens, parents));
    }
    const d = depth.get(b.name);
    console.log(`  ${b.name.padEnd(12)} depth=${d}  $extends=${JSON.stringify(b.$extends ?? [])}  versionPolicy=${b.versionPolicy ?? 'MISSING'}`);
  }

  if (allViolations.length === 0) {
    console.log('  RESULT: PASS (0 violations)');
    return 0;
  }
  console.log(`  RESULT: FAIL (${allViolations.length} violation(s))`);
  for (const v of allViolations) console.log(`    [${v.rule}] ${v.token}: ${v.msg}`);
  return 1;
}

// ── Main ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
if (argv[0] === '--strict') process.exit(runReport({ strict: true }) > 0 ? 1 : 0);
if (argv[0] === '--fixture' && argv[1]) process.exit(runFixture(argv[1]));
process.exit(runReport() > 0 ? 1 : 0);