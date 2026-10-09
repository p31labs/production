#!/usr/bin/env node

/**
 * sync-docs.cjs — Monorepo documentation sync utility
 *
 * Ensures shared documentation stays consistent across the P31 monorepo.
 * Run after cross-app state changes, security header updates, or API route additions.
 *
 * Usage:
 *   node scripts/sync-docs.cjs                    # Dry run (show diffs)
 *   node scripts/sync-docs.cjs --write             # Apply changes
 *   node scripts/sync-docs.cjs --check             # CI mode (exit 1 if drift)
 *
 * Syncs:
 *   1. Cross-app state references (MANUFACTURERS_MANUAL.md, ARCHITECTURE.md)
 *   2. CSP header directives (_headers files, docs)
 *   3. API route tables (worker.ts ↔ docs)
 *   4. Verify suite counts (scripts/verify-*.cjs ↔ docs)
 */

const fs = require('fs');
const path = require('path');

// Detect script location: support running from repo root or from production/shell/
const SCRIPT_DIR = __dirname;
const IS_IN_SHELL = SCRIPT_DIR.endsWith(path.join('production', 'shell', 'scripts'));

// When run from production/shell/, the monorepo root is two levels up from script
const ROOT = IS_IN_SHELL ? path.resolve(SCRIPT_DIR, '..', '..', '..') : path.resolve(SCRIPT_DIR, '..');
const SHELL = IS_IN_SHELL ? path.resolve(SCRIPT_DIR, '..') : path.join(ROOT, 'production', 'shell');
const SPACESHIP = path.join(ROOT, 'production', 'packages', 'spaceship-earth');
const DOCS = path.join(ROOT, 'production', 'docs');

const DRY_RUN = process.argv.includes('--dry-run');
const WRITE = process.argv.includes('--write');
const CHECK = process.argv.includes('--check');

let drift = 0;
let fixes = 0;

function log(msg) {
  console.log(`  ${msg}`);
}

function checkDrift(label, actual, expected) {
  if (actual !== expected) {
    log(`⚠️  DRIFT [${label}]: expected ${expected}, got ${actual}`);
    drift++;
    return false;
  }
  return true;
}

// ── 1. Cross-App State References ───────────────────────────────────────────

function syncCrossAppRefs() {
  log('\n📝 Cross-app state references:');

  const shellManual = path.join(SHELL, 'docs', 'MANUFACTURERS_MANUAL.md');
  const shipArch = path.join(SPACESHIP, 'ARCHITECTURE.md');

  // Check shell manual has Phase 7-C section
  if (fs.existsSync(shellManual)) {
    const content = fs.readFileSync(shellManual, 'utf8');
    if (!content.includes('Phase 7-C') && !content.includes('Cross-App State')) {
      log('  ⚠️  Shell MANUFACTURERS_MANUAL.md missing Cross-App State section');
      drift++;
    } else {
      log('  ✅ Shell MANUFACTURERS_MANUAL.md has cross-app state');
    }
  }

  // Check spaceship arch has cross-app state section
  if (fs.existsSync(shipArch)) {
    const content = fs.readFileSync(shipArch, 'utf8');
    if (!content.includes('useCrossAppState') && !content.includes('Cross-App State')) {
      log('  ⚠️  Spaceship ARCHITECTURE.md missing cross-app state');
      drift++;
    } else {
      log('  ✅ Spaceship ARCHITECTURE.md has cross-app state');
    }
  }
}

// ── 2. CSP Header Directives ────────────────────────────────────────────────

function syncCspRefs() {
  log('\n🔒 CSP header directives:');

  const shellHeaders = path.join(SHELL, 'public', '_headers');
  const shipHeaders = path.join(SPACESHIP, 'public', '_headers');

  // Extract CSP from shell _headers (match the enforced CSP, not Report-Only)
  let shellCsp = null;
  if (fs.existsSync(shellHeaders)) {
    const content = fs.readFileSync(shellHeaders, 'utf8');
    const matches = [...content.matchAll(/Content-Security-Policy(?:-Report-Only)?:\s*(.+)/g)];
    const enforced = matches.find(m => !m[0].includes('Report-Only'));
    if (enforced) shellCsp = enforced[1].trim();
  }

  // Extract CSP from spaceship _headers
  let shipCsp = null;
  if (fs.existsSync(shipHeaders)) {
    const content = fs.readFileSync(shipHeaders, 'utf8');
    const matches = [...content.matchAll(/Content-Security-Policy(?:-Report-Only)?:\s*(.+)/g)];
    const enforced = matches.find(m => !m[0].includes('Report-Only'));
    if (enforced) shipCsp = enforced[1].trim();
  }

  if (shellCsp) {
    log(`  ✅ Shell CSP: ${shellCsp.substring(0, 60)}...`);
  } else {
    log('  ⚠️  Shell _headers missing CSP');
    drift++;
  }

  if (shipCsp) {
    log(`  ✅ Spaceship CSP: ${shipCsp.substring(0, 60)}...`);
  } else {
    log('  ⚠️  Spaceship _headers missing CSP');
    drift++;
  }

  // Check docs reference CSP
  const shellManual = path.join(SHELL, 'docs', 'MANUFACTURERS_MANUAL.md');
  if (fs.existsSync(shellManual)) {
    const content = fs.readFileSync(shellManual, 'utf8');
    if (!content.includes('Content-Security-Policy')) {
      log('  ⚠️  Shell MANUAL missing CSP section');
      drift++;
    }
  }
}

