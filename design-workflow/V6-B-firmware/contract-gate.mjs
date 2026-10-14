#!/usr/bin/env node
// contract-gate.mjs — P31 Lane B (v6.0) /api/status contract check.
// Verifies p31_http.c registers the GET /api/status route AND the handler
// emits every field of the D-embedded/firmware-integration.md §3 contract:
//   spoons, lora, rssi, mesh, status, did
// Exit 0 when the contract is complete; exit 1 when any part is missing
// (negative control: run against a sabotaged copy with the handler removed).
//
// Usage: node contract-gate.mjs [p31_http.c]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = process.argv[2] ||
  join(__dirname, '..', '..', '..', 'P31-local-workspace',
       'firmware', 'node-zero', 'main', 'p31_http.c');

const REQUIRED_FIELDS = ['spoons', 'lora', 'rssi', 'mesh', 'status', 'did'];
const src = readFileSync(TARGET, 'utf8');

const problems = [];

if (!src.includes('.uri = "/api/status"')) {
  problems.push('missing route registration: .uri = "/api/status"');
}
if (!/api_status_handler/.test(src)) {
  problems.push('missing handler: api_status_handler');
}
for (const f of REQUIRED_FIELDS) {
  if (!src.includes(`"${f}"`)) {
    problems.push(`missing contract field: "${f}"`);
  }
}

console.log(`contract-gate: ${TARGET}`);
if (problems.length === 0) {
  console.log('  route + handler + all 6 contract fields present — PASS');
  process.exit(0);
}
for (const p of problems) console.log(`  FAIL: ${p}`);
process.exit(1);