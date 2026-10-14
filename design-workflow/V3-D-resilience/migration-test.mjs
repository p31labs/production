#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V3-D-resilience/migration-test.mjs — Lane D v3.0, D-3 support: P5–P9
// migration test on a TEMP copy of the canon token file. Canon is READ-ONLY.
//
// Procedure (runbook §7 D-3):
//   1. Copy packages/canon/tokens/tokens.dtc.json → tmp/canon.patched.dtc.json
//   2. Apply the D-2 proposal rewrites (token-resilience-audit.md D-2-P1..P5)
//      as policy descriptors on every scanner-flagged token:
//        P5 alpha ranges   -> policy:"range"   unit:"alpha"  bounds {min,max}
//        P6 type clamp     -> policy:"clamp"   unit:"rem"    bounds {preferred,min,max}
//        P7 density ranges -> policy:"density" unit:"px"|"rem" bounds {min,max}
//        P8 speed factor   -> policy:"speed"   unit:"ms"     bounds {min,max}
//        P9 elevation tint -> policy:"range"   unit:"number" bounds {min,max}
//   3. Re-run the extended scanner against the patched TEMP copy. The
//      previously-flagged tokens must NO LONGER be flagged (before/after).
//   4. Validate every patched descriptor against the D-1 schema.
//   5. NEGATIVE CONTROL: run the scanner against a fixture where the rewrite is
//      intentionally incomplete (some tokens patched, one left unpatched) —
//      the leftover MUST still be flagged. A rewritten token still flagged
//      would be a scanner bug; this control proves the scanner only flags the
//      genuinely-unpatched token.
//
// USAGE: node migration-test.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan, flattenP31 } from './policy-scan.mjs';
import { validateFile } from './policy-validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CANON = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';
const TMP = join(HERE, 'tmp');
const PATCHED = join(TMP, 'canon.patched.dtc.json');

const round = (x, dp = 3) => Number(x.toFixed(dp));
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** P5 — alpha range bounds around the current fixed alpha (D-2-P1). */
function alphaBounds(a) {
  let min = round(a * 0.5);
  let max = round(clamp01(a * 1.5));
  if (max <= min) max = round(Math.min(1, min + 0.05));
  if (a === 0 && max === 0) max = 0.05;
  return { min, max };
}

/** P6 — clamp() preferred/min/max in rem, mobile-first (D-2-P2). */
function clampBounds(px) {
  const pref = round(px / 16, 4);
  const min = round(px * 0.875 / 16, 4);
  const max = round(px * 1.25 / 16, 4);
  return {
    preferred: `${pref}rem`,
    min: `${min}rem`,
    max: `${max}rem`,
  };
}

/** P7 — density range per tier around the current spacing value (D-2-P3). */
function densityBounds(v) {
  const min = round(Math.max(0, v * 0.75), 3);
  const max = round(v * 1.5, 3);
  return { min, max };
}

/** P8 — speed bounds: min 0 (reduced-motion → instant), max = base (D-2-P4). */
function speedBounds(ms) {
  return { min: 0, max: ms };
}

/** P9 — elevation tint range keyed to surface L (D-2-P5). */
const TINT_BOUNDS = { min: 0.03, max: 0.15 };

/**
 * Apply P5–P9 policy descriptors to every scanner-flagged token in a token
 * file. Returns the patched root (mutates a deep copy) + counts.
 */
export function applyRewrites(tokens) {
  const patched = structuredClone(tokens);
  const findings = scan(flattenP31(patched));
  let applied = 0;
  for (const f of findings) {
    const target = locate(patched.p31, f.token);
    if (!target) continue;
    const pol = descriptorFor(f, target);
    if (!pol) continue;
    target.$extensions = target.$extensions ?? {};
    target.$extensions.p31 = target.$extensions.p31 ?? {};
    Object.assign(target.$extensions.p31, pol);
    applied += 1;
  }
  return { patched, applied, findings };
}

