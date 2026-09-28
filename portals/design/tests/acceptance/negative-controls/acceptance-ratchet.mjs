#!/usr/bin/env node
/**
 * Negative control: the ratchet must FAIL on a count > baseline (growth).
 * Runs ratchet.mjs with a count one above the baseline — must exit non-zero.
 *
 * Exits 0 iff the ratchet correctly fails on growth.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ratchet = resolve(import.meta.dirname, '..', 'ratchet.mjs');
const baseline = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'known-fails.json'), 'utf8')).baseline;

let exit;
try {
  execSync(`node ${ratchet} ${baseline + 1}`, { stdio: 'pipe', timeout: 20000 });
  exit = 0; // ratchet PASSED on growth — furniture
} catch (e) {
  exit = e.status ?? 1;
}
if (exit === 0) {
  console.error(`ratchet PASSED with count ${baseline + 1} > baseline ${baseline} — cannot detect growth.`);
  process.exit(1);
}
console.log(`ratchet correctly failed on growth (count ${baseline + 1} > baseline ${baseline}).`);
process.exit(0);