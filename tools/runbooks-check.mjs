#!/usr/bin/env node
/**
 * runbooks:check — a runbook with no owner is furniture.
 * An owner with no last-verified date is furniture too.
 * Fails if any runbook lacks Owner + Last verified lines, or if the template's
 * six sections aren't present in the seeded runbooks.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'runbooks');
const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'RUNBOOK-TEMPLATE.md');

const SECTIONS = ['## When to use', '## Prerequisites', '## Steps', '## How to verify', '## Common pitfalls', '## Owner + last verified'];

let fail = 0;

for (const f of files) {
  const src = readFileSync(resolve(dir, f), 'utf8');
  const missing = SECTIONS.filter((s) => !src.includes(s));
  const hasOwner = /Owner:/.test(src);
  const hasDate = /Last verified: \d{4}-\d{2}-\d{2}/.test(src);

  if (missing.length) {
    console.error(`✗ ${f}: missing sections: ${missing.join(', ')}`);
    fail = 1;
  }
  if (!hasOwner) {
    console.error(`✗ ${f}: no Owner — a runbook with no owner is furniture.`);
    fail = 1;
  }
  if (!hasDate) {
    console.error(`✗ ${f}: no Last verified date — an owner with no review date is furniture.`);
    fail = 1;
  }
}

if (fail) {
  console.error(`\n✗ runbooks:check: ${files.length} runbook(s) inspected, violations found.`);
  process.exit(1);
}
console.log(`✅ runbooks:check: ${files.length} runbooks complete (6 sections + owner + last-verified).`);