#!/usr/bin/env node
/**
 * V4-run-all-gates.mjs — P31 design-workflow v4.0 full-suite runner.
 *
 * = V3 suite (green gates + NEG controls + audits)
 * + Lane D v4.0: interaction-state gate (good PASS / bad MUST FAIL / served-UI audit)
 * + handoff-artifact integrity (verify + negative control)
 *
 * Zero deps. Node 24 ESM. Run from the design-workflow/ directory.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const D4 = join(ROOT, 'V4-D-design-ci');
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
  if (!pass && !opts.audit) console.log(`--- ${label} ---\n${out.split('\n').slice(-6).join('\n')}`);
  return { exit, out };
}

console.log('═══ P31 design-workflow — v4.0 full suite ═══\n');

// ── V3 suite (whole thing, single green gate) ─────────────────────
run('V3 full suite (B+C+D green gates, NEG controls, audits)', 'node', ['V3-run-all-gates.mjs'], { cwd: ROOT });

// ── Lane D v4.0: Design CI boundary ───────────────────────────────
run('D interaction-state good fixture', 'node', ['interaction-state.mjs', 'fixtures/interaction-good.html'], { cwd: D4 });
run('D interaction-state NEG (no author states MUST fail)', 'node', ['interaction-state.mjs', 'fixtures/interaction-bad.html'], { cwd: D4, mustFail: true });
run('AUDIT D interaction-state served UI (0 interactive)', 'node', ['interaction-state.mjs', join(ROOT, 'D-embedded/ui/index.html')], { cwd: D4, audit: true });
run('D handoff integrity verify', 'node', ['handoff-integrity.mjs'], { cwd: D4 });
run('D handoff integrity NEG (temporary removal MUST be detected)', 'node', ['handoff-integrity.mjs', '--neg', 'V3-B-mcp/wrangler.toml'], { cwd: D4 });

console.log('\n— SUITE SUMMARY —');
for (const r of results) console.log(`${r.note === 'AUDIT' ? 'AUDIT' : r.note === 'NC' ? 'NEG ' : r.pass ? 'PASS ' : 'FAIL '}  ${r.label}  (exit ${r.exit})`);
console.log(`\nRESULT: ${failures === 0 ? 'ALL GREEN GATES PASS; NEGATIVE CONTROLS FAIL AS DESIGNED' : `${failures} GATE(S) FAILED`} (audit findings are separate)`);
process.exit(failures === 0 ? 0 : 1);