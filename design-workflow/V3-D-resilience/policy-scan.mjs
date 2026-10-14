#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V3-D-resilience/policy-scan.mjs — Lane D v3.0, D-2 support: extended token
// resilience scanner. Zero external deps. Node 24 ESM. Canon is READ-ONLY.
//
// Extends the v2.0 scanner (V2-D-designv2/resilience-scan.mjs) — the v2.0
// rules A (fixed-alpha color) and B (fixed-px type scale) are carried, and
// three previously-ignored POLICY categories are added, per runbook §7 D-2:
//
//   RULE A  color-with-alpha lacking a policy descriptor          (21 in canon)
//   RULE B  type-scale px dimension lacking a policy descriptor    (8 in canon)
//   RULE C  spacing dimension lacking a policy descriptor         (25 in canon)
//   RULE D  motion duration lacking a policy descriptor           (16 in canon)
//
// "Lacking" means: no `$extensions.p31.policy` descriptor, OR a descriptor that
// fails the D-1 schema (imported from policy-validate.mjs — ONE source of
// truth). A policy-shaped token (valid descriptor) passes clean.
//
// The one spacing invariant — `space-micro` (4px micro gap, density-stable per
// the D-2 audit) — is FIXED-correct and is not POLICY; it is exempted here.
//
// USAGE:
//   node policy-scan.mjs                          scan canon p31.* (exit 1)
//   node policy-scan.mjs --fixture <path>         scan a fixture token set
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { validateTokenPolicy } from './policy-validate.mjs';

const CANON = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';

// Type-scale token names that must never be fixed px (mobile-first gate).
const TYPE_SCALE_NAMES = new Set(['h1', 'h2', 'h3', 'h4', 'body', 'body-sm', 'label', 'caption']);

// Spacing tokens that are FIXED-correct (density-stable invariants). The D-2
// audit: `space-micro` 4px is the micro gap that must not grow — exempt.
const SPACING_INVARIANTS = new Set(['space-micro']);

// Spacing family: names/paths carrying spacing semantics (D-2-P3 rewrite set).
// Matches `space-*` / `spacing-*` top-level tokens AND the dotted groups
// (`space.inline.*`, `layout.spacing.*` — flattened WITHOUT a leading dot).
function isSpacingToken(name) {
  const segs = name.split('.');
  return (
    segs.some((seg) => seg.startsWith('spacing-')) ||
    segs.some((seg) => seg.startsWith('space-')) ||
    segs.some((seg) => seg === 'spacing') ||
    segs.some((seg) => seg === 'space')
  );
}

/** A token is policy-shaped iff it carries a VALID p31 policy descriptor. */
function hasValidPolicy(def) {
  const r = validateTokenPolicy(def);
  return r.present && r.ok;
}

/** Extended scanner. Returns findings [{rule, category, token, detail}]. */
export function scan(tokens) {
  const findings = [];
  for (const [name, def] of Object.entries(tokens)) {
    const leaf = name.split('.').pop();
    const hasPol = hasValidPolicy(def);

    // RULE A — fixed/unguarded alpha on a user-controllable surface.
    if (def.$type === 'color' && def.$value && typeof def.$value === 'object' && 'alpha' in def.$value) {
      if (!hasPol) {
        findings.push({
          rule: 'A', category: 'color-with-alpha', token: name,
          detail: `alpha ${JSON.stringify(def.$value.alpha)} with no valid policy descriptor — user-controllable surface (glass / transparency slider) breaks the fixed value`,
        });
      }
    }
    // RULE B — fixed-px type scale.
    if (def.$type === 'dimension' && def.$value && def.$value.unit === 'px' && TYPE_SCALE_NAMES.has(leaf)) {
      if (!hasPol) {
        findings.push({
          rule: 'B', category: 'type-scale', token: name,
          detail: `fixed font-size ${def.$value.value}px — breaks user text-size adjustment and adaptive spacing; rewrite as clamp() policy with rem term`,
        });
      }
    }
    // RULE C — spacing dimension (density-adaptive), minus invariants. Any unit:
    // px tokens break per-tier density; rem tokens still need a density range
    // (compact/medium/expanded expressed in rem). D-2-P3 rewrite set.
    if (def.$type === 'dimension' && def.$value && isSpacingToken(name) && !SPACING_INVARIANTS.has(leaf)) {
      if (!hasPol) {
        findings.push({
          rule: 'C', category: 'spacing', token: name,
          detail: `fixed spacing ${def.$value.value}${def.$value.unit} — breaks M3 adaptive density per tier; rewrite as density range resolved via resolver tier`,
        });
      }
    }
    // RULE D — motion duration (user-controlled reduced-motion axis).
    if (def.$type === 'duration' && def.$value && def.$value.unit === 'ms') {
      if (!hasPol) {
        findings.push({
          rule: 'D', category: 'motion-duration', token: name,
          detail: `fixed duration ${def.$value.value}ms — ignores prefers-reduced-motion; rewrite as speed policy (reduced-motion resolves to instant)`,
        });
      }
    }
  }
  return findings;
}

/** Flatten the p31 namespace into { path: def } (skips $value/$extensions interior). */
export function flattenP31(canon) {
  const out = {};
  (function walk(o, path) {
    if (o === null || typeof o !== 'object' || Array.isArray(o)) return;
    if ('$value' in o) {
      out[path] = o;
      return;
    }
    for (const [k, v] of Object.entries(o)) {
      if (k === '$value' || k === '$extensions') continue;
      walk(v, path ? `${path}.${k}` : k);
    }
  })(canon.p31, '');
  return out;
}

function report(findings, label) {
  console.log(`=== policy scan: ${label} ===`);
  if (findings.length === 0) {
    console.log('RESULT: CLEAN (0 findings)');
    return 0;
  }
  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  console.log(`RESULT: ${findings.length} FINDING(S)`);
  console.log('  by rule: ' + Object.entries(byRule).map(([r, n]) => `[${r}] ${n}`).join('  '));
  for (const f of findings) console.log(`  [rule ${f.rule}/${f.category}] ${f.token}: ${f.detail}`);
  return 1;
}

const argv = process.argv.slice(2);
function cli() {
  if (argv[0] === '--fixture' && argv[1]) {
    const fixture = JSON.parse(readFileSync(argv[1], 'utf8'));
    const tokens = {};
    for (const [name, def] of Object.entries(fixture.tokens ?? {})) tokens[name] = def;
    return report(scan(tokens), argv[1]);
  }
  const canon = JSON.parse(readFileSync(CANON, 'utf8'));
  return report(scan(flattenP31(canon)), 'canon p31.* namespace (READ-ONLY)');
}
if (import.meta.url === `file://${process.argv[1]}`) process.exit(cli());