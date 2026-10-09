#!/usr/bin/env node
/**
 * token-check.mjs — the approval-token gate (W15).
 *
 * Validates that every consequential action in the ledger (soft-delete,
 * hard-delete, merge) carries a valid approval token. Reads the ledger,
 * loads the issued tokens, and verifies each.
 *
 * Negative control: a planted deletion without a token fails.
 *
 * Usage: node scripts/token-check.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LEDGER = join(ROOT, '.workspace', 'ledger.jsonl');
const TOKENS_DIR = join(ROOT, '.workspace', 'tokens');

if (!existsSync(LEDGER)) {
  console.log('token-check: pass — no ledger (nothing executed)');
  process.exit(0);
}

const REQUIRES_TOKEN = new Set(['soft-delete', 'hard-delete', 'merge', 'lease-exclusive']);
const entries = readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

// Load issued tokens.
const issued = new Set();
if (existsSync(TOKENS_DIR)) {
  for (const f of readdirSync(TOKENS_DIR)) {
    if (f.endsWith('.token')) issued.add(f.replace(/\.token$/, ''));
  }
}

let violations = 0;
for (const e of entries) {
  if (REQUIRES_TOKEN.has(e.action)) {
    if (!e.token_id) {
      console.error(`TOKEN: ${e.action} without approval token — ${e.path ?? e.action}`);
      violations++;
    } else if (!issued.has(e.token_id)) {
      console.error(`TOKEN: ${e.action} references unknown token ${e.token_id}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\ntoken-check: FAIL — ${violations} actions without valid approval`);
  process.exit(1);
}
console.log(`token-check: pass — all ${entries.length} consequential actions have valid tokens`);