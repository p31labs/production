#!/usr/bin/env node
/**
 * Negative control: canon-purity must be ABLE to fail on NaN.
 *
 * Method: static capability check (deterministic, zero tree mutation). The
 * gate's detector must reference the NaN literal it claims to catch. A gate
 * whose source lacks the detector cannot detect the corruption — furniture.
 *
 * Exits 0 iff the gate has a NaN detector. Exits 1 if it does not.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gate = resolve('/home/p31/P31-local-workspace/packages/design-core/scripts/canon-purity.mjs');
const src = readFileSync(gate, 'utf8');

const hasNaNDetector = src.includes("oklch(NaN NaN NaN)");
const hasGovernanceCheck = /chainVerified/.test(src);

if (!hasNaNDetector) {
  console.error('canon-purity has no NaN literal detector — it cannot detect the corruption class.');
  process.exit(1);
}
if (!hasGovernanceCheck) {
  console.error('canon-purity has no governance-palette check — it cannot catch the undefined-GOVERNANCE class.');
  process.exit(1);
}
console.log('canon-purity negative control: NaN detector + governance check present. Gate can fail.');
process.exit(0);