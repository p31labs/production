#!/usr/bin/env node
/**
 * V6-run-all-gates.mjs — P31 design-workflow v6.0 full-suite runner.
 *
 * = V5 suite (embedded) + Lane B firmware gates + Lane C task gate +
 *   Lane D compliance gates.
 *
 * Zero deps. Node 24 ESM. Run from the design-workflow/ directory.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const B = join(ROOT, 'V6-B-firmware');
const C = join(ROOT, 'V6-C-taskgate');
const D = join(ROOT, 'V6-D-adoption');
const FW = '/home/p31/P31-local-workspace/firmware/node-zero';
const results = [];
let failures = 0;

function run(label, cmd, args, opts = {}) {
  let exit = 0, out = '';
  try {
    out = execFileSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000 });
  } catch (e) {
    exit = e.status ?? 1;
    out = (e.stdout ?? '') + (e.stderr ?? '');
  }
  const pass = opts.audit ? true : (opts.mustFail ? exit !== 0 : exit === 0);
  if (!pass) failures++;
  results.push({ label, pass, exit, note: opts.audit ? 'AUDIT' : opts.mustFail ? 'NC' : '' });
  if (!pass && !opts.audit) console.log(`--- ${label} ---\n${out.split('\n').slice(-6).join('\n')}`);
  return { exit, out };
}

console.log('═══ P31 design-workflow — v6.0 full suite ═══\n');

// ── V5 suite (whole thing) ────────────────────────────────────────
run('V5 full suite (embedded)', 'node', ['V5-run-all-gates.mjs'], { cwd: ROOT });

// ── Lane B: firmware gates ────────────────────────────────────────
run('B hex-gate (0 lv_color_hex in p31_ui.c)', 'node', [join(B, 'hex-gate.mjs')], { cwd: FW });
run('B contract-gate (/api/status route + 6 fields)', 'node', [join(B, 'contract-gate.mjs')], { cwd: FW });
run('B theme-dropin grep (17 P31_COLOR_ defines)', 'bash', ['-c', `test "$(grep -c P31_COLOR_ ${FW}/main/p31_ui.c)" -ge 17 && test "$(grep -c lv_color_hex ${FW}/main/p31_ui.c)" -eq 0`], { cwd: ROOT });
run('B build artifact (p31-node-zero.bin exists)', 'bash', ['-c', `test -f ${FW}/build/p31-node-zero.bin && test "$(stat -c%s ${FW}/build/p31-node-zero.bin)" -gt 1000000`], { cwd: ROOT });

// ── Lane C: task-completion gate ──────────────────────────────────
run('C task gate positive (3/3 tasks)', 'node', ['task-completion.mjs', '--positive'], { cwd: C });
run('C task gate NEG (forbidden action MUST fail)', 'node', ['task-completion.mjs', '--negative'], { cwd: C, mustFail: true });

// ── Lane D: adoption gates ────────────────────────────────────────
run('D compliance NEG (planted violations MUST flag)', 'node', ['compliance-scan.mjs', '--fixtures'], { cwd: D });
run('D compliance baseline (168 flagged, report written)', 'node', ['compliance-scan.mjs'], { cwd: D });
run('D baseline json (4 signals)', 'bash', ['-c', `node -e "const b=require('${D}/adoption-baseline.json'); const s=Object.keys(b.signals||{}); if(s.length<4)process.exit(1); console.log('signals:',s.join(','))"`], { cwd: ROOT });

console.log('\n— SUITE SUMMARY —');
for (const r of results) console.log(`${r.note === 'AUDIT' ? 'AUDIT' : r.note === 'NC' ? 'NEG ' : r.pass ? 'PASS ' : 'FAIL '}  ${r.label}  (exit ${r.exit})`);
console.log(`\nRESULT: ${failures === 0 ? 'ALL GREEN GATES PASS; NEGATIVE CONTROLS FAIL AS DESIGNED' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);