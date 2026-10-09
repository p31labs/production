#!/usr/bin/env node
/**
 * deploy — deploy THIS portal to Cloudflare Pages, nothing else.
 *
 * Forge specifics:
 *   - pure React SPA, no Pages Functions (no _worker.js)
 *   - imports @p31ca/ui from the vendored tarball — no UMD asset injection
 *   - gate runs first: typecheck → test → build → system-test
 *
 * Usage:
 *   node scripts/deploy.mjs            # gate + build + deploy
 *   node scripts/deploy.mjs --skip-gate   # build + deploy only (emergency)
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'p31-portal-forge';
const SKIP_GATE = process.argv.includes('--skip-gate');

if (!SKIP_GATE) {
  console.log('→ gate…');
  execSync('node scripts/deploy-precheck.mjs', { cwd: root, stdio: 'inherit', timeout: 300_000 });
} else {
  console.warn('⚠ --skip-gate — deploy without gate (emergency only)');
}

console.log('→ build…');
execSync('pnpm build', { cwd: root, stdio: 'inherit', timeout: 120_000 });

console.log(`→ wrangler pages deploy dist -> ${PROJECT}`);
execSync(
  `npx wrangler pages deploy dist --project-name=${PROJECT} --branch=main --commit-dirty=true`,
  { cwd: root, stdio: 'inherit', timeout: 180_000 },
);

console.log('✓ forge deployed');