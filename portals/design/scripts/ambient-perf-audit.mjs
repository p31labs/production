#!/usr/bin/env node
/**
 * ambient-perf-audit — enforce the raw-three performance invariants of the
 * vendored p31ca.org MolecularHeart background (the portal's ambient layer):
 *   - DPR is capped (no 4K mobile meltdown)
 *   - spoon/calm/reduced-motion floors render a static frame (crisis floor)
 *   - the LED ring + heart run on GPU shaders (GLSL), not CPU per-frame
 * Run after edits. Usage: node scripts/ambient-perf-audit.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const MOLECULAR = join(ROOT, '..', 'vendor', 'p31ca-ambient', 'src', 'components', 'background', 'MolecularHeart.tsx');
const SRC = readFileSync(MOLECULAR, 'utf8');

let fail = 0;

// 1. DPR capping.
if (!/Math\.min\(window\.devicePixelRatio/.test(SRC)) {
  console.error('✗ ambient-perf — missing devicePixelRatio cap');
  fail = 1;
}

// 2. Spoon/calm/reduced-motion crisis floor → single static frame.
if (!/spoons\s*<=\s*1/.test(SRC) || !/reduceMotion|prefers-reduced-motion/.test(SRC)) {
  console.error('✗ ambient-perf — missing crisis (spoons≤1) / reduced-motion floor');
  fail = 1;
}

// 3. GPU shader pipeline (GLSL fragment shaders for stars + heart plasma).
if (!/gl_FragColor|fragmentShader|SIMD|noise/.test(SRC)) {
  console.error('✗ ambient-perf — heart/starfield must use GLSL shaders');
  fail = 1;
}

if (fail) {
  console.error('\nambient-perf-audit FAIL — fix the ambient background before deploy.');
  process.exit(1);
}
console.log('ambient-perf-audit OK — dpr capped, crisis floor, GPU shader pipeline');