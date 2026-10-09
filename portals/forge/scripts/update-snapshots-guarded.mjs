#!/usr/bin/env node
/**
 * update-snapshots-guarded — the baseline ratchet guard (forge).
 *
 * The bug: `--update-snapshots` baked a broken 960px topbar into the baselines,
 * so every subsequent pixel-diff passed. This guard makes that impossible:
 * the structural layout gate (DOM-based, deterministic) MUST pass against every
 * forge route before any baseline can be regenerated. You cannot bake a broken
 * layout into a baseline.
 *
 * Usage:
 *   node update-snapshots-guarded.mjs <spec>   # e.g. forge.spec.ts
 *   node update-snapshots-guarded.mjs          # default: forge.spec.ts
 *
 * Forwards remaining args to playwright test --update-snapshots.
 */
import { execSync, spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FORGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LAYOUT_GATE = '/home/p31/production/tools/design-parity/layout-invariants.mjs';
const ROUTES = '/,/catalog,/playground,/identity,/compose,/activity,/channels';

// 1. Structural gate must pass — start a preview, run layout-invariants on
//    every route. A failing structural gate refuses the baseline update.
const preview = spawn('npx', ['vite', 'preview', '--port', '5180', '--strictPort'], { cwd: FORGE_DIR, stdio: 'ignore', detached: true });
try {
  let tries = 0;
  const up = () => { try { execSync('curl -s -o /dev/null http://localhost:5180/', { timeout: 3000 }); return true; } catch { return false; } };
  while (!up() && tries++ < 20) execSync('sleep 0.5');
  execSync(
    `node ${LAYOUT_GATE} http://localhost:5180 --routes ${ROUTES}`,
    { cwd: FORGE_DIR, stdio: 'inherit', timeout: 120_000 },
  );
  console.log('✓ structural layout gate passed across all routes — baselines may be updated.');
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
  : 'tests/acceptance/forge.spec.ts';
execSync(`npx playwright test ${args} --update-snapshots`, { cwd: FORGE_DIR, stdio: 'inherit', timeout: 300_000 });
console.log('✓ snapshots updated (structural gate had already passed).');