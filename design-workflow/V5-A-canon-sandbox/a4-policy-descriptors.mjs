// V5-A-canon-sandbox/a4-policy-descriptors.mjs — Lane A v5.0, A-4.
// Applies the P5–P9 policy descriptors to the SANDBOX canon copy.
//
// Reuse discipline (runbook A-4): migration-test.mjs EXPORTS applyRewrites
// (P5–P8, on every scanner-flagged token); applyP9 is NOT exported, so it is
// REPLICATED here verbatim (names list + TINT_BOUNDS from migration-test.mjs
// :74-153). policy-scan.mjs exports scan/flattenP31; policy-validate.mjs
// exports validateFile — imported, not modified. The migration test's own
// BEFORE assertion (70 findings) is re-verified here on the full rehearsed
// canon (post-F1/F2/A-3).
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyRewrites } from '/home/p31/production/design-workflow/V3-D-resilience/migration-test.mjs';
import { scan, flattenP31 } from '/home/p31/production/design-workflow/V3-D-resilience/policy-scan.mjs';
import { validateFile } from '/home/p31/production/design-workflow/V3-D-resilience/policy-validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKENS = join(HERE, 'tokens', 'tokens.dtc.json');

/** P9 replica — elevation tint descriptors (migration-test.mjs:74-153, unexported). */
const TINT_BOUNDS = { min: 0.03, max: 0.15 };
function locate(root, path) {
  const segs = path.split('.');
  let node = root;
  for (const seg of segs) {
    if (!node || typeof node !== 'object' || !(seg in node)) return undefined;
    node = node[seg];
  }
  return node;
}
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

const doc = JSON.parse(readFileSync(TOKENS, 'utf8'));
const before = scan(flattenP31(doc));
const count = (fs, rule) => fs.filter((f) => f.rule === rule).length;
console.log('=== A-4 policy descriptors (sandbox copy — canon READ-ONLY upstream) ===');
console.log(`BEFORE: ${before.length} finding(s) — [A]${count(before, 'A')} [B]${count(before, 'B')} [C]${count(before, 'C')} [D]${count(before, 'D')}`);

const { patched, applied, findings } = applyRewrites(doc);
const p9 = applyP9(patched);
console.log(`rewrites applied: P5-P8 on ${applied}/${findings.length} flagged tokens; P9 on ${p9} elevation tints`);

writeFileSync(TOKENS, JSON.stringify(patched, null, 2) + '\n');
copyFileSync(TOKENS, join(HERE, 'tokens', 'tokens.json')); // mirror stays in sync

const after = scan(flattenP31(patched));
console.log(`AFTER:  ${after.length} finding(s)`);
for (const f of after) console.log(`  STILL FLAGGED ${f.token}: ${f.detail}`);

const val = validateFile(patched);
console.log(`descriptor validation: ${val.descriptors} descriptors, ${val.valid} valid, ${val.invalidCount} invalid`);
for (const i of val.invalid) console.log(`  INVALID ${i.token}: ${i.errors.join('; ')}`);

const ok = after.length === 0 && val.invalidCount === 0 && before.length === 70;
console.log(ok ? 'A-4 RESULT: PASS — 0 findings on sandbox; all descriptors valid' : 'A-4 RESULT: FAIL');
process.exit(ok ? 0 : 1);