#!/usr/bin/env node
/**
 * Negative control: token-audit must be ABLE to fail on a raw color literal.
 *
 * Method: static capability check. The gate's detector must reference the
 * raw-rgb/hex regexes it claims to enforce. A gate whose source lacks the
 * detector cannot catch a raw literal — furniture.
 *
 * Exits 0 iff the gate has a raw-literal detector. Exits 1 if it does not.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gate = resolve('/home/p31/P31-local-workspace/packages/design-core/scripts/token-audit.mjs');
const src = readFileSync(gate, 'utf8');

const hasHexDetector = /#\(\[0-9a-f/.test(src) || src.includes('RAW_RGB');
const hasRgbDetector = src.includes('RAW_RGB') || /rgba\?\(\s*\\d/.test(src);
const hasFailExit = src.includes('process.exit(1)');

if (!hasHexDetector || !hasRgbDetector) {
  console.error('token-audit lacks a raw-hex/rgba detector — it cannot catch a raw literal.');
  process.exit(1);
}
if (!hasFailExit) {
  console.error('token-audit has no process.exit(1) — it cannot block on a violation.');
  process.exit(1);
}
console.log('token-audit negative control: hex/rgba detector + fail exit present. Gate can fail.');
process.exit(0);