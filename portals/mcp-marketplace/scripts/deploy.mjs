#!/usr/bin/env node
/**
 * deploy — deploy THIS portal (mcp-marketplace) to Cloudflare Pages, nothing else.
 * Plain React SPA: no Pages Functions, no UMD injection (vendored @p31ca/ui).
 *   node scripts/deploy.mjs            # build + deploy
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'p31-portal-mcp-marketplace';

// Canon fork gate — refuse to deploy a forked portal (consume-don't-fork).
// Scoped to THIS portal's tree: the repo-wide scan is owned by the root
// `pnpm gate`; other portals' filed forks must not block this portal's
// deploy (fix-plan mcp-marketplace-canon-forks.md).
const CANON_AUDIT = '/home/p31/production/tools/canon-audit/canon-source-audit.mjs';
try {
  execSync(`node ${CANON_AUDIT} --target ${root}`, { cwd: root, stdio: 'inherit', timeout: 60_000 });
} catch (e) {
  console.error('✗ deploy refused: canon-source-audit found forks in ' + 'mcp-marketplace' + '. Import from @p31ca/design-core, do not re-define tokens/components.');
  process.exit(1);
}

console.log('→ build…');
execSync('pnpm build', { cwd: root, stdio: 'inherit', timeout: 120_000 });

console.log(`→ wrangler pages deploy dist -> ${PROJECT}`);
execSync(
  `npx wrangler pages deploy dist --project-name=${PROJECT} --branch=main --commit-dirty=true`,
  { cwd: root, stdio: 'inherit', timeout: 180_000 },
);

console.log('✓ mcp-marketplace deployed');