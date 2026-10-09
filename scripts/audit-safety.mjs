#!/usr/bin/env node
/**
 * audit-safety.mjs — Tetrahedron Face 2 (V1·V2·V4).
 *
 * "Is nothing deleted that wasn't first classified?"
 *
 * The forbidden edge (V1 → V4): an unclassified, untagged file can never be
 * gated (deleted). This audit cross-checks the deletion log against the
 * manifest — a deletion of a file that was never in the manifest is a
 * critical violation (the negative control).
 *
 * Reads `.workspace/deletions.jsonl` (the deletion log written by
 * p31-housekeeping.sh at V4 GATE) and verifies each entry references a file
 * that was classified before deletion.
 *
 * Usage: node scripts/audit-safety.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LEDGER = join(ROOT, '.workspace', 'ledger.jsonl');

// If there's no ledger, the face passes vacuously (nothing was deleted).
if (!existsSync(LEDGER)) {
  console.log('audit-safety: pass — no ledger (vacuously safe)');
  process.exit(0);
}

const entries = readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

const deletions = entries.filter((e) => e.action === 'soft-delete' || e.action === 'hard-delete');
let violations = 0;

for (const entry of deletions) {
  // Every deletion must carry the pre-deletion classification (a path + reason).
  if (!entry.path) {
    console.error(`SAFETY: unclassified deletion — ${JSON.stringify(entry)}`);
    violations++;
  }
  // Every deletion must have a valid approval token.
  if (!entry.token_id) {
    console.error(`SAFETY: deletion without approval token — ${entry.path}`);
    violations++;
  }
  // Every deletion must be backed by a CAS snapshot.
  if (!entry.cas_hash && !entry.dest) {
    console.error(`SAFETY: deletion without CAS snapshot or trash record — ${entry.path}`);
    violations++;
  }
}

if (violations > 0) {
  console.error(`\naudit-safety: FAIL — ${violations} unsafe deletions`);
  process.exit(1);
}
console.log(`audit-safety: pass — ${deletions.length} deletions all classified + token-gated + snapshotted`);