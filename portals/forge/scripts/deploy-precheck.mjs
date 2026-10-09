#!/usr/bin/env node
/**
 * deploy-precheck — refuse to deploy the forge portal if its gate fails.
 *
 * Same enforcement model as the design portal: the GitHub workflow exists but
 * this repo has no remote, so CI never runs — this runs at the deploy machine,
 * which is where the deploy actually happens.
 *
 * Runs the same steps as `pnpm gate` (typecheck/unit/build/system) individually
 * so the failing step is named. A HUNG gate is a FAILURE, not a pass.
 * --skip-precheck bypasses for emergencies only and logs loudly when used.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FORGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = process.argv.includes('--skip-precheck');
const TIMEOUT = 300_000; // 5m — forge gate is lighter than design's (no Playwright run)

if (SKIP) {
  console.warn('⚠  deploy-precheck: --skip-precheck — gate bypassed (emergency only)');
  process.exit(0);
}

const steps = ['typecheck', 'test', 'build', 'layout', 'fork-gate', 'system-test', 'self-test'];

// Layout gate — DOM-geometry structural invariants against the BUILT portal
// (the authoritative layer: catches the clipped-chrome class that pixel diffs
// bake into baselines). Self-managed preview on 5180; left alone if already up.
import { spawn } from 'node:child_process';
const LAYOUT_GATE = '/home/p31/production/tools/design-parity/layout-invariants.mjs';
const ROUTES = '/,/catalog,/playground,/identity,/compose,/activity,/channels';
function isPreviewUp() {
  try { execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5180/', { timeout: 5000 }); return true; }
  catch { return false; }
}
function runLayout() {
  const base = 'http://localhost:5180';
  let owned = null;
  if (!isPreviewUp()) {
    owned = spawn('npx', ['vite', 'preview', '--port', '5180', '--strictPort'], { cwd: FORGE_DIR, stdio: 'ignore', detached: true });
    let tries = 0;
    while (!isPreviewUp() && tries++ < 20) execSync('sleep 0.5');
    if (!isPreviewUp()) throw new Error('layout gate: preview not reachable on :5180');
  }
  try { execSync(`node ${LAYOUT_GATE} ${base} --routes ${ROUTES}`, { cwd: FORGE_DIR, stdio: 'inherit', timeout: 120_000 }); }
  finally { if (owned) owned.kill('SIGKILL'); }
}

for (const s of steps) {
  try {
    if (s === 'layout') runLayout();
    else if (s === 'fork-gate') execSync('node /home/p31/production/tools/canon-audit/canon-source-audit.mjs --target /home/p31/production/portals/forge/src', { cwd: FORGE_DIR, stdio: 'inherit', timeout: 60_000 });
    // self-test = positive confirmation: proves every BLOCKING gate can fail
    // AND is wired into the pipeline (presence, not just no-failure).
    else if (s === 'self-test') execSync('node tests/acceptance/gate-self-test.mjs', { cwd: FORGE_DIR, stdio: 'inherit', timeout: 180_000 });
    else execSync(`pnpm ${s}`, { cwd: FORGE_DIR, stdio: 'inherit', timeout: TIMEOUT });
  } catch (e) {
    const timedOut = typeof e.code === 'string' && e.code.includes('ETIMEDOUT');
    console.error(`\n✗ deploy-precheck: ${s} ${timedOut ? 'TIMED OUT (treat as failure)' : 'failed'} — deploy refused.`);
    process.exit(1);
  }
}

// Visual gate — visual parity vs the canon (design.p31ca.org) + anti-slop
// judge. Runs PRE-DEPLOY against a local preview of THIS build (not the
// deployed URL — a post-deploy gate would only catch drift after it shipped).
// Refuses deploy if the forge drifted from the design system.
const preview = spawn('npx', ['vite', 'preview', '--port', '5180', '--strictPort'], {
  cwd: FORGE_DIR,
  stdio: 'ignore',
  detached: true,
});
try {
  // Wait for the preview to accept connections.
  await new Promise((r) => setTimeout(r, 4000));
  execSync(
    `node /home/p31/production/tools/design-parity/visual-gate.mjs --candidate http://localhost:5180 --skip-screenshot`,
    { cwd: FORGE_DIR, stdio: 'inherit', timeout: 120_000 },
  );
} catch (e) {
  console.error('\n✗ deploy-precheck: visual-gate failed — deploy refused (forge drifted from canon).');
  process.exit(1);
} finally {
  preview.kill('SIGKILL');
}

// Dependency hygiene — Knip flags unused deps/files. NOT blocking: @p31ca/ui is
// intentionally present awaiting the shell-swap (Step 3). But a SURPRISE unused
// dep (anything beyond @p31ca/ui) is a WARNING — log it loudly so the deploy
// operator sees it. Fix a report with only @p31ca/ui unused is the steady state.
try {
  // knip exits non-zero when it finds issues; we still want its JSON stdout.
  const out = execSync('npx knip --reporter json', { cwd: FORGE_DIR, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] });
  const report = JSON.parse(out);
  const issues = report?.issues ?? [];
  const unusedDeps = issues
    .flatMap((i) => [...(i.dependencies ?? []), ...(i.devDependencies ?? [])])
    .map((d) => d?.name)
    .filter(Boolean);
  const surprise = unusedDeps.filter((d) => d !== '@p31ca/ui');
  if (surprise.length > 0) {
    console.warn(`⚠ deploy-precheck: UNUSED DEPENDENCIES beyond the canon (@p31ca/ui): ${surprise.join(', ')} — run \`pnpm clean:deps\` (npx knip --fix).`);
  } else if (unusedDeps.length === 0) {
    console.log('knip: no unused dependencies');
  } else {
    console.log('knip: only @p31ca/ui unused (expected — canon awaiting shell-swap)');
  }
} catch (e) {
  // knip exits non-zero when it finds issues — parse its captured stdout.
  const stdout = e.stdout?.toString();
  if (stdout) {
    try {
      const report = JSON.parse(stdout);
      const issues = report?.issues ?? [];
      const deps = issues.flatMap((i) => [...(i.dependencies ?? []), ...(i.devDependencies ?? [])]).map((d) => d?.name).filter(Boolean);
      const surprise = deps.filter((d) => d !== '@p31ca/ui');
      if (surprise.length > 0) console.warn(`⚠ deploy-precheck: UNUSED DEPENDENCIES beyond the canon (@p31ca/ui): ${surprise.join(', ')}`);
      else console.log('knip: only @p31ca/ui unused (expected — canon awaiting shell-swap)');
    } catch {
      console.log('knip: non-zero (observational)');
    }
  } else {
    console.log('knip: non-zero (observational — see report; verify @p31ca/ui is the only unused dep)');
  }
}

console.log('✓ deploy-precheck: forge gate passed');