// V5-A-canon-sandbox/operator-apply-deltas.mjs — Lane A v5.0, A-6 support.
// OPERATOR-READY, parameterized: applies the rehearsed governance + policy
// deltas to ANY target token file (argv[1]). The v5.0 rehearsal ran this exact
// logic on the sandbox (a3-governance.mjs + a4-policy-descriptors.mjs); the
// operator replay against the REAL canon file is the same script, same order.
//
//   node operator-apply-deltas.mjs <tokens.dtc.json>
//
// Steps (identical order to the rehearsed sandbox sequence):
//   1. versionPolicy "minor" on all 11 themes packs (C1-P3, brand-level field —
//      see A3-governance-decision.md). Idempotent.
//   2. P5–P8 policy descriptors via applyRewrites (imported from
//      V3-D-resilience/migration-test.mjs, the D-3-proven implementation).
//   3. P9 elevation-tint descriptors (replica of migration-test.mjs applyP9).
//   4. Re-scan + re-validate; exit 0 only if 0 findings AND all descriptors
//      valid AND 11/11 versionPolicy present.
import { readFileSync, writeFileSync } from 'node:fs';
import { applyRewrites } from '/home/p31/production/design-workflow/V3-D-resilience/migration-test.mjs';
import { scan, flattenP31 } from '/home/p31/production/design-workflow/V3-D-resilience/policy-scan.mjs';
import { validateFile } from '/home/p31/production/design-workflow/V3-D-resilience/policy-validate.mjs';

const target = process.argv[2];
if (!target) { console.error('usage: node operator-apply-deltas.mjs <tokens.dtc.json>'); process.exit(2); }

const doc = JSON.parse(readFileSync(target, 'utf8'));
const themes = doc.themes;
const names = Object.keys(themes).sort();
if (names.length !== 11) { console.error(`expected 11 theme packs, got ${names.length}`); process.exit(1); }

// 1. versionPolicy (idempotent)
let vp = 0;
for (const n of names) {
  const cur = themes[n].versionPolicy;
  if (cur !== undefined && cur !== 'minor') { console.error(`versionPolicy already ${cur} on ${n}`); process.exit(1); }
  if (cur === undefined) { themes[n].versionPolicy = 'minor'; vp++; }
}
console.log(`versionPolicy "minor": ${vp} newly added, ${names.length - vp} already present → ${names.length}/11 total`);

// 2. P5–P8 on every scanner-flagged token
const before = scan(flattenP31(doc));
const { patched, applied, findings } = applyRewrites(doc);
console.log(`P5-P8 rewrites: ${applied}/${findings.length} flagged tokens (before: ${before.length} findings)`);

// 3. P9 elevation tints (replica of migration-test.mjs applyP9 :74-153)
const TINT_BOUNDS = { min: 0.03, max: 0.15 };
const p9Names = ['elevation-level1-tint', 'elevation-level2-tint', 'elevation-level3-tint', 'elevation.level1.tint', 'elevation.level2.tint', 'elevation.level3.tint'];
function locate(root, path) { let node = root; for (const seg of path.split('.')) { if (!node || typeof node !== 'object' || !(seg in node)) return undefined; node = node[seg]; } return node; }
let p9 = 0;
for (const name of p9Names) {
  const node = locate(patched.p31, name);
  if (!node) continue;
  node.$extensions = node.$extensions ?? {};
  node.$extensions.p31 = node.$extensions.p31 ?? {};
  Object.assign(node.$extensions.p31, { policy: 'range', resolvedBy: 'resolver surface class', bounds: TINT_BOUNDS, unit: 'number' });
  p9++;
}
console.log(`P9 elevation tints: ${p9}`);

// 4. Gates: re-scan + validate + write
const after = scan(flattenP31(patched));
const val = validateFile(patched);
const ok = after.length === 0 && val.invalidCount === 0 && vp + (names.length - vp) === names.length;
if (ok) writeFileSync(target, JSON.stringify(patched, null, 2) + '\n');
console.log(`after: ${after.length} findings; descriptors: ${val.descriptors} valid: ${val.valid} invalid: ${val.invalidCount}`);
console.log(ok ? `OPERATOR DELTAS RESULT: PASS — wrote ${target}` : 'OPERATOR DELTAS RESULT: FAIL — target NOT written');
process.exit(ok ? 0 : 1);