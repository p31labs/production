#!/usr/bin/env node
/**
 * verify-no-html-comments — the HTML-comment leak gate (void-fill item 1).
 *
 * Every `<!-- ... -->` comment in an .astro template renders into the served
 * DOM (the "comment text across the top" leak). Astro's own `<!--astro:end-->`
 * markers are RUNTIME-generated, never source — so source must contain ZERO
 * `<!--` hits. Notes that must survive live as // JS comments in frontmatter
 * or {/* * /} Astro comments (never rendered).
 *
 * Usage:
 *   node scripts/verify-no-html-comments.mjs            — scan src/**\/*.astro
 *   node scripts/verify-no-html-comments.mjs <file...>  — also scan extra files
 *     (used by the negative control: plant a comment, expect exit 1)
 *
 * Exit 0 = clean; exit 1 = at least one HTML comment hit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function collectAstro(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectAstro(full));
    } else if (entry.name.endsWith('.astro')) {
      out.push(full);
    }
  }
  return out;
}

const files = [...collectAstro(path.join(root, 'src')), ...process.argv.slice(2)];
const hits = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('<!--')) {
      hits.push(`${path.relative(root, file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
    }
  });
}

if (hits.length > 0) {
  console.error(
    `verify-no-html-comments: ${hits.length} HTML comment hit(s) in .astro source — these render into the DOM. Convert to // (frontmatter) or {/* * /} (Astro).`
  );
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}

console.log('verify-no-html-comments: clean — 0 HTML comments in src/**/*.astro');