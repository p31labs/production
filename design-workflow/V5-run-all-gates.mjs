#!/usr/bin/env node
/**
 * V5-run-all-gates.mjs — P31 design-workflow v5.0 full-suite runner.
 *
 * = V4 suite (embedded) + Lane A sandbox gates + Lane B rehearsal gates +
 *   Lane C baseline check.
 *
 * Zero deps. Node 24 ESM. Run from the design-workflow/ directory.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = dirname(fileURLToPath(import.meta.url));
const A = join(ROOT, 'V5-A-canon-sandbox');
const B = join(ROOT, 'V5-B-mcp-local');
const C = join(ROOT, 'V5-C-closeloop');
const B3 = join(ROOT, 'V3-B-mcp');
const V3C = join(ROOT, 'V3-C-canon');
const V3D = join(ROOT, 'V3-D-resilience');
const results = [];
let failures = 0;

function run(label, cmd, args, opts = {}) {
  let exit = 0, out = '';
  try {
    out = execFileSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
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

console.log('═══ P31 design-workflow — v5.0 full suite ═══\n');

// ── V4 suite (whole thing) ────────────────────────────────────────
run('V4 full suite (embedded)', 'node', ['V4-run-all-gates.mjs'], { cwd: ROOT });

// ── Lane A: canon rehearsal sandbox ───────────────────────────────
run('A sandbox policy-scan (0 findings)', 'node', [join(V3D, 'policy-scan.mjs'), '--fixture', 'fixtures/sandbox-policy-scan.fixture.json'], { cwd: A });
run('A sandbox validates-v3 (R1-R6 pass)', 'node', [join(V3C, 'validates-v3.mjs'), '--fixture', 'fixtures/sandbox-brands-union.fixture.json'], { cwd: A });
run('A sandbox token-audit', 'node', ['/home/p31/production/packages/design-core/scripts/token-audit.mjs'], { cwd: join(A, 'tokens') });
run('A NEG F1 re-added (MUST fail)', 'node', [join(V3C, 'validates-v3.mjs'), '--fixture', 'fixtures/neg-F1-readded.fixture.json'], { cwd: A, mustFail: true });
run('A NEG versionPolicy removed (MUST fail)', 'node', [join(V3C, 'validates-v3.mjs'), '--fixture', 'fixtures/neg-no-versionpolicy.fixture.json'], { cwd: A, mustFail: true });

// A replay: pristine canon → patches → deltas → byte-identical to sandbox
{
  const tmp = join(tmpdir(), 'opencode-v5-suite-replay');
  mkdirSync(tmp, { recursive: true });
  const f = join(tmp, 'ordered.json');
  copyFileSync('/home/p31/production/packages/canon/tokens/tokens.dtc.json', f);
  const p1 = run('A replay: apply F1+F2 to pristine copy', 'node', [join(V3C, 'canon-diff/apply-patches.mjs'), f, join(V3C, 'canon-diff/C3-F1-sunlight-text.patch.json'), join(V3C, 'canon-diff/C3-F2-extensions-themes-equals-11.patch.json')], { cwd: ROOT });
  const p2 = run('A replay: apply governance+policy deltas', 'node', [join(A, 'operator-apply-deltas.mjs'), f], { cwd: ROOT });
  const h1 = createHash('sha256').update(readFileSync(f)).digest('hex');
  const h2 = createHash('sha256').update(readFileSync(join(A, 'tokens', 'tokens.dtc.json'))).digest('hex');
  const same = p1.exit === 0 && p2.exit === 0 && h1 === h2;
  if (!same) failures++;
  results.push({ label: `A replay byte-identity (${h1.slice(0, 10)}… == sandbox ${h2.slice(0, 10)}…)`, pass: same, exit: same ? 0 : 1, note: '' });
  rmSync(tmp, { recursive: true, force: true });
}

// ── Lane B: MCP rehearsal receipts ────────────────────────────────
run('B drift rehearsal (patched mirror → 17=17)', 'node', [join(B3, 'drift-detector.mjs'), join(B, '.neg-tmp/mirror/packages/design-core/src/mcp/tool-registry.ts'), join(B, '.neg-tmp/mirror/packages/design-core/src/mcp/tools.worker.ts')], { cwd: ROOT });
run('B drift NEG (pristine dispatch MUST fail)', 'node', [join(B3, 'drift-detector.mjs'), join(B, '.neg-tmp/mirror/packages/design-core/src/mcp/tool-registry.ts'), '/home/p31/production/packages/design-core/src/mcp/tools.worker.ts'], { cwd: ROOT, mustFail: true });

// ── Lane C: baseline ──────────────────────────────────────────────
{
  const ok = existsSync(join(C, 'baseline.json')) && existsSync(join(C, 'close-the-loop.md'));
  const b = ok ? JSON.parse(readFileSync(join(C, 'baseline.json'), 'utf8')) : null;
  const canonHash = ok ? createHash('sha256').update(readFileSync('/home/p31/production/packages/canon/tokens/tokens.dtc.json')).digest('hex') : '';
  const baselineMatches = ok && b.canon['tokens.dtc.json.sha256'] === canonHash;
  const pass = ok && baselineMatches;
  if (!pass) failures++;
  results.push({ label: `C baseline present + canon drift-check (${ok ? (baselineMatches ? 'in-baseline' : 'DRIFT vs baseline') : 'missing'})`, pass, exit: pass ? 0 : 1, note: '' });
}

console.log('\n— SUITE SUMMARY —');
for (const r of results) console.log(`${r.note === 'AUDIT' ? 'AUDIT' : r.note === 'NC' ? 'NEG ' : r.pass ? 'PASS ' : 'FAIL '}  ${r.label}  (exit ${r.exit})`);
console.log(`\nRESULT: ${failures === 0 ? 'ALL GREEN GATES PASS; NEGATIVE CONTROLS FAIL AS DESIGNED' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);