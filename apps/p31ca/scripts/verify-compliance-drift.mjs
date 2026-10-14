#!/usr/bin/env node
/**
 * Compliance mapping drift check.
 *
 * Ensures the /compliance page data (apps/p31ca/src/data/p31-compliance-mapping.ts)
 * — the single source of truth — is never contradicted by the standards the
 * /enterprise surface (apps/p31ca/src/pages/enterprise.astro) hardcodes.
 * Unlike a fixed list, this parses ALL RFC and draft identifiers out of both
 * files: any identifier cited on the enterprise surface that the mapping data
 * does not know about fails the build (the surface may show a subset, never a
 * claim the source of truth has never heard of).
 *
 * Run: node scripts/verify-compliance-drift.mjs  (from apps/p31ca)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..');
const dataFile = resolve(root, 'src/data/p31-compliance-mapping.ts');
const packageFile = resolve(root, 'src/pages/enterprise.astro');

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
for (const id of pkgIds) {
  if (!dataIds.has(id)) failures.push(`enterprise surface references "${id}" but the compliance mapping data does not`);
}

// The AAT revision must match between the two (e.g. -04 must be the same on both).
const aatDataMatch = data.match(/draft-sharif-agent-audit-trail-\d+/);
const aatPkgMatch = pkg.match(/draft-sharif-agent-audit-trail-\d+/);
const aatData = aatDataMatch ? aatDataMatch[0] : undefined;
const aatPkg = aatPkgMatch ? aatPkgMatch[0] : undefined;
if (aatData && aatPkg && aatData !== aatPkg) {
  failures.push(`AAT revision mismatch: mapping data "${aatData}" vs enterprise surface "${aatPkg}"`);
}

// Regulatory date claims must match. The Digital Omnibus deferred the EU AI
// Act Art. 12 high-risk logging obligation; if one document cites the
// deferral (2027/2028) and the other does not, they have drifted — the exact
// class of staleness that previously bit the compliance page.
const hasDeferral = (t) => /Dec(ember)?\s*2,?\s*2027/i.test(t) && /Aug(ust)?\s*2,?\s*2028/i.test(t);
if (hasDeferral(data) !== hasDeferral(pkg)) {
  failures.push('Article 12 deferral dates (Dec 2027 / Aug 2028) differ between the compliance mapping data and the enterprise surface');
}

if (failures.length > 0) {
  console.error('❌ Compliance mapping drift detected:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log('✅ Compliance mapping in sync (mapping data ↔ enterprise surface)');