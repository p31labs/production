#!/usr/bin/env node
/**
 * Compliance mapping drift check.
 *
 * Ensures the /compliance page data (apps/p31ca/src/data/p31-compliance-mapping.ts)
 * and the ENTERPRISE_PACKAGE.md §5 table do not diverge on the standards they
 * reference. Unlike a fixed list, this parses ALL RFC and draft identifiers
 * out of both files and diffs the two sets — any divergence fails the build.
 *
 * Run: node scripts/verify-compliance-drift.mjs  (from apps/p31ca)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..');
const dataFile = resolve(root, 'src/data/p31-compliance-mapping.ts');
const packageFile = resolve(root, '../../ENTERPRISE_PACKAGE.md');

const data = readFileSync(dataFile, 'utf-8');
const pkg = readFileSync(packageFile, 'utf-8');

// Extract every standards identifier from both files.
//   RFC forms: "RFC 9943", "RFC 8785", "rfc9943" (data ids)
//   Draft forms: "draft-sharif-agent-audit-trail-04" (any -NN suffix)
function extract(text) {
  const set = new Set();
  for (const m of text.matchAll(/RFC\s?\d{4}/gi)) {
    set.add(m[0].replace(/\s/g, '').toLowerCase());
  }
  for (const m of text.matchAll(/draft-[a-z0-9-]+-\d{2}/gi)) {
    set.add(m[0].toLowerCase());
  }
  return set;
}

const dataIds = extract(data);
const pkgIds = extract(pkg);

const failures = [];
for (const id of dataIds) {
  if (!pkgIds.has(id)) failures.push(`compliance data references "${id}" but ENTERPRISE_PACKAGE §5 does not`);
}
for (const id of pkgIds) {
  if (!dataIds.has(id)) failures.push(`ENTERPRISE_PACKAGE §5 references "${id}" but the compliance data file does not`);
}

// The AAT revision must match between the two (e.g. -04 must be the same on both).
const aatDataMatch = data.match(/draft-sharif-agent-audit-trail-\d+/);
const aatPkgMatch = pkg.match(/draft-sharif-agent-audit-trail-\d+/);
const aatData = aatDataMatch ? aatDataMatch[0] : undefined;
const aatPkg = aatPkgMatch ? aatPkgMatch[0] : undefined;
if (aatData && aatPkg && aatData !== aatPkg) {
  failures.push(`AAT revision mismatch: data "${aatData}" vs §5 "${aatPkg}"`);
}

// Regulatory date claims must match. The Digital Omnibus deferred the EU AI
// Act Art. 12 high-risk logging obligation; if one document cites the
// deferral (2027/2028) and the other does not, they have drifted — the exact
// class of staleness that previously bit the compliance page.
const hasDeferral = (t) => /Dec(ember)?\s*2,?\s*2027/i.test(t) && /Aug(ust)?\s*2,?\s*2028/i.test(t);
if (hasDeferral(data) !== hasDeferral(pkg)) {
  failures.push('Article 12 deferral dates (Dec 2027 / Aug 2028) differ between the compliance data file and ENTERPRISE_PACKAGE §5');
}

if (failures.length > 0) {
  console.error('❌ Compliance mapping drift detected:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log('✅ Compliance mapping in sync (data file ↔ ENTERPRISE_PACKAGE §5)');