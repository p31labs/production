#!/usr/bin/env node
/**
 * sweep-legacy-add.mjs — H4 sweep lane: append compiled utility rules to
 * src/styles/sweep-legacy.css at suffix-sorted position (the file's
 * established ordering: rules are grouped by utility name after the file
 * prefix). Idempotent: skips rules whose selector already exists.
 *
 * Usage:
 *   node scripts/sweep-legacy-add.mjs --rule='.st-pointer-events-none{pointer-events:none}'
 *   node scripts/sweep-legacy-add.mjs --media='(min-width:48rem)' --rule='.sf-md-items-center{align-items:center}'
 *   node scripts/sweep-legacy-add.mjs --file=/tmp/rules.json
 *     rules.json: [{ "sel": ".x-y", "body": "a:1", "media": "(min-width:48rem)" }]
 *
 * Convention: declaration bodies are verbatim copies of the compiled
 * Tailwind utility (theme vars statically substituted, .25rem for --spacing).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LEGACY = resolve(ROOT, 'src', 'styles', 'sweep-legacy.css');

const rules = [];
const args = process.argv.slice(2);
const fileArg = args.find((a) => a.startsWith('--file='));
if (fileArg) {
  rules.push(...JSON.parse(readFileSync(resolve(ROOT, fileArg.slice(7)), 'utf8')));
} else {
  const mediaArg = args.find((a) => a.startsWith('--media='));
  const media = mediaArg ? mediaArg.slice(8) : null;
  for (const a of args.filter((x) => x.startsWith('--rule='))) {
    const r = a.slice(7);
    const m = r.match(/^\.([^\s{]+)\{([^}]*)\}$/);
    if (!m) throw new Error(`bad rule: ${r}`);
    rules.push({ sel: `.${m[1]}`, body: m[2], media });
  }
}

const src = readFileSync(LEGACY, 'utf8');
const lines = src.split('\n');
const layerStart = lines.findIndex((l) => l.includes('@layer utilities'));
const blockEnd = lines.findIndex((l, i) => i > layerStart && l.trim() === '}');

const keyOf = (line) => {
  const m = line.match(/\.([a-z0-9]+)-([a-z0-9][a-z0-9-]*)\s*\{/);
  if (m) return m[2];
  const m2 = line.match(/\.([a-z0-9-]+)\{/);
  return m2 ? m2[1] : line;
};

let inserted = 0;
let skipped = 0;
const newLines = [];
for (const r of rules) {
  if (src.includes(`.${r.sel}{`) || src.includes(`{${r.sel}{`)) {
    skipped += 1;
    continue;
  }
  const line = r.media
    ? `  @media (${r.media}){${r.sel}{${r.body}}}`
    : `  ${r.sel}{${r.body}}`;
  const nameKey = r.sel.slice(r.sel.indexOf('-') + 1);
  newLines.push({ line, key: nameKey });
  inserted += 1;
}

newLines.sort((a, b) => a.key.localeCompare(b.key));

const bodyLines = lines.slice(layerStart + 1, blockEnd);
for (const { line, key } of newLines) {
  let idx = bodyLines.length;
  for (let i = 0; i < bodyLines.length; i += 1) {
    const k = keyOf(bodyLines[i]);
    if (key.localeCompare(k) < 0) { idx = i; break; }
  }
  bodyLines.splice(idx, 0, line);
}

const out = [...lines.slice(0, layerStart + 1), ...bodyLines, ...lines.slice(blockEnd)].join('\n');
writeFileSync(LEGACY, out);
console.log(`sweep-legacy-add: ${inserted} inserted, ${skipped} skipped → src/styles/sweep-legacy.css`);