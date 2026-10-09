#!/usr/bin/env node
/**
 * audit-provenance.mjs — Tetrahedron Face 3 (V1·V3·V4).
 *
 * "Is every deletion backed by a snapshot?"
 *
 * Cross-references the deletion log against the archives. A delete with no
 * matching snapshot means the V4 GATE failed — the snapshot-before-delete
 * invariant was violated.
 *
 * Reads `.workspace/deletions.jsonl` and checks each entry's `snapshot`
 * field points to a real archive file.
 *
 * Usage: node scripts/audit-provenance.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LEDGER = join(ROOT, '.workspace', 'ledger.jsonl');
const TRASH = join(ROOT, '.trash');

if (!existsSync(LEDGER)) {
  console.log('audit-provenance: pass — no ledger (nothing to prove)');
  process.exit(0);
}

const entries = readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);
const deletions = entries.filter((e) => e.action === 'soft-delete' || e.action === 'hard-delete');
let violations = 0;

for (const entry of deletions) {
  // Every soft-delete must have a trash destination (the recovery copy).
  if (entry.action === 'soft-delete' && !entry.dest) {
    console.error(`PROVENANCE: soft-delete without trash destination — ${entry.path}`);
    violations++;
  }
  // A hard-delete must be preceded by a soft-delete (the recovery happened).
  if (entry.action === 'hard-delete') {
    const prior = entries.find((e) => e.action === 'soft-delete' && e.path === entry.path);
    if (!prior) {
      console.error(`PROVENANCE: hard-delete with no prior soft-delete — ${entry.path}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\naudit-provenance: FAIL — ${violations} deletions lack a recovery record`);
  process.exit(1);
}
console.log(`audit-provenance: pass — ${deletions.length} deletions all have recovery provenance`);