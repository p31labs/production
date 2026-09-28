#!/usr/bin/env node
/**
 * Acceptance known-fails ratchet (Wave 0, Path R).
 *
 * This is a RATCHET. The count of known fails may not exceed the baseline.
 * New code adds zero; debt only trends down. When the count drops, the floor
 * must be lowered in the same commit — otherwise the headroom silently permits
 * the reintroduction of debt up to the gap.
 *
 * Properties (per the field's ratchet discipline):
 *   1. Prevent growth:  current count <= baseline count. New finding → fail.
 *   2. Lock the gain:   if current count < baseline count by more than
 *      LOCK_THRESHOLD, print a "lower the floor" notice AND exit non-zero so
 *      the gain is locked in the same commit (not silently banked).
 *
 * Usage: node tests/acceptance/ratchet.mjs <current-count>
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCK_THRESHOLD = 2; // more than this of headroom forces the floor down now

const here = resolve(import.meta.dirname);
const baselineFile = resolve(here, 'known-fails.json');
const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));

const current = Number(process.argv[2]);
if (!Number.isFinite(current)) {
  console.error('Usage: node tests/acceptance/ratchet.mjs <current-known-fail-count>');
  process.exit(2);
}

const floor = baseline.baseline;
let fail = 0;

if (current > floor) {
  console.error(`✗ RATCHET VIOLATION: ${current} known fails exceeds baseline ${floor}.`);
  console.error(`  A new known fail was added. Fix it or re-approve it deliberately (baseline bump = a decision, not a default).`);
  fail = 1;
} else if (floor - current > LOCK_THRESHOLD) {
  console.error(`✗ RATCHET: headroom is ${floor - current} (> ${LOCK_THRESHOLD}). Lock the gain now:`);
  console.error(`  lower known-fails.json baseline to ${current} in this same commit, or the gap`);
  console.error(`  silently permits ${floor - current} units of debt to return.`);
  fail = 1;
} else if (current < floor) {
  console.log(`ℹ RATCHET: ${current} < ${floor}. Lower the floor to ${current} to lock the gain (optional if gap ≤ ${LOCK_THRESHOLD}).`);
} else {
  console.log(`✅ RATCHET OK: ${current} known fails, at the ${floor} baseline.`);
}

process.exit(fail);