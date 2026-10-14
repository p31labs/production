#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V3-D-resilience/policy-validate.mjs — Lane D v3.0, D-1 support: policy
// descriptor shape validator. Zero dependencies. Node 24 ESM.
//
// Runbook §7 D-1 + §8 policy-schema gate: a token's `$extensions.p31` node may
// carry a policy descriptor — the constraint + resolution surface for POLICY
// tokens (color-with-alpha, type-scale, spacing, motion duration). This
// validator is the ONE source of truth for what a valid descriptor is:
// `policy-scan.mjs` (D-2) imports `validatePolicy` so a "policy-shaped" token
// is exactly one that passes here.
//
// Descriptor shape (see policy-schema.md §2):
//   $extensions.p31 = {
//     policy: "range"|"clamp"|"density"|"speed",
//     resolvedBy: string,
//     bounds: { min, max }                 | range/density/speed
//           | { preferred, min, max }      | clamp  (all rem strings)
//     unit: "alpha"|"number"|"px"|"rem"|"ms"
//   }
//
// USAGE:
//   node policy-validate.mjs --descriptor '<json>'   validate one descriptor
//   node policy-validate.mjs <token-file.json>       validate every descriptor
//                                                    in a token file
//   node policy-validate.mjs --fixture <path>        alias of the above
//
// Exit 0 = all descriptors valid (or none present); exit 1 = any invalid.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

const POLICIES = new Set(['range', 'clamp', 'density', 'speed']);
const REM_RE = /^(\d+(?:\.\d+)?)rem$/;

/**
 * Validate a single policy descriptor object (the `$extensions.p31` node's
 * policy part). Returns { ok, errors: string[] }.
 */
