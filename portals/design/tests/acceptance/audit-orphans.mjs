#!/usr/bin/env node
/**
 * audit-orphans (P4) — find committed generated artifacts nothing references.
 *
 * A generated file with zero references (no import, no generator, no catalog
 * entry) is hidden debt: it can rot silently and harbor a stale/false value.
 * This audit scans for *.test.tsx, *.spec.ts, *.wc.js, *.stories.tsx and
 * reports each as REFERENCED or ORPHAN. ORPHANs must be in the allowlist
 * (the debt ratchet) or the audit fails.
 *
 * The audit also PRODUCES the current orphan count — the input to the ratchet.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DC = '/home/p31/P31-local-workspace/packages/design-core';
const here = resolve(import.meta.dirname);
const allowlistPath = resolve(here, 'orphan-allowlist.json');

// Find all committed generated artifacts in design-core + the portal.
// NOTE: *.wc.js are generator-owned (scripts/generate-components.ts emits them
// from its component catalog — verified all 29 regenerate). They are NOT
// orphans. The orphan class is generated files with NO generator: the
// committed *.test.tsx / *.spec.ts / *.stories.tsx.
const files = execSync(
  `cd ${DC} && git ls-files 'src/generated/**' 'src/generated-wc/**' 2>/dev/null | grep -E '\\.(test|spec)\\.(ts|tsx|js)$|\\.stories\\.tsx$'`,
  { encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

const allowlist = existsSync(allowlistPath)
  ? new Set(JSON.parse(readFileSync(allowlistPath, 'utf8')).orphans)
  : new Set();

const orphans = [];
for (const f of files) {
  const basename = f.split('/').pop();
  // Any consumer reference anywhere in design-core + portal src.
  const hits = execSync(
    `grep -rn "${basename}" ${DC}/src ${DC}/scripts ${resolve(here, '..', '..', '..', 'portals', 'design', 'src')} 2>/dev/null | grep -v "${f}:" | wc -l`,
    { encoding: 'utf8' },
  ).trim();
  if (Number(hits) === 0) orphans.push(f);
}

// Write the count to a file the ratchet reads.
const current = orphans.length;
const countFile = resolve(here, 'orphan-count.json');
const { writeFileSync } = await import('node:fs');
writeFileSync(countFile, JSON.stringify({ count: current, generatedAt: new Date().toISOString(), orphans }) + '\n');

// A NEW orphan (not in allowlist) fails.
const newOrphans = orphans.filter((f) => !allowlist.has(f));
if (newOrphans.length) {
  console.error(`✗ ORPHAN AUDIT: ${newOrphans.length} NEW orphan(s) not in the allowlist:`);
  for (const o of newOrphans) console.error(`  ${o}`);
  console.error(`\n  Add to orphan-allowlist.json ONLY as a deliberate debt decision. The allowlist is a ratchet: it shrinks, never grows.`);
  console.error(`  Current orphan count: ${current} (allowlist holds ${allowlist.size}).`);
  process.exit(1);
}

console.log(`✅ ORPHAN AUDIT: ${files.length} generated files; ${current} orphans (all allowlisted). Count written to orphan-count.json.`);
console.log(`  Wire to the ratchet: node tests/acceptance/ratchet.mjs ${current}`);