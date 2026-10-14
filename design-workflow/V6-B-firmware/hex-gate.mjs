#!/usr/bin/env node
// hex-gate.mjs — P31 Lane B (v6.0) token-audit stance for firmware UI.
// Scans a C source file for lv_color_hex( hardcodes. Exit 1 if any are found
// (gate FAILS), exit 0 if clean. Default target: firmware/node-zero/main/p31_ui.c
//
// Usage: node hex-gate.mjs [file.c]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = process.argv[2] ||
  join(__dirname, '..', '..', '..', 'P31-local-workspace',
       'firmware', 'node-zero', 'main', 'p31_ui.c');

const src = readFileSync(TARGET, 'utf8');
const lines = src.split('\n');
let hits = 0;
for (let i = 0; i < lines.length; i++) {
  if (/\blv_color_hex\s*\(/.test(lines[i])) {
    hits++;
    console.log(`  ${TARGET}:${i + 1}: ${lines[i].trim()}`);
  }
}
console.log(`hex-gate: ${hits} lv_color_hex hardcode(s) in ${TARGET}`);
process.exit(hits === 0 ? 0 : 1);