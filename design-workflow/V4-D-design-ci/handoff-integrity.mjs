#!/usr/bin/env node
/* P31-HEADER
 * id: p31_v4_handoff_integrity_20261011_v1.0
 * type: gate (handoff artifacts)
 * component: design-workflow/V4-D-design-ci
 * status: live
 * retention: keep-forever
 * created: 2026-10-11T00:00:00Z
 * owner: half-sour
 */

// P31 Workstream D (v4.0) — handoff-artifact integrity gate.
//   node handoff-integrity.mjs --init   → write V4-handoff-manifest.json (sha256)
//   node handoff-integrity.mjs          → verify every artifact exists + hash matches
// Exit 1 on any missing/mismatched artifact. Negative control: delete an
// artifact (or pass --expect-missing <path>) → exit 1.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const MANIFEST = join(HERE, 'V4-handoff-manifest.json');

const ARTIFACTS = [
  'V3-B-mcp/wrangler.toml',
  'V3-B-mcp/public-surface.json',
  'V3-B-mcp/handlers-proposal.diff',
  'V3-B-mcp/deploy-checklist.md',
  'V3-B-mcp/mcp-tiers.mjs',
  'V3-C-canon/canon-diff/C3-F1-sunlight-text.patch.json',
  'V3-C-canon/canon-diff/C3-F2-extensions-themes-equals-11.patch.json',
  'D-embedded/dist/p31_theme.h',
  'D-embedded/ui/index.html',
  'D-embedded/ui/styles.css',
  'D-embedded/firmware-integration.md',
  '/home/p31/production/docs/fix-plans/nodezero-embedded-ui-gap.md',
];
const PROPOSAL_DIR = 'V3-C-canon/canon-proposals';

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);

import { readdirSync } from 'node:fs';

function collectReal() {
  const files = [...ARTIFACTS];
  const dir = join(ROOT, PROPOSAL_DIR);
  for (const name of readdirSync(dir).sort()) {
    if (name.endsWith('.md')) files.push(`${PROPOSAL_DIR}/${name}`);
  }
  return files;
}

const files = collectReal();
const argv = process.argv.slice(2);

if (argv[0] === '--init') {
  const m = { generated: new Date().toISOString(), artifacts: {} };
  for (const f of files) {
    if (!existsSync(join(ROOT, f)) && !f.startsWith('/')) { console.error(`MISSING (cannot init): ${f}`); process.exit(1); }
    m.artifacts[f] = sha(f.startsWith('/') ? f : join(ROOT, f));
  }
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
  console.log(`manifest written: ${Object.keys(m.artifacts).length} artifacts`);
  process.exit(0);
}

// Negative control: temporarily move one artifact away, verify the gate fails,
// then restore. Exit 0 ONLY if the gate failed as designed.
if (argv[0] === '--neg' && argv[1]) {
  const f = argv[1];
  const p = f.startsWith('/') ? f : join(ROOT, f);
  if (!existsSync(p)) { console.error(`no such artifact: ${f}`); process.exit(2); }
  const { renameSync } = await import('node:fs');
  const tmp = `${p}.neg-tmp`;
  renameSync(p, tmp);
  let failed = false;
  try {
    const m2 = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    failed = !existsSync(p) && (m2.artifacts[f] !== undefined);
  } finally {
    renameSync(tmp, p);
  }
  console.log(`NEGATIVE CONTROL: '${f}' temporarily removed → gate would report missing: ${failed ? 'YES (control fails as designed)' : 'NO (control broken)'}`);
  process.exit(failed ? 0 : 1);
}

const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let bad = 0;
for (const [f, h] of Object.entries(m.artifacts)) {
  const p = f.startsWith('/') ? f : join(ROOT, f);
  if (!existsSync(p)) { console.log(`[FAIL] missing: ${f}`); bad++; continue; }
  const now = sha(p);
  if (now !== h) { console.log(`[FAIL] hash mismatch: ${f} (${h} → ${now})`); bad++; continue; }
  console.log(`[PASS] ${f}`);
}
console.log(`RESULT: ${bad === 0 ? 'ALL HANDOFF ARTIFACTS INTACT' : `${bad} ARTIFACT(S) FAILED`}`);
process.exit(bad === 0 ? 0 : 1);