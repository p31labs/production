#!/usr/bin/env node
/**
 * V2-run-all-gates.mjs — P31 design-workflow v2.0 full-suite runner.
 *
 * Composes the v2.0 lanes into one executable suite:
 *   GREEN gates (exit 0 required):  C ci-gate (v1.0 aggregate + DTCG shape +
 *                                   cross-target parity) + D multi-brand validator
 *                                   + D APCA self-check.
 *   AUDIT stage (findings, reported): D resilience scan, D APCA theme scoring,
 *                                   D multi-brand --strict (real canon drift F1).
 * Exits 0 only if every GREEN gate passes. Audit findings are reported with
 * their exit codes — they are findings to fix, not gate failures.
 *
 * Zero deps. Node 24 ESM. Run from the design-workflow/ directory.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const C = join(ROOT, 'V2-C-ci');
const D = join(ROOT, 'V2-D-designv2');
const results = [];
let failures = 0;

function run(label, cmd, args, opts = {}) {
  let exit = 0, out = '';
  try {
    out = execFileSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    exit = e.status ?? 1;
    out = (e.stdout ?? '') + (e.stderr ?? '');
  }
  const pass = opts.audit ? true : exit === (opts.expect ?? 0);
  if (!pass) failures++;
  results.push({ label, pass, exit, note: opts.audit ? 'AUDIT' : '' });
  return { exit, out };
}

console.log('═══ P31 design-workflow — v2.0 full suite ═══\n');

// ── GREEN gates ───────────────────────────────────────────────────
run('C ci-gate (v1.0 aggregate + DTCG shape + parity)', 'node', ['ci-gate.mjs'], { cwd: C });
run('D multi-brand validator (11 themes / 243 overrides)', 'node', ['validates.mjs'], { cwd: D });
run('D APCA self-check (official test-suite values)', 'node', ['apca.mjs', '--selfcheck'], { cwd: D });

// ── AUDIT stage (findings, non-blocking for the suite exit) ───────
run('D resilience scan (findings audit)', 'node', ['resilience-scan.mjs'], { cwd: D, audit: true, expect: 1 });
run('D APCA theme scoring (cipher, findings audit)', 'node', ['apca.mjs', '--score'], { cwd: D, audit: true, expect: 1 });
run('D multi-brand --strict (real canon drift F1 audit)', 'node', ['validates.mjs', '--strict'], { cwd: D, audit: true, expect: 1 });

console.log('\n— SUITE SUMMARY —');
for (const r of results) console.log(`${r.note ? 'AUDIT' : r.pass ? 'PASS ' : 'FAIL '}  ${r.label}  (exit ${r.exit})`);
console.log(`\nRESULT: ${failures === 0 ? 'ALL GREEN GATES PASS' : `${failures} GREEN GATE(S) FAILED`} (audit findings are separate)`);
process.exit(failures === 0 ? 0 : 1);