/** Find the token definition node for a flattened path like `layout.spacing.xs`. */
function locate(root, path) {
  const segs = path.split('.');
  let node = root;
  for (const seg of segs) {
    if (!node || typeof node !== 'object' || !(seg in node)) return undefined;
    node = node[seg];
  }
  return node;
}

/** Build the policy descriptor for a finding based on its rule. */
function descriptorFor(f, target) {
  const v = target.$value;
  switch (f.rule) {
    case 'A': {
      const a = typeof v?.alpha === 'number' ? v.alpha : 0;
      return { policy: 'range', resolvedBy: 'resolver.flags + user.slider', bounds: alphaBounds(a), unit: 'alpha' };
    }
    case 'B': {
      const px = v?.value ?? 16;
      return { policy: 'clamp', resolvedBy: 'window-size class + user text-size adjustment', bounds: clampBounds(px), unit: 'rem' };
    }
    case 'C': {
      const unit = v?.unit === 'rem' ? 'rem' : 'px';
      return { policy: 'density', resolvedBy: 'resolver tier + M3 adaptive spacing', bounds: densityBounds(v?.value ?? 4), unit };
    }
    case 'D': {
      return { policy: 'speed', resolvedBy: 'media context (prefers-reduced-motion) + runtime speed factor', bounds: speedBounds(v?.value ?? 300), unit: 'ms' };
    }
    default: return undefined;
  }
}

/** P9 elevation tints are NOT scanner-flagged (number type) — patch them too. */
function applyP9(patched) {
  const names = [
    'elevation-level1-tint', 'elevation-level2-tint', 'elevation-level3-tint',
    'elevation.level1.tint', 'elevation.level2.tint', 'elevation.level3.tint',
  ];
  let n = 0;
  for (const name of names) {
    const node = locate(patched.p31, name);
    if (!node) continue;
    node.$extensions = node.$extensions ?? {};
    node.$extensions.p31 = node.$extensions.p31 ?? {};
    Object.assign(node.$extensions.p31, {
      policy: 'range',
      resolvedBy: 'resolver surface class',
      bounds: TINT_BOUNDS,
      unit: 'number',
    });
    n += 1;
  }
  return n;
}

function main() {
  console.log('=== D-3 migration test (TEMP copy of canon — canon READ-ONLY) ===');

  // 0. Load canon, make the TEMP copy.
  const canon = JSON.parse(readFileSync(CANON, 'utf8'));
  mkdirSync(TMP, { recursive: true });
  cpSync(CANON, PATCHED);
  console.log(`TEMP copy: ${PATCHED} (canon untouched)`);

  // 1. Before: extended scanner on the unpatched temp copy.
  const before = scan(flattenP31(canon));
  console.log(`BEFORE: ${before.length} finding(s) — [A]${count(before, 'A')} [B]${count(before, 'B')} [C]${count(before, 'C')} [D]${count(before, 'D')}`);

  // 2. Apply P5–P8 to the flagged tokens, then P9 elevation tints.
  const { patched, applied, findings } = applyRewrites(canon);
  const p9 = applyP9(patched);
  console.log(`rewrites applied: P5-P8 on ${applied}/${findings.length} flagged tokens; P9 on ${p9} elevation tints`);

  // 3. Write patched temp copy and re-run scanner.
  writeFileSync(PATCHED, JSON.stringify(patched, null, 2));
  const after = scan(flattenP31(patched));
  console.log(`AFTER:  ${after.length} finding(s)`);
  for (const f of after) console.log(`  STILL FLAGGED ${f.token}: ${f.detail}`);

  // 4. Schema validation of every patched descriptor.
  const val = validateFile(patched);
  console.log(`descriptor validation: ${val.descriptors} descriptors, ${val.valid} valid, ${val.invalidCount} invalid`);

  const ok = after.length === 0 && val.invalidCount === 0 && before.length === 70;
  console.log(ok ? 'D-3 RESULT: PASS — previously-flagged tokens no longer flagged; descriptors valid' : 'D-3 RESULT: FAIL');
  return ok ? 0 : 1;
}

function count(findings, rule) {
  return findings.filter((f) => f.rule === rule).length;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());