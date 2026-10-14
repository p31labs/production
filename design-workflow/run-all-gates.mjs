#!/usr/bin/env node
/**
 * run-all-gates.mjs — P31 design-workflow aggregate gate runner (Phase 2).
 *
 * Contract: exits 0 ONLY if
 *   (1) every lane's positive gate passes, AND
 *   (2) every negative control fails as designed (a gate that cannot fail is furniture).
 *
 * Zero deps. Node 24 ESM. Run from the design-workflow/ directory.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const A = join(ROOT, 'A-token-pipeline');
const B = join(ROOT, 'B-device-tiers');
const C = join(ROOT, 'C-mobile-audit');
const D = join(ROOT, 'D-embedded');

const results = [];
let failures = 0;

function run(label, cmd, args, opts = {}, expectExit = 0, expectFail = false) {
  let exit = 0;
  let out = '';
  try {
    out = execFileSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    exit = e.status ?? 1;
    out = (e.stdout ?? '') + (e.stderr ?? '');
  }
  const ok = expectFail ? (exit !== 0) : (exit === expectExit);
  const status = ok ? 'PASS' : 'FAIL';
  if (!ok) failures++;
  results.push({ label, status, exit, note: expectFail ? `expected failure — got exit ${exit}` : `exit ${exit}` });
  if (!ok) console.log(`--- ${label} output tail ---\n${out.split('\n').slice(-6).join('\n')}`);
  return { exit, out };
}

console.log('═══ P31 design-workflow — aggregate gates ═══\n');

// ── Lane A: token pipeline ────────────────────────────────────────
run('A build+parity+budget (7 gates)', 'node', ['run-gates.mjs'], { cwd: A });

// ── Lane B: device tiers ──────────────────────────────────────────
run('B resolver suite (13 assertions)', 'node', ['--test', 'device-tiers.test.mjs'], { cwd: B });
run('B negative control (sabotaged resolver MUST fail)', 'node', ['--test', 'negative-control.mjs'], { cwd: B }, 1, true);

// ── Lane C: mobile-first audit ────────────────────────────────────
run('C audit: good fixture', 'node', ['mobile-first-audit.mjs', 'fixtures/good.css', '--label', 'good'], { cwd: C });
run('C audit: bad fixture MUST fail', 'node', ['mobile-first-audit.mjs', 'fixtures/bad.css', '--label', 'bad'], { cwd: C }, 1, true);
run('C audit: Lane A css-mobile tokens', 'node', ['mobile-first-audit.mjs', join(A, 'dist/css-mobile/tokens.mobile.css'), '--label', 'css-mobile'], { cwd: C });
if (existsSync('/usr/bin/chromium')) {
  run('C dom-check: bad page MUST fail (320px, media neutralized)', 'node', ['dom-check.mjs'], { cwd: C }, 1, true);
} else {
  results.push({ label: 'C dom-check (chromium)', status: 'SKIP', exit: '-', note: 'no system chromium' });
}

// ── Lane D: embedded tier ─────────────────────────────────────────
run('D budget gate (real)', 'node', ['embedded-budget.mjs'], { cwd: D });
run('D budget gate: oversized fixture MUST fail', 'node', ['embedded-budget.mjs', 'fixtures', join(D, 'dist/p31_theme.h')], { cwd: D }, 1, true);

// D generator fail-closed: plant a deprecated token in a temp copy of color-map.json,
// expect exit 1, then restore the real map (fail closed, no silent corruption).
{
  const mapPath = join(D, 'color-map.json');
  const bak = readFileSync(mapPath, 'utf8');
  const sabotaged = bak.replace(/"themes\.cipher\.p31\.[^"]+"/, '"p31.surface-s1"');
  if (sabotaged !== bak) {
    writeFileSync(mapPath, sabotaged);
    run('D generator fail-closed: deprecated token MUST fail', 'node', ['gen-p31-theme.mjs'], { cwd: D }, 1, true);
    writeFileSync(mapPath, bak);
  } else {
    results.push({ label: 'D generator fail-closed', status: 'FAIL', exit: '-', note: 'could not plant sabotage token (map shape changed?)' });
    failures++;
  }
}

console.log('\n— GATE SUMMARY —');
for (const r of results) console.log(`${r.status.padEnd(4)} ${r.label}  (${r.note})`);
console.log(`\nRESULT: ${failures === 0 ? 'ALL GATES PASS' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);