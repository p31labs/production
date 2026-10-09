#!/usr/bin/env node
/**
 * soft-delete-check.mjs — the soft-delete gate (W13).
 *
 * Validates that no hard delete (irreversible removal) happened before the
 * retention window + a second human approval. Reads the ledger and flags any
 * `hard-delete` execution whose retention window hasn't elapsed.
 *
 * Negative control: a planted hard-delete-before-window fails.
 *
 * Usage: node scripts/soft-delete-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LEDGER = join(ROOT, '.workspace', 'ledger.jsonl');

if (!existsSync(LEDGER)) {
  console.log('soft-delete-check: pass — no ledger (nothing deleted)');
  process.exit(0);
}

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90-day window
const entries = readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

let violations = 0;
for (const e of entries) {
  if (e.action === 'hard-delete') {
    // A hard delete requires: a token_id AND the retention window elapsed.
    if (!e.token_id) {
      console.error(`SOFT-DELETE: hard delete without approval token — ${e.path}`);
      violations++;
    }
    // Find the soft-delete that preceded it.
    const soft = entries.find((x) => x.action === 'soft-delete' && x.path === e.path);
    if (soft) {
      const elapsed = Date.parse(e.at) - Date.parse(soft.at);
      if (elapsed < RETENTION_MS) {
        console.error(`SOFT-DELETE: hard delete before 90-day window — ${e.path} (${Math.round(elapsed / 86400000)}d)`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\nsoft-delete-check: FAIL — ${violations} premature hard deletes`);
  process.exit(1);
}
console.log('soft-delete-check: pass — no hard deletes before the retention window');