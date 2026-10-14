#!/usr/bin/env node
/**
 * token-drift-check.mjs — P31 token drift detector (fix-plan
 * p31ca-phase1-token-core-2026-10-13 §2/§3; phase2 RC2).
 *
 * Plain-node (zero-dep) scanner over surface directories. Reports:
 *
 *   1. `--p31-*` RE-DECLARATIONS outside the canonical token sources
 *      (packages/canon/dist/tokens.css, packages/canon/src/theming/
 *      theme-store.ts, packages/canon/tokens/tokens.dtc.json). A surface
 *      declaring its own `--p31-*` value is a fork the moment L2 lands
 *      (parallel-paths-enterprise-runbook.md §2).
 *   2. RAW color literals (oklch(…), #hex, rgba(…), rgb(…), hsl(…)) in
 *      component style files (.css / .astro style blocks / .tsx / .ts
 *      style-object strings).
 *
 * `var(--p31-x)` alias usage (the mcp-marketplace adapter pattern) is FINE
 * and NOT flagged — only declarations carrying a concrete value are.
 *
 * Exit codes: 0 = clean; 1 = findings (gate mode); with `--no-fail` the
 * exit is ALWAYS 0 and the run prints a summary instead (baseline week:
 * STATE.md "In Flight" — report-only until the estate adopts L2).
 *
 * Usage: node scripts/token-drift-check.mjs [--no-fail] <dir...>
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';

const noFail = process.argv.includes('--no-fail');
const dirs = process.argv.slice(2).filter((a) => !a.startsWith('--'));

if (!dirs.length) {
  console.error('usage: node scripts/token-drift-check.mjs [--no-fail] <dir...>');
  process.exit(2);
}

const CANONICAL = new Set([
  /packages[\\/]canon[\\/]dist[\\/]tokens\.css$/,
  /packages[\\/]canon[\\/]src[\\/]theming[\\/]theme-store\.ts$/,
  /packages[\\/]canon[\\/]tokens[\\/]tokens\.dtc\.json$/,
  /packages[\\/]canon[\\/]tokens[\\/]dist[\\/]tokens\.resolved\.json$/,
  /packages[\\/]canon[\\/]src[\\/]tokens\.ts$/,
  /packages[\\/]canon[\\/]dist[\\/]tokens\.mjs$/,
]);

const EXT = new Set(['.css', '.astro', '.tsx', '.ts', '.jsx', '.js', '.mjs']);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.astro' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && EXT.has(p.slice(p.lastIndexOf('.')))) yield p;
  }
}

const REDECL = /(--p31-[a-z0-9-]+)\s*:\s*([^;]+);/gi;
const COLOR_LITERAL = /(oklch\s*\(|oklab\s*\(|#(?:[0-9a-fA-F]{3,8})\b|rgba?\s*\(|hsla?\s*\(|color-mix\s*\([^)]*?in\s+(?:srgb|oklch|oklab)\b)/g;
const PURE_ALIAS = /^var\(\s*--p31-[a-z0-9-]+\)\s*$/i;

const findings = { redecls: [], literals: [] };
let filesScanned = 0;

const isCanonical = (p) => [...CANONICAL].some((re) => re.test(p.replace(/\//g, sep)));

for (const dirArg of dirs) {
  const root = resolve(dirArg);
  if (!existsSync(root)) {
    console.error(`drift-check: ${dirArg} does not exist`);
    process.exit(2);
  }
  for await (const file of walk(root)) {
    if (isCanonical(file)) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    filesScanned++;
    const rel = relative(process.cwd(), file);

    // 1. --p31-* re-declarations
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (!line.includes('--p31-')) return;
      REDECL.lastIndex = 0;
      let m;
      while ((m = REDECL.exec(line)) !== null) {
        const value = m[2].trim();
        if (PURE_ALIAS.test(value)) continue; // alias adapter — allowed
        findings.redecls.push({ file: rel, line: i + 1, name: m[1], value });
      }
    });

    // 2. raw color literals in style contexts
    //    .css/.astro: declaration lines only; .ts/.tsx: lines with style-ish context
    const isCss = file.endsWith('.css') || file.endsWith('.astro');
    lines.forEach((line, i) => {
      if (!line.includes(':') && !line.includes('#')) return;
      if (!isCss) {
        const t = line.trim();
        const isStyleCtx =
          t.includes('style') || t.includes('color') || t.includes('background') ||
          t.includes('fill') || t.includes('stroke') || t.includes('shadow') ||
          t.includes('oklch') || t.includes('oklab') || /['"`]#[0-9a-fA-F]{3,8}/.test(t) ||
          t.includes('rgba') || t.includes('rgb(') || t.includes('hsl');
        if (!isStyleCtx) return;
      }
      COLOR_LITERAL.lastIndex = 0;
      let m;
      while ((m = COLOR_LITERAL.exec(line)) !== null) {
        // skip tailwind-@theme hex definitions? No — report them; they are
        // exactly the drift the Phase 3 port must replace (runbook §4).
        findings.literals.push({
          file: rel,
          line: i + 1,
          literal: m[0].length > 24 ? m[0].slice(0, 24) + '…' : m[0],
        });
      }
    });
  }
}

const total = findings.redecls.length + findings.literals.length;

console.log(`token-drift-check: scanned ${filesScanned} files across ${dirs.join(', ')}`);
console.log(`  --p31-* re-declarations: ${findings.redecls.length}`);
console.log(`  raw color literals:      ${findings.literals.length}`);
console.log(`  total findings:          ${total}\n`);

const top = 40;
const shown = findings.redecls.slice(0, top);
for (const f of shown) {
  console.log(`  redecl ${f.file}:${f.line}  ${f.name}: ${f.value.slice(0, 60)}`);
}
const shownLit = findings.literals.slice(0, Math.max(0, top - shown.length));
for (const f of shownLit) {
  console.log(`  literal ${f.file}:${f.line}  ${f.literal}`);
}
if (findings.redecls.length > shown.length || findings.literals.length > shownLit.length) {
  console.log(`  … (${findings.redecls.length - shown.length} more redecls, ${findings.literals.length - shownLit.length} more literals)`);
}

if (noFail) {
  console.log(`\ndrift-check: ${total} finding(s) — report-only baseline (--no-fail), exit 0.`);
  process.exit(0);
}
if (total) {
  console.error(`\ndrift-check: FAILED — ${total} finding(s).`);
  process.exit(1);
}
console.log('\ndrift-check: clean.');
process.exit(0);