export function validatePolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return { ok: false, errors: ['policy descriptor must be an object'] };
  }
  if (!POLICIES.has(policy.policy)) {
    errors.push(`policy must be one of range|clamp|density|speed (got ${JSON.stringify(policy.policy)})`);
  }
  if (typeof policy.resolvedBy !== 'string' || policy.resolvedBy.trim() === '') {
    errors.push('resolvedBy must be a non-empty string');
  }
  if (typeof policy.unit !== 'string' || policy.unit.trim() === '') {
    errors.push('unit must be a non-empty string');
  }
  const unit = policy.unit;
  const b = policy.bounds;

  // ── range: numeric min/max; alpha bounded 0..1, number >= 0 ───────────────
  if (policy.policy === 'range') {
    if (!['alpha', 'number'].includes(unit)) errors.push(`range unit must be "alpha" or "number" (got ${JSON.stringify(unit)})`);
    if (!b || typeof b !== 'object' || !isFinite(b.min) || !isFinite(b.max)) {
      errors.push('range bounds must be { min: number, max: number }');
    } else {
      if (unit === 'alpha' && (b.min < 0 || b.max > 1)) {
        errors.push(`alpha range bounds must satisfy 0 <= min <= max <= 1 (got min=${b.min}, max=${b.max})`);
      }
      if (unit === 'number' && (b.min < 0)) errors.push(`number range min must be >= 0 (got ${b.min})`);
      if (b.min > b.max) errors.push(`range bounds min (${b.min}) must be <= max (${b.max})`);
    }
  }

  // ── clamp: preferred/min/max as rem strings; min <= preferred <= max ───────
  if (policy.policy === 'clamp') {
    if (unit !== 'rem') errors.push(`clamp unit must be "rem" (got ${JSON.stringify(unit)})`);
    if (!b || typeof b !== 'object') {
      errors.push('clamp bounds must be { preferred: "Xrem", min: "Yrem", max: "Zrem" }');
    } else {
      for (const key of ['preferred', 'min', 'max']) {
        if (typeof b[key] !== 'string' || !REM_RE.test(b[key])) {
          errors.push(`clamp bounds.${key} must be a rem string like "1.25rem" (got ${JSON.stringify(b[key])})`);
        }
      }
      if (typeof b.preferred === 'string' && REM_RE.test(b.preferred) &&
          typeof b.min === 'string' && REM_RE.test(b.min) &&
          typeof b.max === 'string' && REM_RE.test(b.max)) {
        const p = parseFloat(b.preferred), lo = parseFloat(b.min), hi = parseFloat(b.max);
        if (!(lo <= p && p <= hi)) {
          errors.push(`clamp bounds must satisfy min (${b.min}) <= preferred (${b.preferred}) <= max (${b.max})`);
        }
      }
    }
  }

  // ── density: numeric min/max px/rem; min >= 0, min <= max ──────────────────
  if (policy.policy === 'density') {
    if (!['px', 'rem'].includes(unit)) errors.push(`density unit must be "px" or "rem" (got ${JSON.stringify(unit)})`);
    if (!b || typeof b !== 'object' || !isFinite(b.min) || !isFinite(b.max)) {
      errors.push('density bounds must be { min: number, max: number }');
    } else {
      if (b.min < 0) errors.push(`density min must be >= 0 (got ${b.min})`);
      if (b.min > b.max) errors.push(`density bounds min (${b.min}) must be <= max (${b.max})`);
    }
  }

  // ── speed: numeric min/max ms; min >= 0, min <= max ────────────────────────
  if (policy.policy === 'speed') {
    if (unit !== 'ms') errors.push(`speed unit must be "ms" (got ${JSON.stringify(unit)})`);
    if (!b || typeof b !== 'object' || !isFinite(b.min) || !isFinite(b.max)) {
      errors.push('speed bounds must be { min: number, max: number } in ms');
    } else {
      if (b.min < 0) errors.push(`speed min must be >= 0 (got ${b.min})`);
      if (b.min > b.max) errors.push(`speed bounds min (${b.min}) must be <= max (${b.max})`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate the policy descriptor carried by one token definition (may be
 * absent). The descriptor is the token's `$extensions.p31` node itself — the
 * runbook §7 D-1 example puts `policy`, `resolvedBy`, `bounds`, `unit` directly
 * on `p31` (alongside existing keys such as `themes`). Presence is signalled by
 * the `policy` key; validatePolicy ignores unrelated sibling keys.
 */
export function validateTokenPolicy(def) {
  const p31 = def?.$extensions?.p31;
  if (!p31 || typeof p31 !== 'object' || p31.policy === undefined) {
    return { present: false, ok: true, errors: [] };
  }
  const r = validatePolicy(p31);
  return { present: true, ok: r.ok, errors: r.errors };
}

/** Walk a token file and validate every policy descriptor. Returns a report. */
export function validateFile(tokens) {
  const report = { descriptors: 0, valid: 0, invalid: [], invalidCount: 0 };
  (function walk(o, path) {
    if (o === null || typeof o !== 'object' || Array.isArray(o)) return;
    if ('$value' in o) {
      const r = validateTokenPolicy(o);
      if (r.present) {
        report.descriptors += 1;
        if (r.ok) report.valid += 1;
        else {
          report.invalidCount += 1;
          report.invalid.push({ token: path, errors: r.errors });
        }
      }
      return;
    }
    for (const [k, v] of Object.entries(o)) {
      if (k === '$value' || k === '$extensions') continue;
      walk(v, path ? `${path}.${k}` : k);
    }
  })(tokens, '');
  return report;
}

function reportDescriptor(label, res) {
  if (res.ok) {
    console.log(`VALID:   ${label}`);
    return 0;
  }
  console.log(`INVALID: ${label}`);
  for (const e of res.errors) console.log(`  - ${e}`);
  return 1;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--descriptor' && argv[1]) {
    let obj;
    try { obj = JSON.parse(argv[1]); } catch { console.error('cannot parse descriptor JSON'); process.exit(2); }
    process.exit(reportDescriptor(argv[1], validatePolicy(obj)));
  }
  const file = argv[0] === '--fixture' ? argv[1] : argv[0];
  if (file) {
    let tokens;
    try { tokens = JSON.parse(readFileSync(file, 'utf8')); } catch (err) {
      console.error(`cannot read ${file}: ${err.message}`); process.exit(2);
    }
    const root = tokens.tokens ?? tokens;
    const report = validateFile(root);
    console.log(`=== policy descriptor validation: ${file} ===`);
    console.log(`descriptors: ${report.descriptors}  valid: ${report.valid}  invalid: ${report.invalidCount}`);
    for (const i of report.invalid) {
      console.log(`  INVALID ${i.token}:`);
      for (const e of i.errors) console.log(`    - ${e}`);
    }
    if (report.invalidCount === 0) { console.log('RESULT: ALL DESCRIPTORS VALID'); return; }
    console.log(`RESULT: ${report.invalidCount} INVALID DESCRIPTOR(S)`);
    process.exit(1);
  }
  console.log('usage: policy-validate.mjs --descriptor \'<json>\' | <token-file.json>');
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) main();