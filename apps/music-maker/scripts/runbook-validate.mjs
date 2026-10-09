#!/usr/bin/env node
/**
 * runbook-validate.mjs — the runbook standard's contract, as a script.
 *
 * Asserts, for the control-server runbook suite (docs/runbooks/):
 *   1. Every alert row in the index's Alert Response table links to a file
 *      that exists.
 *   2. Every alert runbook has the seven required sections in order
 *      (Overview, Symptoms, Impact Assessment, Diagnostic Steps, Fix Steps,
 *      Escalation, Post-Actions) — the universal-dev-standards REQ-001.
 *   3. Every file the index links to exists.
 *
 * Exit 0 = the suite satisfies the contract. Exit 1 = a gap — an on-caller
 * following a broken runbook is worse than no runbook.
 *
 * Usage: node scripts/runbook-validate.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const runbooksDir = join(root, 'docs', 'runbooks');

const REQUIRED_SECTIONS = [
  '## Overview',
  '## Symptoms',
  '## Impact Assessment',
  '## Diagnostic Steps',
  '## Fix Steps',
  '## Escalation',
  '## Post-Actions',
];

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`  ❌ ${msg}`);
};

// ── 3. Every file the index links to exists. ───────────────────────────────
const indexPath = join(runbooksDir, 'README.md');
if (!existsSync(indexPath)) {
  console.error(`❌ missing index: ${indexPath}`);
  process.exit(1);
}
const index = readFileSync(indexPath, 'utf8');

// Markdown links `[label](path)` — relative to the index's directory.
const linkRe = /\]\(([^)]+\.md)\)/g;
let linkMatch;
const missingLinks = [];
while ((linkMatch = linkRe.exec(index))) {
  const target = linkMatch[1].split('#')[0];
  if (!target) continue;
  const full = join(runbooksDir, target);
  if (!existsSync(full)) missingLinks.push(target);
}

// ── 1. Every alert row in the Alert Response table has a file. ─────────────
// The table rows are `| \`AlertName\` | severity | [runbook](path) | ... |`.
const alertRowRe = /^\| `[A-Za-z0-9]+` \| [A-Z0-9]+ \| \[[^\]]+\]\(([^)]+\.md)\)/gm;
let rowMatch;
let alertCount = 0;
const missingAlerts = [];
while ((rowMatch = alertRowRe.exec(index))) {
  alertCount++;
  const path = rowMatch[1].split('#')[0];
  if (!existsSync(join(runbooksDir, path))) missingAlerts.push(rowMatch[0].trim().slice(0, 60));
}

// ── 2. Every alert runbook has the seven sections in order. ────────────────
const alertFiles = [...index.matchAll(alertRowRe)].map((m) => m[1].split('#')[0]);
const sectionViolations = [];
for (const rel of alertFiles) {
  const content = readFileSync(join(runbooksDir, rel), 'utf8');
  let lastIdx = -1;
  const present = [];
  for (const section of REQUIRED_SECTIONS) {
    const idx = content.indexOf(section);
    if (idx === -1) {
      present.push(null);
      continue;
    }
    present.push(idx);
    // The sections must appear in order: each one comes after the last.
    if (idx <= lastIdx) sectionViolations.push(`${rel}: ${section} out of order`);
    lastIdx = idx;
  }
  for (let i = 0; i < REQUIRED_SECTIONS.length; i++) {
    if (present[i] === null) {
      sectionViolations.push(`${rel}: missing ${REQUIRED_SECTIONS[i]}`);
    }
  }
}

console.log('runbook validation — docs/runbooks/\n');
console.log(`  alert runbooks in index: ${alertCount}`);
console.log(`  index links: ${linkRe.lastIndex > 0 ? 'scanned' : '0'}`);

if (missingLinks.length) {
  console.error('\n❌ INDEX LINKS TO MISSING FILES:');
  for (const f of missingLinks) console.error(`   • ${f}`);
}
if (missingAlerts.length) {
  console.error('\n❌ ALERT ROWS WITHOUT A FILE:');
  for (const a of missingAlerts) console.error(`   • ${a}`);
}
if (sectionViolations.length) {
  console.error('\n❌ SECTION VIOLATIONS (seven sections, in order):');
  for (const v of sectionViolations) console.error(`   • ${v}`);
}

if (missingLinks.length || missingAlerts.length || sectionViolations.length) {
  console.error('\n❌ RUNBOOK SUITE FAILED VALIDATION.');
  process.exit(1);
}

console.log('\n✅ RUNBOOK SUITE OK — every alert has a file, every file has the seven sections in order.');