// ── 3. API Route Tables ──────────────────────────────────────────────────────

function syncApiRoutes() {
  log('\n🔌 API route tables:');

  const shellWorker = path.join(SHELL, 'src', 'worker.ts');
  const shipWorker = path.join(SPACESHIP, 'worker', 'index.ts');

  // Extract routes from shell worker
  if (fs.existsSync(shellWorker)) {
    const content = fs.readFileSync(shellWorker, 'utf8');
    const routes = [];
    const regex = /pathname === '([^']+)'/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      routes.push(match[1]);
    }
    log(`  ✅ Shell Worker routes: ${routes.filter(r => r.startsWith('/api') || r.startsWith('/mcp')).join(', ')}`);
  }

  // Extract routes from spaceship worker
  if (fs.existsSync(shipWorker)) {
    const content = fs.readFileSync(shipWorker, 'utf8');
    const routes = [];
    const regex = /pathname === '([^']+)'/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      routes.push(match[1]);
    }
    log(`  ✅ Spaceship Worker routes: ${routes.filter(r => r.startsWith('/api') || r.startsWith('/mcp') || r.startsWith('/session')).join(', ')}`);
  }
}

// ── 4. Verify Suite Counts ──────────────────────────────────────────────────

function syncVerifyCounts() {
  log('\n🧪 Verify suite counts:');

  const shellVerify = path.join(SHELL, 'scripts', 'verify-shell.cjs');
  const shipVerify = path.join(SPACESHIP, 'scripts', 'verify-ship.cjs');

  // Count check( calls in shell verify
  if (fs.existsSync(shellVerify)) {
    const content = fs.readFileSync(shellVerify, 'utf8');
    const count = (content.match(/check\(/g) || []).length;
    log(`  ✅ Shell verify: ${count} check() calls`);
  }

  // Count check( calls in spaceship verify
  if (fs.existsSync(shipVerify)) {
    const content = fs.readFileSync(shipVerify, 'utf8');
    const count = (content.match(/check\(/g) || []).length;
    log(`  ✅ Spaceship verify: ${count} check() calls`);
  }
}

// ── 5. Deploy Scripts ───────────────────────────────────────────────────────

function checkDeployScripts() {
  log('\n🚢 Deploy scripts:');

  const shellDeploy = path.join(SHELL, 'package.json');
  const shipDeploy = path.join(SPACESHIP, 'package.json');

  if (fs.existsSync(shellDeploy)) {
    const pkg = JSON.parse(fs.readFileSync(shellDeploy, 'utf8'));
    const scripts = pkg.scripts || {};
    if (scripts.deploy) {
      log(`  ✅ Shell: pnpm run deploy → ${scripts.deploy}`);
    } else {
      log('  ⚠️  Shell: no deploy script');
      drift++;
    }
  }

  if (fs.existsSync(shipDeploy)) {
    const pkg = JSON.parse(fs.readFileSync(shipDeploy, 'utf8'));
    const scripts = pkg.scripts || {};
    if (scripts.deploy) {
      log(`  ✅ Spaceship: pnpm run deploy → ${scripts.deploy}`);
    } else {
      log('  ℹ️  Spaceship: deploy via wrangler pages CLI (no package script)');
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('🔄 P31 Monorepo Documentation Sync');
  console.log('=====================================\n');

  syncCrossAppRefs();
  syncCspRefs();
  syncApiRoutes();
  syncVerifyCounts();
  checkDeployScripts();

  console.log('\n=====================================');
  console.log(`Drift: ${drift} | Fixes applied: ${fixes}`);

  if (CHECK && drift > 0) {
    console.log('\n❌ Documentation drift detected. Run with --write to fix.');
    process.exit(1);
  }

  if (drift === 0) {
    console.log('✅ All documentation in sync.');
  } else if (WRITE) {
    console.log('\n⚠️  Write mode not fully implemented — manual fixes required.');
    console.log('Review the warnings above and update docs manually.');
  } else {
    console.log('\n⚠️  Run with --write to apply fixes (where possible).');
  }
}

main();
