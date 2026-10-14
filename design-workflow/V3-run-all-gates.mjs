#!/usr/bin/env node
/**
 * V3-run-all-gates.mjs — P31 design-workflow v3.0 full-suite runner.
 *
 * GREEN gates (exit 0 required):  Lane B drift-parity/surface/deploy/tiers,
 *   Lane C validator-positive + patched-canon audit, Lane D policy
 *   schema/scan positives + migration.
 * NEGATIVE controls (MUST fail):  the RFC-0006 / policy / drift fixtures.
 * AUDIT stage (report-only):      real-canon drift + adoption findings.
 *
 * Zero deps. Node 24 ESM. Run from the design-workflow/ directory.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const B = join(ROOT, 'V3-B-mcp');
const C = join(ROOT, 'V3-C-canon');
const D = join(ROOT, 'V3-D-resilience');
const AUDIT = join(ROOT, '..', 'packages', 'design-core', 'scripts', 'token-audit.mjs');
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
  const pass = opts.audit ? true : (opts.mustFail ? exit !== 0 : exit === 0);
  if (!pass) failures++;
  results.push({ label, pass, exit, note: opts.audit ? 'AUDIT' : opts.mustFail ? 'NC' : '' });
  if (!pass && !opts.audit) console.log(`--- ${label} ---\n${out.split('\n').slice(-5).join('\n')}`);
  return { exit, out };
}

console.log('═══ P31 design-workflow — v3.0 full suite ═══\n');

// ── Lane B: MCP canonical surface ─────────────────────────────────
run('B drift parity (match fixtures)', 'node', ['drift-detector.mjs', 'fixtures/registry-match.ts', 'fixtures/dispatch-match.ts'], { cwd: B });
run('B drift NEG (mismatch fixtures MUST fail)', 'node', ['drift-detector.mjs', 'fixtures/registry-mismatch.ts', 'fixtures/dispatch-mismatch.ts'], { cwd: B, mustFail: true });
run('B surface check (5 tools)', 'node', ['surface-check.mjs'], { cwd: B });
run('B deploy artifact check', 'node', ['deploy-check.mjs'], { cwd: B });
run('B tier adapters (node:test)', 'node', ['--test', 'mcp-tiers.test.mjs'], { cwd: B });

// ── Lane C: canon adoption ────────────────────────────────────────
run('C validator positive (parent+child, both versionPolicy)', 'node', ['validates-v3.mjs', '--fixture', 'fixtures/pos-parent-child.fixture.json'], { cwd: C });
run('C NEG depth (3-level chain MUST fail)', 'node', ['validates-v3.mjs', '--fixture', 'fixtures/neg-three-level.fixture.json'], { cwd: C, mustFail: true });
run('C NEG versionPolicy (missing MUST fail)', 'node', ['validates-v3.mjs', '--fixture', 'fixtures/neg-no-versionpolicy.fixture.json'], { cwd: C, mustFail: true });
run('C patched-canon audit (F1+F2 applied, temp copy)', 'node', [AUDIT], { cwd: join(C, 'fixtures', 'canon-copy') });

// ── Lane D: resilience policy ─────────────────────────────────────
run('D policy schema positive (5 types)', 'node', ['policy-validate.mjs', 'fixtures/d1-pos-all-policy-types.fixture.json'], { cwd: D });
run('D NEG policy schema (alpha>1 MUST fail)', 'node', ['policy-validate.mjs', 'fixtures/d1-neg-alpha-max-over1.fixture.json'], { cwd: D, mustFail: true });
run('D policy-scan positive (policy-shaped clean)', 'node', ['policy-scan.mjs', '--fixture', 'fixtures/d2-pos-policy-shaped-all-rules.fixture.json'], { cwd: D });
run('D migration (70 → 0, guarded by before===70)', 'node', ['migration-test.mjs'], { cwd: D });

// ── AUDIT stage (report-only, real-canon findings) ────────────────
run('AUDIT B drift vs real canon (17-vs-13 finding)', 'node', ['drift-detector.mjs'], { cwd: B, audit: true });
run('AUDIT C versionPolicy adoption (0/11 finding)', 'node', ['validates-v3.mjs'], { cwd: C, audit: true });
run('AUDIT D policy scan vs canon (70 findings)', 'node', ['policy-scan.mjs'], { cwd: D, audit: true });

console.log('\n— SUITE SUMMARY —');
for (const r of results) console.log(`${r.note === 'AUDIT' ? 'AUDIT' : r.note === 'NC' ? 'NEG ' : r.pass ? 'PASS ' : 'FAIL '}  ${r.label}  (exit ${r.exit})`);
console.log(`\nRESULT: ${failures === 0 ? 'ALL GREEN GATES PASS; NEGATIVE CONTROLS FAIL AS DESIGNED' : `${failures} GATE(S) FAILED`} (audit findings are separate)`);
process.exit(failures === 0 ? 0 : 1);