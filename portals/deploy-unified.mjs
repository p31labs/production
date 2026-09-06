#!/usr/bin/env node
/**
 * Unified portal deployment script
 *
 * Usage:
 *   node deploy-unified.mjs                    # deploy all portals
 *   node deploy-unified.mjs children           # deploy a single portal
 *   node deploy-unified.mjs children parent    # deploy specific portals
 *   node deploy-unified.mjs --dry-run          # stage all without deploying
 *   node deploy-unified.mjs --dry-run children # stage single without deploying
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = '/home/p31/production/portals';
const STAGING_BASE = '/tmp/p31-portal-deploy';
const ASSETS_SRC = path.join(PROJECT_ROOT, 'assets');
const WORKSPACE_ROOT = '/home/p31/P31-local-workspace';

const PORTALS = {
  children: {
    subdir: 'children',
    domain: 'willow.p31ca.org',
    project: 'p31-portal-children',
    type: 'react',
    sentryProject: 'children-portal',
    port: 5193,
    entryHtml: 'index.html',
    manualChunks: ['src/lib/cognitive.ts', 'src/lib/registerTools.ts', 'src/lib/webmcp.ts'],
  },
  parent: {
    subdir: 'parent',
    domain: 'tetra.p31ca.org',
    project: 'p31-portal-parent',
    type: 'react',
    sentryProject: 'parent-portal',
    port: 5194,
    entryHtml: 'index.html',
    manualChunks: ['src/lib/cognitive.ts', 'src/lib/registerTools.ts', 'src/lib/webmcp.ts'],
  },
  teen: {
    subdir: 'teen',
    domain: 'sixseven.p31ca.org',
    project: 'p31-portal-teen',
    type: 'react',
    sentryProject: 'teen-portal',
    port: 5195,
    entryHtml: 'index.html',
    manualChunks: ['src/lib/cognitive.ts', 'src/lib/registerTools.ts', 'src/lib/webmcp.ts'],
  },
  meatspace: {
    subdir: 'meatspace',
    domain: 'meatspace.p31ca.org',
    project: 'p31-portal-meatspace',
    type: 'react',
    sentryProject: 'meatspace-portal',
    port: 5192,
    entryHtml: 'index.html',
    manualChunks: ['src/lib/registerTools.ts', 'src/lib/webmcp.ts'],
  },
  design: {
    subdir: 'design',
    domain: 'design.p31ca.org',
    project: 'p31-portal-design',
    type: 'react',
    sentryProject: null,
    port: 5190,
    entryHtml: 'index.html',
    manualChunks: [],
  },
  // developer and institutional archived — source of truth is now apps/p31ca and apps/phosphorus31
};

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function buildReactPortal(srcDir, portal) {
  const pkgPath = path.join(srcDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;

  log('  Installing dependencies...');
  try {
    execSync('pnpm install', { cwd: srcDir, stdio: 'pipe', timeout: 120000 });
  } catch (e) {
    log(`  pnpm install failed: ${e.stderr?.toString().slice(0, 200)}`);
    return false;
  }

  log('  Building React portal...');
  try {
    execSync('pnpm run build', {
      cwd: srcDir,
      stdio: 'pipe',
      timeout: 120000,
      env: {
        ...process.env,
        SENTRY_PROJECT: portal.sentryProject || '',
        PORTAL_PORT: String(portal.port),
      },
    });
    return true;
  } catch (e) {
    log(`  Build failed: ${e.stderr?.toString().slice(0, 500)}`);
    return false;
  }
}

function stagePortal(portal, dryRun = false) {
  const srcDir = path.join(PROJECT_ROOT, portal.subdir);
  const stagingDir = path.join(STAGING_BASE, portal.subdir);

  log(`Staging ${portal.project} (${portal.domain}) [${portal.type}]`);

  if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  if (portal.type === 'react') {
    const built = buildReactPortal(srcDir, portal);
    if (!built) {
      log('  WARNING: React build failed, falling back to static files');
    }
  }

  if (portal.type === 'react') {
    const distDir = path.join(srcDir, 'dist');
    if (fs.existsSync(distDir)) {
      fs.cpSync(distDir, stagingDir, { recursive: true });
    } else {
      log('  WARNING: No dist/ found, copying source files');
      for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const src = path.join(srcDir, entry.name);
        fs.cpSync(src, path.join(stagingDir, entry.name), { recursive: true });
      }
    }
  } else {
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'wrangler.toml' || entry.name === 'wrangler.toml.bak') continue;
      const src = path.join(srcDir, entry.name);
      const dest = path.join(stagingDir, entry.name);
      if (entry.isDirectory()) {
        fs.cpSync(src, dest, { recursive: true, filter: (f) => !f.includes('node_modules') });
      } else {
        fs.copyFileSync(src, dest);
      }
    }
  }

  const assetsDir = path.join(stagingDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  for (const file of ['p31-ui.umd.js', 'p31-ui.umd.css', 'state-sync.js', 'components.css', 'webmcp-registry.js']) {
    const src = path.join(ASSETS_SRC, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(assetsDir, file));
    }
  }

  if (fs.existsSync(path.join(stagingDir, 'manifest.json'))) {
    for (const icon of ['icon-192.png', 'icon-512.png']) {
      const src = path.join(ASSETS_SRC, icon);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(assetsDir, icon));
      }
    }
  }

  if (portal.type === 'react' && fs.existsSync(path.join(stagingDir, 'index.html'))) {
    let content = fs.readFileSync(path.join(stagingDir, 'index.html'), 'utf8');
    if (!content.includes('/assets/p31-ui.umd.js')) {
      content = content.replace('</head>', `<script nonce="{{NONCE}}" src="/assets/p31-ui.umd.js"></script>\n</head>`);
    }
    fs.writeFileSync(path.join(stagingDir, 'index.html'), content);
    fs.writeFileSync(path.join(stagingDir, 'wrangler.toml'), [
      `name = "${portal.project}"`,
      `pages_build_output_dir = "."`,
      `compatibility_date = "2026-07-29"`,
      '',
      '[observability]',
      'enabled = true',
      '',
    ].join('\n'));
    return stagingDir;
  }

  const htmlFile = portal.entryHtml || 'index.html';
  const htmlPath = path.join(stagingDir, htmlFile);
  if (fs.existsSync(htmlPath)) {
    let content = fs.readFileSync(htmlPath, 'utf8');
    const ogUrlPattern = /<meta property="og:url"\s+content="[^"]*"\s*\/?>/;
    if (ogUrlPattern.test(content)) {
      content = content.replace(ogUrlPattern, `<meta property="og:url" content="https://${portal.domain}">`);
    } else {
      content = content.replace('<head>', `<head>\n  <meta property="og:url" content="https://${portal.domain}">`);
    }
    if (!content.includes('/assets/webmcp-registry.js')) {
      content = content.replace('</body>', '  <script src="/assets/webmcp-registry.js"></script>\n</body>');
    }
    fs.writeFileSync(htmlPath, content);
  }

  if (portal.entryHtml) {
    const indexPath = path.join(stagingDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      if (fs.existsSync(htmlPath)) {
        fs.copyFileSync(htmlPath, indexPath);
      }
    }
  }

  fs.writeFileSync(path.join(stagingDir, 'wrangler.toml'), [
    `name = "${portal.project}"`,
    `pages_build_output_dir = "."`,
    `compatibility_date = "2026-07-29"`,
    '',
    '[observability]',
    'enabled = true',
    '',
  ].join('\n'));

  return stagingDir;
}

function deployPortal(portal, stagingDir) {
  log(`Deploying ${portal.project} -> https://${portal.domain}`);
  try {
    execSync(
      `npx wrangler pages deploy "${stagingDir}" --project-name="${portal.project}" --branch=main --commit-dirty=true`,
      { stdio: 'inherit', cwd: PROJECT_ROOT }
    );
    log(`  ${portal.project} deployed`);
    return true;
  } catch (e) {
    log(`  ${portal.project} failed: ${e.message}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const requestedPortals = args.filter((a) => !a.startsWith('--'));

  if (!process.env.CLOUDFLARE_API_TOKEN) {
    log('CLOUDFLARE_API_TOKEN not set -- using wrangler OAuth session');
  }

  if (fs.existsSync(STAGING_BASE)) fs.rmSync(STAGING_BASE, { recursive: true });

  const portalsToDeploy = requestedPortals.length > 0
    ? requestedPortals.filter((name) => {
        if (!PORTALS[name]) {
          log(`Unknown portal: "${name}" — valid names: ${Object.keys(PORTALS).join(', ')}`);
          return false;
        }
        return true;
      })
    : Object.keys(PORTALS);

  if (dryRun) {
    log(`DRY RUN — staging ${portalsToDeploy.length} portal(s) without deploying`);
  }

  let ok = 0;
  let fail = 0;

  for (const name of portalsToDeploy) {
    const portal = PORTALS[name];
    try {
      const stagingDir = stagePortal(portal, dryRun);
      if (dryRun) {
        log(`  Staged to ${stagingDir} (dry-run, not deploying)`);
        ok++;
      } else {
        if (deployPortal(portal, stagingDir)) ok++; else fail++;
      }
      if (!dryRun) execSync('sleep 3');
    } catch (e) {
      log(`Error staging ${portal.subdir}: ${e.message}`);
      fail++;
    }
  }

  log(`Done — ${ok} staged, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
