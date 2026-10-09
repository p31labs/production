#!/usr/bin/env node
/**
 * Negative control: canon-purity must FAIL on a real NaN color literal.
 *
 * Method: fixture-copy. The gate accepts --root <dir>, so we build a /tmp
 * copy of design-core (src + manifest.json + tokens/tokens.json), inject a
 * `.ts` file containing `oklch(NaN NaN NaN)` into the copy's src/, run the
 * REAL gate against the copy, assert it exits non-zero, and delete the copy.
 * The real canon tree is never mutated, so a crash mid-NC leaves no residue.
 *
 * A gate that only *mentions* the detector in its source cannot prove it
 * catches a NaN; this control forces the gate to actually fail on one.
 *
 * Exits 0 (with NEGATIVE_CONTROL_OK) iff the real gate fails on the fixture.
 */
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const gate = resolve('/home/p31/P31-local-workspace/packages/design-core/scripts/canon-purity.mjs');
const root = resolve('/home/p31/P31-local-workspace/packages/design-core');

// Copy the canon into /tmp so the gate scans a throwaway tree.
const fixtureRoot = mkdtempSync(join(tmpdir(), 'govern-nc-canon-'));
cpSync(join(root, 'src'), join(fixtureRoot, 'src'), { recursive: true });
cpSync(join(root, 'manifest.json'), join(fixtureRoot, 'manifest.json'));
if (existsSync(join(root, 'tokens', 'tokens.json'))) {
  cpSync(join(root, 'tokens'), join(fixtureRoot, 'tokens'), { recursive: true });
}
const fixture = join(fixtureRoot, 'src', '__nc__nan-fixture.ts');

let exit = 1;
try {
  writeFileSync(fixture, 'export const corrupt = "oklch(NaN NaN NaN)";\n');

  try {
    execSync(`node ${gate} --root ${fixtureRoot}`, { stdio: 'pipe', timeout: 20000 });
    exit = 0; // gate PASSED on the NaN fixture — furniture
  } catch (e) {
    exit = e.status ?? 1;
  }
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

if (exit === 0) {
  console.error('canon-purity PASSED with oklch(NaN NaN NaN) in src — it cannot detect NaN corruption.');
  process.exit(1);
}
console.log('canon-purity correctly failed on a real NaN fixture (oklch(NaN NaN NaN)).');
console.log('NEGATIVE_CONTROL_OK');
process.exit(0);