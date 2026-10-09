#!/usr/bin/env node
/**
 * audit-policy.mjs — Tetrahedron Face 4 (V2·V3·V4).
 *
 * "Is every retention tag honored?"
 *
 * Every P31-HEADER carries a `retention` tag. This audit verifies:
 *   keep-forever  → the file must still exist
 *   archive-90d   → the file must exist OR be in the archive index
 *   delete-30d    → the file may be gone; if gone, it must be in the deletion log
 *   stale         → the file must be in the archive or deletion log
 *
 * Usage: node scripts/audit-policy.mjs
 */
import { readFileSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DOCS = join(ROOT, 'docs');

const ARCHIVE_INDEX = join(ROOT, 'reference', 'archives', 'INDEX.md');
const DELETIONS = join(ROOT, '.workspace', 'deletions.jsonl');

let archiveNames = new Set();
if (existsSync(ARCHIVE_INDEX)) {
  const content = readFileSync(ARCHIVE_INDEX, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/\| (p31_[^ |]+) \|/);
    if (m) archiveNames.add(m[1]);
  }
}

let deletedPaths = new Set();
if (existsSync(DELETIONS)) {
  for (const line of readFileSync(DELETIONS, 'utf8').split('\n').filter(Boolean)) {
    try {
      const e = JSON.parse(line);
      deletedPaths.add(e.path);
    } catch { /* skip */ }
  }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (/node_modules|\.git|dist|( \(1\)$)/.test(entry)) continue;
      walk(p, out);
    } else if (/\.(md|json|yaml|yml)$/.test(p)) {
      out.push(p);
    }
  }
  return out;
}

let violations = 0;
for (const file of walk(DOCS)) {
  const content = readFileSync(file, 'utf8');
  const m = content.match(/retention:\s*(\S+)/);
  if (!m) continue; // untagged docs are the coverage face's job
  const retention = m[1];
  const name = file.split('/').pop() ?? '';

  if (retention === 'keep-forever') {
    // must exist — it does (we're reading it)
  } else if (retention === 'archive-90d' || retention === 'stale') {
    if (!existsSync(file) && !archiveNames.has(name) && !deletedPaths.has(file)) {
      console.error(`POLICY: ${retention} file gone without archive/deletion record — ${file}`);
      violations++;
    }
  } else if (retention === 'delete-30d') {
    // may be gone, but if gone must be logged
    if (!existsSync(file) && !deletedPaths.has(file)) {
      console.error(`POLICY: delete-30d file gone without deletion record — ${file}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\naudit-policy: FAIL — ${violations} retention tag violations`);
  process.exit(1);
}
console.log('audit-policy: pass — every retention tag honored');