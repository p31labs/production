#!/usr/bin/env node
/**
 * update-snapshots-guarded — the baseline ratchet guard.
 *
 * The bug: `--update-snapshots` baked a broken 960px topbar into the baselines,
 * so every subsequent pixel-diff passed. This guard makes that impossible:
 * the structural layout gate (DOM-based, deterministic) MUST pass before any
 * baseline can be regenerated. You cannot bake a broken layout into a baseline.
 *
 * Usage:
 *   node update-snapshots-guarded.mjs <spec>   # e.g. visual.spec.ts
 *   node update-snapshots-guarded.mjs --all
 *
 * Forwards remaining args to playwright test --update-snapshots.
 */
import { execSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DESIGN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 1. Structural gate must pass — start a preview, run layout-invariants.
const preview = spawn('npx', ['vite', 'preview', '--port', '5190', '--strictPort'], { cwd: DESIGN_DIR, stdio: 'ignore', detached: true });
try {
  await new Promise((r) => setTimeout(r, 4000));
  execSync(
    `node /home/p31/production/tools/design-parity/layout-invariants.mjs http://localhost:5190`,
    { cwd: DESIGN_DIR, stdio: 'inherit', timeout: 60_000 },
  );
  console.log('✓ structural layout gate passed — baselines may be updated.');
} catch (e) {
  console.error('✗ REFUSED: structural layout gate failed. A gross layout break exists.');
  console.error('  Fix the layout FIRST. --update-snapshots cannot bake a broken layout into a baseline.');
  process.exit(1);
} finally {
  preview.kill('SIGKILL');
}

// 2. Forward to playwright --update-snapshots.
const args = process.argv.slice(2).length > 0
  ? process.argv.slice(2).join(' ')
  : 'visual.spec.ts';
execSync(`npx playwright test ${args} --update-snapshots`, { cwd: DESIGN_DIR, stdio: 'inherit', timeout: 300_000 });
console.log('✓ snapshots updated (structural gate had already passed).');