#!/usr/bin/env node
/**
 * deploy — deploy THIS portal (workspace) to Cloudflare Pages, nothing else.
 *
 * Workspace specifics:
 *   - has functions/ (api/forge, api/loom, _middleware) → compiled to a
 *     single _worker.js at the deploy root (Pages serves one worker).
 *   - UMD assets are injected into index.html by this script (not skipUmd).
 *
 * Usage:
 *   node scripts/deploy.mjs            # build + compile functions + deploy
 *   node scripts/deploy.mjs --skip-functions  # build + deploy only (emergency)
 */
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'p31-portal-workspace';
const SKIP_FUNCTIONS = process.argv.includes('--skip-functions');

// Canon fork gate — refuse to deploy a forked portal (consume-don't-fork).
// Scoped to THIS portal's src, mirroring portals/design and portals/forge.
// tokens.css is allowlisted per the design-portal precedent: it is the legacy
// surface-token adapter layer, filed for migration (see
// docs/fix-plans/canon-fork-migration-backlog.md).
const CANON_AUDIT = '/home/p31/production/tools/canon-audit/canon-source-audit.mjs';
try {
  execSync(
    'node ' + CANON_AUDIT + ' --target ' + resolve(root, 'src') +
      ' --allow production/portals/workspace/src/tokens.css',
    { cwd: root, stdio: 'inherit', timeout: 60_000 },
  );
} catch (e) {
  console.error('✗ deploy refused: canon-source-audit found forks in ' + 'workspace' + '. Import from @p31ca/design-core, do not re-define tokens/components.');
  process.exit(1);
}

console.log('→ build…');
execSync('pnpm build', { cwd: root, stdio: 'inherit', timeout: 120_000 });

let deployDir = join(root, 'dist');

if (!SKIP_FUNCTIONS && existsSync(join(root, 'functions'))) {
  console.log('→ compiling Pages Functions…');
  const out = '/tmp/p31-functions-build';
  rmSync(out, { recursive: true, force: true });
  cpSync(join(root, 'functions'), join(deployDir, 'functions'), { recursive: true });
  execSync(
    `npx wrangler pages functions build --build-output-directory "${deployDir}" --outdir "${out}"`,
    { stdio: 'inherit', cwd: root, timeout: 120_000 },
  );
  copyFileSync(join(out, 'index.js'), join(deployDir, '_worker.js'));
  rmSync(join(deployDir, 'functions'), { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
  console.log('  + _worker.js written');
}

// Inject UMD + registry assets into index.html (same as the old unified stage).
const indexPath = join(deployDir, 'index.html');
if (existsSync(indexPath)) {
  let content = readFileSync(indexPath, 'utf8');
  if (!content.includes('/assets/p31-ui.umd.js')) {
    content = content.replace('</head>',
      `<script>window.process = window.process || { env: {} };</script>\n<script nonce="{{NONCE}}" src="/assets/p31-ui.umd.js"></script>\n</head>`);
  }
  if (!content.includes('/assets/webmcp-registry.js')) {
    content = content.replace('</body>', '  <script src="/assets/webmcp-registry.js"></script>\n</body>');
  }
  writeFileSync(indexPath, content);
}

// Copy shared assets into dist/assets/.
const assetsDir = join(deployDir, 'assets');
mkdirSync(assetsDir, { recursive: true });
const ASSETS_SRC = resolve(root, '..', 'assets');
for (const file of ['p31-ui.umd.js', 'p31-ui.umd.css', 'state-sync.js', 'components.css', 'webmcp-registry.js']) {
  const src = join(ASSETS_SRC, file);
  if (existsSync(src)) copyFileSync(src, join(assetsDir, file));
}

console.log(`→ wrangler pages deploy dist -> ${PROJECT}`);
execSync(
  `npx wrangler pages deploy dist --project-name=${PROJECT} --branch=main --commit-dirty=true`,
  { cwd: root, stdio: 'inherit', timeout: 180_000 },
);

console.log('✓ workspace deployed');