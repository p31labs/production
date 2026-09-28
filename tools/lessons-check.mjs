#!/usr/bin/env node
/**
 * lessons:check (P5) — every lesson's Prevention must resolve to a real
 * runbook (runbooks/RUNBOOK-*.md) or a registry gate (tests/acceptance/gates.json
 * or a package.json gate script). A prevention of "be more careful" is a
 * sentiment, not a prevention.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const lessonsPath = resolve(repo, 'docs', 'LESSONS.md');
const runbooks = new Set(readdirSync(resolve(repo, 'runbooks')).map((f) => f.replace('.md', '')));

// Build a set of valid prevention targets: runbook names, gate ids, and npm gate script names.
const validTargets = new Set([...runbooks]);

// From gates.json
const gatesJsonPath = resolve(repo, 'portals', 'design', 'tests', 'acceptance', 'gates.json');
if (existsSync(gatesJsonPath)) {
  const reg = JSON.parse(readFileSync(gatesJsonPath, 'utf8'));
  for (const g of reg.gates) validTargets.add(g.id);
}

// From package.json gate scripts
const pkg = JSON.parse(readFileSync(resolve(repo, 'portals', 'design', 'package.json'), 'utf8'));
for (const [name] of Object.entries(pkg.scripts)) {
  if (name.includes(':') || name.includes('check') || name.includes('audit')) validTargets.add(name);
}

const src = readFileSync(lessonsPath, 'utf8');
const rows = [...src.matchAll(/\| L-\d+ \|.*?\|\s*([^|]+?)\s*\|.*?$/gm)];

let fail = 0;
let count = 0;
for (const m of src.matchAll(/^\| L-\d+ \|/gm)) count++;

// Extract each Prevention cell (the 7th column).
for (const row of src.split('\n').filter((l) => l.startsWith('| L-'))) {
  const cells = row.split('|').map((c) => c.trim());
  // | L-001 | sym | cause | fix | prevention | incident |
  // cells: ["", "L-001", "sym", "cause", "fix", "prevention", "incident", ""]
  const id = cells[1];
  const prevention = cells[5] || '';
  const targets = [...prevention.matchAll(/RUNBOOK-[a-z-]+|gate [a-z-]+|gate:[a-z-]+|audit:[a-z-]+|check:[a-z-]+/g)].map((m) => m[0].replace(/^gate /, ''));
  const resolved = targets.some((t) => {
    const bare = t.replace(/^gate /, '').replace(/^RUNBOOK-/, 'RUNBOOK-');
    return validTargets.has(bare) || validTargets.has(t) || runbooks.has(bare);
  });
  if (!resolved) {
    console.error(`✗ L-${id}: Prevention does not resolve to a real runbook/gate: "${prevention}"`);
    fail = 1;
  }
}

if (fail) {
  console.error(`\n✗ lessons:check: ${count} lessons, violations found. A prevention must be a real runbook or gate, not a sentiment.`);
  process.exit(1);
}
console.log(`✅ lessons:check: ${count} lessons, every Prevention resolves to a real runbook/gate.`);