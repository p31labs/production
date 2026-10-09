#!/usr/bin/env node
/**
 * runbooks:check — a runbook with no owner is furniture.
 * An owner with no last-verified date is furniture too.
 * Fails if any runbook lacks Owner + Last verified lines, or if the template's
 * six sections aren't present in the seeded runbooks.
 *
 * Scans two locations:
 *   - runbooks/                    (repo root — the 6-section template)
 *   - docs/enterprise/runbooks/    (enterprise — the 7-section format:
 *                                   Overview / Symptoms / Impact Assessment /
 *                                   Diagnostic Steps / Fix Steps / Escalation /
 *                                   Post-Actions)
 * A runbook in either location must carry `Owner:` and `Last verified:`.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_RUNBOOKS = resolve(import.meta.dirname, '..', 'runbooks');
const ENTERPRISE_RUNBOOKS = resolve(import.meta.dirname, '..', 'docs', 'enterprise', 'runbooks');

const ROOT_SECTIONS = ['## When to use', '## Prerequisites', '## Steps', '## How to verify', '## Common pitfalls', '## Owner + last verified'];
const ENTERPRISE_SECTIONS = [
  '## 1. Overview', '## 2. Symptoms', '## 3. Impact Assessment',
  '## 4. Diagnostic Steps', '## 5. Fix Steps', '## 6. Escalation', '## 7. Post-Actions',
];

function scan(dir, sections, label) {
  if (!existsSync(dir)) {
    console.error(`✗ ${label}: directory not found: ${dir}`);
    return 1;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'RUNBOOK-TEMPLATE.md');
  let fail = 0;
  for (const f of files) {
    const src = readFileSync(resolve(dir, f), 'utf8');
    const missing = sections.filter((s) => !src.includes(s));
    const hasOwner = /Owner:/.test(src);
    // Accept both plain ("Last verified: 2026-10-02") and bold-markdown
    // ("**Last verified:** 2026-10-02") label forms used across the two
    // runbook locations.
    const hasDate = /\*?\*?Last verified:\*?\*? \d{4}-\d{2}-\d{2}/.test(src);

    if (missing.length) {
      console.error(`✗ ${label}/${f}: missing sections: ${missing.join(', ')}`);
      fail = 1;
    }
    if (!hasOwner) {
      console.error(`✗ ${label}/${f}: no Owner — a runbook with no owner is furniture.`);
      fail = 1;
    }
    if (!hasDate) {
      console.error(`✗ ${label}/${f}: no Last verified date — an owner with no review date is furniture.`);
      fail = 1;
    }
  }
  return fail;
}

let fail = 0;
fail += scan(ROOT_RUNBOOKS, ROOT_SECTIONS, 'runbooks');
fail += scan(ENTERPRISE_RUNBOOKS, ENTERPRISE_SECTIONS, 'docs/enterprise/runbooks');

if (fail) {
  console.error(`\n✗ runbooks:check: violations found.`);
  process.exit(1);
}
console.log('✅ runbooks:check: all runbooks complete (sections + owner + last-verified).');