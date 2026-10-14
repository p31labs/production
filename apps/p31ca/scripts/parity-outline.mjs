#!/usr/bin/env node
/**
 * parity-outline.mjs — H4 sweep lane: DOM-outline parity checker.
 *
 * Serializes a page's DOM into a structural outline (tag, id, normalized
 * class list, direct text, key attributes) from two origins and diffs them.
 * Class tokens the sweep moves (bare Tailwind utilities and their prefixed
 * replacements) are normalized away, so a pure class-rename sweep produces
 * an EMPTY diff. Text/content drift between origins surfaces as real diffs.
 *
 * Usage:
 *   node scripts/parity-outline.mjs --snapshot=/tmp/opencode/parity/b0.json
 *   node scripts/parity-outline.mjs --compare-with=/tmp/opencode/parity/b0.json
 *   node scripts/parity-outline.mjs --origin=live --compare-with=/tmp/opencode/parity/b0.json
 *
 * Options:
 *   --pages=a,b          comma list (default covers swept surfaces)
 *   --origin=live|preview  which base URL to read (default preview)
 *   --snapshot=PATH      write outlines to PATH, then exit
 *   --compare-with=PATH  diff against a previously written snapshot
 *   --live=URL --preview=URL   origin base URLs
 *
 * Zero network deps beyond playwright (resolved from /home/p31/node_modules).
 */
import { chromium } from '/home/p31/node_modules/playwright/index.mjs';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const get = (name, dflt) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : dflt;
};

const LIVE = get('live', 'https://p31ca.org');
const PREVIEW = get('preview', 'http://127.0.0.1:4321');
const origin = get('origin', 'preview');
const BASE = origin === 'live' ? LIVE : PREVIEW;
const pages = (get('pages', '/,/about/,/enterprise/,/hire/,/research/,/faq/,/get-involved/,/annual-report/,/team/,/verify/'))
  .split(',').map((p) => p.trim()).filter(Boolean);
const snapshotPath = get('snapshot', '');
const compareWith = get('compare-with', '');

// Self-contained for page.evaluate: strip the bare utilities this lane moves
// AND any prefixed alias ending in one of those names; also strip build noise
// (Astro scope hashes, mermaid runtime IDs, hashed /_astro asset paths) so a
// pure class-rename sweep yields an empty diff.
const outlineExpr = () => {
  const sweptRe = /^(?:[a-z0-9]+-)*(?:items-center|justify-center|justify-between|items-start|uppercase|truncate|pointer-events-none|rounded|pt-[0-9]+|pb-[0-9]+|delay-[0-9]+|md[-:](?:items-center|justify-between|pb-[0-9]+|pt-[0-9]+))$/;
  const scopeRe = /^astro-[a-z0-9]{6,12}$/;
  const msRe = /^(ms|msh)-/; // MeatspaceMesh prefix rename (inventory heuristic collision fix)
  const out = [];
  const walk = (el, depth) => {
    if (depth > 60) return;
    for (const child of el.children) {
      const tag = child.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') continue;
      const kept = [...child.classList].filter((c) => !sweptRe.test(c) && !scopeRe.test(c) && !msRe.test(c)).sort();
      let text = '';
      for (const node of child.childNodes) {
        if (node.nodeType === 3) text += node.textContent;
      }
      text = text.replace(/\s+/g, ' ').replace(/mermaid-\d+/g, 'mermaid-N').trim().slice(0, 120);
      let id = child.id || '';
      if (/^mermaid-\d+/.test(id)) id = '';
      const rec = { t: tag.toLowerCase(), i: id, c: kept.join(' '), x: text };
      const href = child.getAttribute('href');
      const src = child.getAttribute('src');
      const alt = child.getAttribute('alt');
      const aria = child.getAttribute('aria-label');
      if (href) rec.h = href.split('?')[0].replace(/\/_astro\/[^/]+/g, '/_astro/N');
      if (src) rec.s = src.split('?')[0].replace(/\/_astro\/[^/]+/g, '/_astro/N');
      if (alt) rec.a = alt.slice(0, 80);
      if (aria) rec.l = aria.slice(0, 80);
      out.push(rec);
      walk(child, depth + 1);
    }
  };
  walk(document.body, 0);
  return out;
};

const outlineToStr = (o) => o.map((r) => JSON.stringify(r)).join('\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const outlines = {};
for (const p of pages) {
  const url = `${BASE}${p.startsWith('/') ? p : `/${p}`}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(600);
    outlines[p] = await page.evaluate(outlineExpr);
  } catch (e) {
    outlines[p] = { __error: String(e).slice(0, 200) };
  }
}
await browser.close();

if (snapshotPath) {
  writeFileSync(snapshotPath, JSON.stringify(outlines, null, 1));
  console.log(`parity-outline: snapshot → ${snapshotPath} (${pages.length} pages, origin=${origin})`);
} else if (compareWith && existsSync(compareWith)) {
  const prev = JSON.parse(readFileSync(compareWith, 'utf8'));
  let total = 0;
  const report = [];
  for (const p of pages) {
    const a = outlines[p];
    const b = prev[p];
    if (a?.__error || b?.__error) {
      report.push(`${p}: ORIGIN ERROR current=${a?.__error || 'ok'} other=${b?.__error || 'ok'}`);
      total += 1;
      continue;
    }
    if (!b) {
      report.push(`${p}: missing in snapshot`);
      total += 1;
      continue;
    }
    const sa = outlineToStr(a);
    const sb = outlineToStr(b);
    if (sa === sb) continue;
    const la = sa.split('\n');
    const lb = sb.split('\n');
    const diffs = [];
    let i = 0;
    let j = 0;
    let guard = 0;
    while ((i < la.length || j < lb.length) && guard < 400) {
      guard += 1;
      if (la[i] === lb[j]) { i += 1; j += 1; continue; }
      diffs.push(`  -@${i} current=${la[i] ?? '∅'} | other=${lb[j] ?? '∅'}`);
      let synced = false;
      for (let k = 1; k <= 4 && i + k < la.length; k += 1) {
        if (la[i + k] === lb[j]) { i += k; synced = true; break; }
      }
      if (!synced) {
        for (let k = 1; k <= 4 && j + k < lb.length; k += 1) {
          if (la[i] === lb[j + k]) { j += k; synced = true; break; }
        }
      }
      if (!synced) { i += 1; j += 1; }
    }
    report.push(`${p}: ${diffs.length} diffs\n${diffs.slice(0, 5).join('\n')}`);
    total += diffs.length;
  }
  console.log(`parity-outline: ${report.length} pages with diffs (~${total})`);
  for (const r of report) console.log(r);
  process.exit(total === 0 ? 0 : 1);
} else {
  console.log(`parity-outline: outlines captured (${pages.length} pages, origin=${origin}); no snapshot/compare requested`);
}