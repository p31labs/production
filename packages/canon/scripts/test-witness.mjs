#!/usr/bin/env node
/**
 * @p31ca/canon — test-witness.mjs
 *
 * The reverse-classical differential. Proves a test can FAIL on a broken
 * thing, which is the only thing that distinguishes a gate from a checkmark.
 *
 * It mutates a file at a unique anchor, runs a test command against the mutant
 * and against the correct baseline, and reports whether the test discriminated
 * the two. A test that is green on BOTH is VACUOUS — it would survive the most
 * basic mutant of all, so it protects nothing (the false-green literature:
 * "a test that passes on both trees is VACUOUS").
 *
 * Verdicts (the exit code IS the verdict, so CI can branch):
 *   DISCRIMINATES (0) — baseline GREEN, mutant RED. The test is a real gate.
 *   VACUOUS      (3) — baseline GREEN, mutant GREEN. The test is theater.
 *   UNSATISFIED  (4) — baseline RED. The test already fails on correct code.
 *   ABSTAIN      (6) — anchor not found exactly once, or no --run command.
 *
 * Guards against the false-green mutation mode: the anchor must match exactly
 * once, and the baseline must be green, before the mutant is trusted as a
 * signal ("a mutation whose edit never applied reports a passing suite as
 * proof").
 *
 * Usage:
 *   node scripts/test-witness.mjs \
 *     --file /abs/path/Component.tsx \
 *     --anchor "aria-disabled" \
 *     --replace "aria-disabled-broken" \
 *     --run "cd /abs/portals/design && npx playwright test --config parity.playwright.config.ts -g 'Component'"
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const get = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const file = get('file');
const anchor = get('anchor');
const replace = get('replace');
const run = get('run');

const DISCRIMINATES = 0;
const VACUOUS = 3;
const UNSATISFIED = 4;
const ABSTAIN = 6;

function abstain(msg) {
  console.error(`ABSTAIN (exit 6): ${msg}`);
  process.exit(ABSTAIN);
}

if (file === undefined || anchor === undefined || replace === undefined || run === undefined) {
  abstain('missing --file/--anchor/--replace/--run');
}
if (!existsSync(file)) {
  abstain(`file not found: ${file}`);
}

const original = readFileSync(file, 'utf8');

// Guard 1 — the anchor must match exactly once. A mutation whose edit never
// applied (zero matches) or is ambiguous (multiple matches) reports nothing.
const count = original.split(anchor).length - 1;
if (count !== 1) {
  abstain(`anchor matched ${count} times (must be exactly 1)`);
}

const runTest = () => {
  try {
    execSync(run, { stdio: 'ignore' });
    return 0; // green
  } catch {
    return 1; // red (or command failed)
  }
};

// Guard 2 — baseline must be green. If the test already fails on correct code,
// a red mutant proves nothing.
const baselineExit = runTest();
if (baselineExit !== 0) {
  console.error(`UNSATISFIED (exit 4): baseline is red — the test already fails on correct code.`);
  process.exit(UNSATISFIED);
}

// Apply the mutation, run, restore.
const mutated = original.replace(anchor, replace);
writeFileSync(file, mutated, 'utf8');
const mutantExit = runTest();
writeFileSync(file, original, 'utf8');

if (mutantExit !== 0) {
  console.log(`DISCRIMINATES (exit 0): the test went red on the mutant "${anchor}" → "${replace}" and green on the baseline.`);
  process.exit(DISCRIMINATES);
}

console.error(`VACUOUS (exit 3): the test was green on BOTH the mutant and the baseline. It witnesses nothing.`);
process.exit(VACUOUS);