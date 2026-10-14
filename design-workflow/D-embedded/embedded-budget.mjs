#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// D/embedded-budget.mjs — Lane D size-budget gate (runbook §8 D-3, gate table
// row "embedded-budget"). Node 24 ESM, node:zlib only.
//
// Gates (fail closed — any failure exits 1):
//   1. Web bundle: gzipSync(ui/index.html) + gzipSync(ui/styles.css) ≤ 102400 B
//      (SPIFFS "assets" partition budget, ~4 MB available — the 100 KB number
//       is the discipline gate from the device-tier contract).
//   2. Theme header: p31_theme.h ≤ 8192 B (raw).
// Missing inputs = FAIL.
//
// Usage:
//   node embedded-budget.mjs                # default: ../ui + ../dist/p31_theme.h (D layout)
//   node embedded-budget.mjs <webDir> <headerPath>   # explicit (negative control: fixtures)
// NEGATIVE CONTROL: D/fixtures/oversized.css is ~200 KB of incompressible
// (pseudo-random) content so gzip CANNOT collapse it — the gate must fail.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = process.argv[2] || path.join(HERE, 'ui');
const HEADER = process.argv[3] || path.join(HERE, 'dist', 'p31_theme.h');
const WEB_BUDGET = 102400; // bytes, gzipped (device-tier contract: embedded.maxGzipBytes)
const HEADER_BUDGET = 8192; // bytes, raw

let failed = false;

function report(ok, label, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${detail}`);
  if (!ok) failed = true;
}

// ── Gate 1: web bundle (every .html/.css asset in the dir counts) ────────────
const inputs = fs.readdirSync(WEB_DIR, { withFileTypes: true })
  .filter((e) => e.isFile() && /\.(html|css)$/i.test(e.name))
  .map((e) => path.join(WEB_DIR, e.name))
  .sort();
if (inputs.length === 0) {
  report(false, 'web bundle', `no .html/.css assets found in ${WEB_DIR} — gate cannot pass`);
} else {
  let webTotal = 0;
  for (const f of inputs) {
    const gz = gzipSync(fs.readFileSync(f)).length;
    webTotal += gz;
    report(true, `web:${path.basename(f)}`, `raw=${fs.statSync(f).size}B gzip=${gz}B`);
  }
  report(webTotal <= WEB_BUDGET, 'web bundle total', `gzip=${webTotal}B ≤ ${WEB_BUDGET}B`);
}

// ── Gate 2: theme header ──────────────────────────────────────────────────────
if (!fs.existsSync(HEADER)) {
  report(false, 'header', `${HEADER} missing — gate cannot pass without it`);
} else {
  const size = fs.statSync(HEADER).size;
  report(size <= HEADER_BUDGET, 'header', `${path.basename(HEADER)} ${size}B ≤ ${HEADER_BUDGET}B`);
}

console.log('');
if (failed) {
  console.log(`BUDGET GATE: FAILED (${WEB_DIR})`);
  process.exit(1);
}
console.log(`BUDGET GATE: PASSED (${WEB_DIR})`);
process.exit(0);