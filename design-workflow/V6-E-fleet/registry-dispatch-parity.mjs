#!/usr/bin/env node
/* P31-HEADER
 * id: p31_v6_registry_dispatch_parity_20261011_v1.0
 * type: gate (source-level registry↔dispatch parity)
 * component: design-workflow/V6-E-fleet
 * status: live
 * retention: keep-forever
 * created: 2026-10-11T00:00:00Z
 * owner: half-sour
 */

// Source-level registry↔dispatch parity for MCP workers:
// every tool registered in the TOOLS array must have a `case '<name>':`
// in the dispatch switch, and vice versa. The same check that caught the
// design-core 17-vs-13 drift, now reusable against any worker source.
//
//   node registry-dispatch-parity.mjs <index.ts>           → exit 0 parity, 1 drift
//   node registry-dispatch-parity.mjs --negative <dir>     → negative control (MUST exit 1)
//
// Brace-aware extraction (handles nested schemas). Zero deps.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function extractBalanced(s, start, openC, closeC) {
  let depth = 0, j = start;
  while (true) {
    const c = s[j];
    if (c === openC) depth++;
    else if (c === closeC) {
      depth--;
      if (depth === 0) return s.slice(start, j + 1);
    }
    j++;
    if (j - start > 400000) throw new Error('unbounded extraction');
  }
}

function parity(srcPath) {
  const src = readFileSync(srcPath, 'utf8');
  const toolsStart = src.indexOf('const TOOLS = [');
  if (toolsStart < 0) throw new Error(`no TOOLS array in ${srcPath}`);
  const arr = extractBalanced(src, toolsStart + 'const TOOLS = '.length, '[', ']');
  const registered = new Set([...arr.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]));

  const sw = src.indexOf('switch (name)', toolsStart);
  if (sw < 0) throw new Error(`no dispatch switch in ${srcPath}`);
  const swb = extractBalanced(src, src.indexOf('{', sw), '{', '}');
  const cases = new Set([...swb.matchAll(/case\s+'([^']+)'/g)].map((m) => m[1]));

  const missing = [...registered].filter((t) => !cases.has(t)).sort();
  const extra = [...cases].filter((t) => !registered.has(t)).sort();
  return { registered: registered.size, dispatched: cases.size, missing, extra };
}

const argv = process.argv.slice(2);
if (argv[0] === '--negative') {
  // Build a sabotage fixture: a synthetic worker with one missing case.
  const dir = argv[1];
  mkdirSync(dir, { recursive: true });
  const src = join(dir, 'neg.ts');
  writeFileSync(src, `const TOOLS = [ { name: 'a' }, { name: 'b' } ];
function d(name: string) {
  switch (name) {
    case 'a': return 1;
    default: return 0;
  }
}`);
  const r = parity(src);
  const fail = r.missing.length > 0;
  console.log(`NEGATIVE CONTROL: registered=${r.registered} dispatched=${r.dispatched} missing=[${r.missing}] → ${fail ? 'FAIL (drift detected — control fails as designed)' : 'PASS (control broken)'}`);
  process.exit(fail ? 1 : 0);
}

const r = parity(argv[0]);
const ok = r.missing.length === 0 && r.extra.length === 0;
console.log(`registered: ${r.registered} | dispatched: ${r.dispatched}`);
console.log(`missing handlers: ${r.missing.length ? r.missing.join(', ') : 'NONE'}`);
console.log(`extra cases: ${r.extra.length ? r.extra.join(', ') : 'NONE'}`);
console.log(`RESULT: ${ok ? 'PARITY — no drift' : 'DRIFT FOUND'}`);
process.exit(ok ? 0 : 1);