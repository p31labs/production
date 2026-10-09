#!/usr/bin/env node
/**
 * veto-check.mjs — the veto gate's static sensor (W11 gate).
 *
 * Scans the authored codebase for destructive commands that bypass the
 * runtime hook (e.g. a script that runs rm -rf directly). Fails the gate on
 * any found. The negative control: a deliberately-planted rm -rf fails.
 *
 * Usage: node scripts/veto-check.mjs
 */
import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const DESTRUCTIVE = [
  /\brm\s+(-[a-z]*rf?|-rf?)/i,
  /\bshred\b/,
  /\bmkfs/,
  /\bdd\s+of=\/dev\//,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\s+-[fdx]/,
  /\bgit\s+push\s+--force\b/,
  /\bgit\s+branch\s+-D/,
  /\bDROP\s+(TABLE|DATABASE)/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\s+\w+\s*;/i,
  /\bcurl[^\n|]*\|\s*(bash|sh)\b/i,
  /\bterraform\s+destroy\b/,
  /\bdocker\s+system\s+prune/,
];

// The scan targets authored scripts, not node_modules/git/vendor.
const EXEMPT = [
  /node_modules/, /\.git\//, /dist\//, /vendor\//, /target\//,
  /veto-check\.mjs$/, /veto-gate\.js$/, /audit-temp-hacks\.mjs$/,
  /verify-cloudflare-token\.mjs$/,
  /lib\/(ledger|cas|token)\.mjs$/,  // the safety libs themselves
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (/node_modules|\.git|dist|target|vendor/.test(entry)) continue;
      walk(p, out);
    } else if (/\.(mjs|js|sh)$/.test(p)) {
      out.push(p);
    }
  }
  return out;
}

let violations = 0;
for (const file of walk(join(ROOT, 'scripts'))) {
  if (EXEMPT.some((re) => re.test(file))) continue;
  const content = readFileSync(file, 'utf8');
  // A destructive op is compliant when the file carries a token gate (the
  // script requires `pnpm approve` / P31_AUTO_APPROVE before executing).
  const tokenGated = /P31_AUTO_APPROVE|approval token|pnpm approve|veto gate|verifyToken|P31_TOKEN_FILE/.test(content);
  for (const re of DESTRUCTIVE) {
    if (re.test(content) && !tokenGated) {
      console.error(`VETO: destructive pattern ${re} in ${file}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\nveto-check: FAIL — ${violations} destructive commands bypassing the hook`);
  process.exit(1);
}
console.log('veto-check: pass — no un-gated destructive commands in authored scripts');