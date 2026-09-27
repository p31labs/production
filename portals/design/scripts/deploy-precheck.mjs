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
console.log('✓ deploy-precheck: design gate passed');