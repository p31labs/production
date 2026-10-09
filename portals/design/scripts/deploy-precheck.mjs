#!/usr/bin/env node
/**
 * deploy-precheck — refuse to deploy if the design portal's gate fails.
 *
 * The active enforcement layer for the design portal. The GitHub workflow
 * (p31-production.yml) exists but the repo has no remote, so CI never runs —
 * this runs at the deploy machine, which is where the deploy actually happens.
 *
 * Runs the same steps as `pnpm gate`, individually, so the failing step is
 * named. A HUNG gate is a FAILURE, not a pass (timeout wrapper). --skip-precheck
 * bypasses for emergencies only, and logs loudly when used.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DESIGN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = process.argv.includes('--skip-precheck');
const TIMEOUT = 600_000; // 10m — full gate incl. Playwright

if (SKIP) {
  console.warn('⚠  deploy-precheck: --skip-precheck — gate bypassed (emergency only)');
  process.exit(0);
}

const steps = ['typecheck', 'lint', 'test', 'build:pwa', 'v:gate'];
for (const s of steps) {
  try {
    execSync(`pnpm ${s}`, { cwd: DESIGN_DIR, stdio: 'inherit', timeout: TIMEOUT });
  } catch (e) {
    const timedOut = typeof e.code === 'string' && e.code.includes('ETIMEDOUT');
    console.error(`\n✗ deploy-precheck: pnpm ${s} ${timedOut ? 'TIMED OUT (treat as failure)' : 'failed'} — deploy refused.`);
    process.exit(1);
  }
}

// Structural layout gate — the AUTHORITATIVE check. DOM-based, deterministic,
// catches gross layout breaks (full-width topbar, no clipping, no overflow)
// that pixel-diff baselines structurally cannot (they bake in regressions via
// --update-snapshots). Starts its own preview (build:pwa already built dist).
import { spawn } from 'node:child_process';
const preview = spawn('npx', ['vite', 'preview', '--port', '5190', '--strictPort'], { cwd: DESIGN_DIR, stdio: 'ignore', detached: true });
try {
  await new Promise((r) => setTimeout(r, 4000));
  execSync(
    `node /home/p31/production/tools/design-parity/layout-invariants.mjs http://localhost:5190`,
    { cwd: DESIGN_DIR, stdio: 'inherit', timeout: 60_000 },
  );
} catch (e) {
  console.error('\n✗ deploy-precheck: layout-invariants failed — a gross layout break (topbar width/clipping/overflow) was detected. Fix before deploy.');
  process.exit(1);
} finally {
  preview.kill('SIGKILL');
}
console.log('✓ deploy-precheck: structural layout gate passed');

// Fork gate — consume-don't-fork: no token forks (raw values, self-cycles) and
// no component duplicates of the canon. tokens.css/ambient.css are the
// documented Wave-B adapter debt; Topbar is grandfathered pending P7b.
try {
  execSync(
    'node /home/p31/production/tools/canon-audit/canon-source-audit.mjs --target /home/p31/production/portals/design/src --allow production/portals/design/src/tokens.css,production/portals/design/src/surfaces/ambient.css,production/portals/design/src/components/Topbar.tsx',
    { cwd: DESIGN_DIR, stdio: 'inherit', timeout: 60_000 },
  );
} catch {
  console.error('\n✗ deploy-precheck: canon-source-audit failed — a fork (token or component) was detected. Consume from @p31ca/design-core, do not re-define.');
  process.exit(1);
}
console.log('✓ deploy-precheck: fork gate passed');

// The remaining BLOCKING gates registered in tests/acceptance/gates.json —
// token discipline + baseline governance. Previously registered but never
// invoked (furniture); now enforced here.
for (const gate of [
  ['token-audit', 'node /home/p31/production/packages/design-core/scripts/token-audit.mjs'],
  ['canon-purity', 'node /home/p31/production/packages/design-core/scripts/canon-purity.mjs'],
  ['image-distinctness', 'node tests/acceptance/check-image-distinctness.mjs'],
  ['acceptance-ratchet', 'node tests/acceptance/ratchet.mjs 5'],
]) {
  const [name, cmd] = gate;
  try {
    execSync(cmd, { cwd: DESIGN_DIR, stdio: 'inherit', timeout: 120_000 });
    console.log(`✓ deploy-precheck: ${name} passed`);
  } catch {
    console.error(`\n✗ deploy-precheck: ${name} failed — deploy refused.`);
    process.exit(1);
  }
}

// Positive confirmation — the meta-gate proves every BLOCKING gate can fail
// AND is wired into the pipeline (presence, not just no-failure).
try {
  execSync('node tests/acceptance/gate-self-test.mjs', { cwd: DESIGN_DIR, stdio: 'inherit', timeout: 300_000 });
} catch {
  console.error('\n✗ deploy-precheck: gate-self-test failed — a BLOCKING gate is furniture (cannot fail or not wired). Deploy refused.');
  process.exit(1);
}
console.log('✓ deploy-precheck: positive confirmation (all BLOCKING gates present + can fail)');

console.log('✓ deploy-precheck: design gate passed');