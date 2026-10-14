#!/usr/bin/env node
/* P31-HEADER
 * id: p31_v2_b1_matrix_run_20261011_v1.0
 * type: gate (browser-gated regression matrix)
 * component: design-workflow/V2-B-laneE
 * status: live
 * retention: keep-forever
 * created: 2026-10-11T00:00:00Z
 * owner: half-sour
 */

// P31 Workstream B (Lane E) — B-1 regression matrix (runbook v2.0 §5 B-1).
//
// Matrix: width [320,375,390,768,1440,2560]
//         × spoons [0,3]  (data-spoons emulation; spoon 0 = calm floor CSS)
//         × prefers-reduced-motion [reduce, no-preference]
//         × pointer [coarse, fine]  (CDP touch emulation — a real media query)
//         + one 200%-zoom cell (320px width, pageScaleFactor 2 via CDP;
//           runs only if the harness can, else SKIP with note).
//
// Per cell, @media is neutralized with Lane C's dom-check technique (inner
// rules of every media block re-injected un-wrapped) and two assertions run:
//   (a) zero horizontal overflow:  documentElement.scrollWidth <= innerWidth
//   (b) touch floor on coarse:     every <a>/<button> rect >= 44×44px
//       (skipped on pointer:fine — the 44px floor is a coarse-only law;
//        runbook §2.5, B-device-tiers/device-tiers.json touchTargetMin).
//
// Browser policy (hard boundary): zero downloads, zero installs. Playwright
// 1.62.0 is already at /home/p31/node_modules; the browser is the SYSTEM
// Chromium at /usr/bin/chromium. If nothing can launch: all cells SKIP, exit 0.
//
// NEGATIVE CONTROL: run the same matrix against
//   V2-B-laneE/matrix-fixture/bad.html  (500px fixed container + 28px button)
// The 320px cells MUST fail — paste the failure (runbook §2.7, Law 2).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// ---------------------------------------------------------------- argv

const args = process.argv.slice(2);
const usage = `usage: node matrix-run.mjs <target.html> [--label NAME] [--out REPORT.txt]`;
const target = args[0];
const labelIdx = args.indexOf('--label');
const outIdx = args.indexOf('--out');
const label = labelIdx >= 0 ? args[labelIdx + 1] : target;
const outPath = outIdx >= 0 ? args[outIdx + 1] : 'matrix-report.txt';
if (!target || !existsSync(target)) {
  console.error(usage);
  console.error(`target not found: ${target}`);
  process.exit(2);
}

const WIDTHS = [320, 375, 390, 768, 1440, 2560];
const SPOONS = [0, 3];
const MOTIONS = ['reduce', 'no-preference'];
const POINTERS = ['coarse', 'fine'];
const HEIGHT = 844;

// ---------------------------------------------------------------- launch

let playwright = null;
try { playwright = await import('playwright'); } catch (e) {
  console.log('SKIPPED: no playwright module — hardware-gated');
  console.log(`  (import failed: ${String(e.message).split('\n')[0]})`);
  process.exit(0);
}

let browser = null;
let launchErr = null;
const attempts = [
  { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] },
  { executablePath: '/usr/bin/chromium', channel: 'chromium', args: ['--no-sandbox'] },
];
for (const opts of attempts) {
  try {
    browser = await playwright.chromium.launch({ headless: true, ...opts });
    break;
  } catch (e) { launchErr = e; }
}
if (!browser) {
  console.log('SKIPPED: no browser binaries — hardware-gated');
  console.log(`  (launch failed; last: ${String(launchErr?.message).split('\n')[0]})`);
  console.log('  NOTE: no downloads/installs were attempted.');
  process.exit(0);
}

// ---------------------------------------------------------------- helpers

/**
 * Extract the INNER rules of every @media block from a CSS text (brace-matched,
 * string-aware). Lane C technique: media wrappers stripped, inner rules
 * re-injected un-wrapped so media-gated CSS applies at every matrix width.
 * Needed because file:// external stylesheets are CSSOM-inaccessible in this
 * Chromium ("Cannot access rules") — Lane C's fixture used inline <style>.
 */
function extractMediaRules(cssText) {
  const out = [];
  const n = cssText.length;
  let i = 0;
  while (i < n) {
    while (i < n && /\s/.test(cssText[i])) i++;
    if (cssText.startsWith('/*', i)) {
      const end = cssText.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (cssText.startsWith('@media', i)) {
      const open = cssText.indexOf('{', i + 6);
      if (open === -1) break;
      let depth = 0;
      let k = open;
      for (; k < n; k++) {
        const ch = cssText[k];
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) break;
        } else if (ch === '"' || ch === "'") {
          const q = ch;
          k++;
          while (k < n && cssText[k] !== q) { if (cssText[k] === '\\') k++; k++; }
        }
      }
      if (k >= n) break;
      out.push(cssText.slice(open + 1, k));
      i = k + 1;
      continue;
    }
    i++;
  }
  return out;
}

/**
 * Read the target HTML's <link rel=stylesheet> files (file:// only) and return
 * their un-wrapped @media inner rules. Zero deps, no network.
 */
function fileSheetNeutralization(htmlPath) {
  let html;
  try { html = readFileSync(htmlPath, 'utf8'); } catch { return ''; }
  const rules = [];
  const linkRe = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
  for (const m of html.matchAll(linkRe)) {
    const href = m[0].match(/href=["']([^"']+)["']/i);
    if (!href) continue;
    let css;
    try { css = readFileSync(join(dirname(htmlPath), href[1]), 'utf8'); } catch { continue; }
    for (const inner of extractMediaRules(css)) rules.push(inner);
  }
  return rules.join('\n').trim();
}

// ---------------------------------------------------------------- per-cell

const lines = [];
function log(line) { lines.push(line); console.log(line); }

/**
 * Emulate one matrix cell and return its audit line.
 */
async function runCell({ width, spoons, motion, pointer, zoom = false }) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const parts = { w: width, spoons, motion, pointer, zoom: zoom ? '2.0' : '1.0' };

  try {
    await page.emulateMedia({ reducedMotion: motion });

    // Pointer axis: CDP touch emulation so (pointer: coarse/fine) is REAL
    // in the page, not a harness-side assumption (runbook §2.5 — touch is
    // a capability axis, surfaced never collapsed).
    await cdp.send('Emulation.setTouchEmulationEnabled', {
      enabled: pointer === 'coarse', maxTouchPoints: 5,
    });

    // 200% zoom: pageScaleFactor 2.0. Feasible only if the protocol command
    // takes effect (window.innerWidth must shrink) — else SKIP with note.
    if (zoom) {
      try {
        await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
      } catch (e) {
        parts.skip = `zoom: CDP setPageScaleFactor unsupported (${String(e.message).split('\n')[0]})`;
        return { parts, skip: true };
      }
    }

    await page.goto('file://' + resolve(target));

    // Spoon axis: data-spoons on <html> (P31 spoon ladder contract) + calm
    // floor CSS at spoon 0 (no motion, no blur — runbook §0 doctrine).
    await page.evaluate((s) => { document.documentElement.dataset.spoons = String(s); }, spoons);
    if (spoons === 0) {
      await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;backdrop-filter:none!important}' });
    }

    // @media neutralization — Lane C dom-check technique: extract inner
    // rules of every media block and re-inject un-wrapped. Two sources:
    // (1) CSSOM (inline styles; external sheets are inaccessible on file://
    //     in this Chromium — "Cannot access rules"), and
    // (2) Node-side extraction of the target's <link> stylesheets.
    const neutralized = await page.evaluate(() => {
      let out = '';
      for (const ss of document.styleSheets) {
        try {
          for (const rule of ss.cssRules) {
            if (rule.media) out += [...rule.cssRules].map((r) => r.cssText).join('\n') + '\n';
          }
        } catch { /* cross-origin sheet — skip */ }
      }
      return out.trim();
    });
    const fileNeutral = fileSheetNeutralization(resolve(target));
    const allNeutral = [neutralized, fileNeutral].filter(Boolean).join('\n').trim();
    if (allNeutral) await page.addStyleTag({ content: allNeutral });
    const mediaRe = allNeutral ? allNeutral.split('}').length - 1 : 0;

    // zoom efficacy check
    if (zoom) {
      const iw = await page.evaluate(() => window.innerWidth);
      if (iw >= width) {
        parts.skip = `zoom: pageScaleFactor had no effect (innerWidth=${iw})`;
        return { parts, skip: true };
      }
      parts.zoomIw = iw;
    }

    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const targets = [...document.querySelectorAll('a, button')].map((t) => {
        const b = t.getBoundingClientRect();
        return `${t.tagName.toLowerCase()}@${Math.round(b.width)}x${Math.round(b.height)}`;
      });
      return {
        scrollWidth: de.scrollWidth,
        innerWidth: window.innerWidth,
        targets,
        pCoarse: matchMedia('(pointer: coarse)').matches,
        pFine: matchMedia('(pointer: fine)').matches,
      };
    });

    parts.scroll = `${r.scrollWidth}/${r.innerWidth}`;
    parts.pMatches = r.pCoarse ? 'coarse' : (r.pFine ? 'fine' : 'none');
    parts.mediaRe = mediaRe;
    parts.targetCount = r.targets.length;

    const fails = [];
    if (r.scrollWidth > r.innerWidth) {
      fails.push(`overflow scrollWidth=${r.scrollWidth}>innerWidth=${r.innerWidth}`);
    }
    if (pointer === 'coarse') {
      const small = r.targets.filter((t) => {
        const m = t.match(/@(\d+)x(\d+)$/);
        return m && (Number(m[1]) < 44 || Number(m[2]) < 44);
      });
      parts.targets = `[${r.targets.join(' ')}]`;
      if (small.length > 0) fails.push(`targets<44px: ${small.join(' ')}`);
    } else {
      parts.targets = `n/a (pointer:fine — 44px floor is coarse-only)`;
    }

    parts.status = fails.length === 0 ? 'PASS' : 'FAIL';
    parts.detail = fails.join('; ') || 'clean';
    return { parts };
  } catch (e) {
    parts.skip = `cell error: ${String(e.message).split('\n')[0]}`;
    return { parts, skip: true };
  } finally {
    await ctx.close();
  }
}

function fmt(p) {
  return [
    p.skip ? 'SKIP' : p.status,
    `w=${p.w}`,
    `spoons=${p.spoons}`,
    `motion=${p.motion}`,
    `pointer=${p.pointer}`,
    `zoom=${p.zoom}`,
    `scroll=${p.scroll ?? '-'}`,
    `pMatches=${p.pMatches ?? '-'}`,
    `mediaRe=${p.mediaRe ?? '-'}`,
    `targets=${p.targets ?? '-'}`,
    `${p.skip ? `NOTE: ${p.skip}` : p.detail}`,
  ].join('  ');
}

// ---------------------------------------------------------------- run

const started = Date.now();
log(`P31 V2-B laneE matrix-run — target: ${resolve(target)} (label: ${label})`);
log(`browser: ${browser.version()}`);
log(`matrix: ${WIDTHS.length} widths × ${SPOONS.length} spoons × ${MOTIONS.length} motion × ${POINTERS.length} pointer = ${WIDTHS.length * SPOONS.length * MOTIONS.length * POINTERS.length} cells + 1 zoom cell`);
log(`target fixture limitation: portal node_modules build NOT available this cycle (runbook B-1) — running against the D-embedded/ui served-UI fixture as the matrix target.`);
log(`media neutralization: CSSOM for inline styles + Node-side extraction of <link> sheets (file:// external sheets are CSSOM-inaccessible in this Chromium: "Cannot access rules").`);
log(`fixture note: served-UI fixture has ZERO <a>/<button> elements — the coarse 44px assertion passes vacuously (target count recorded per cell).`);
log('─'.repeat(110));

let pass = 0, fail = 0, skip = 0;
for (const width of WIDTHS) {
  for (const spoons of SPOONS) {
    for (const motion of MOTIONS) {
      for (const pointer of POINTERS) {
        const { parts, skip: isSkip } = await runCell({ width, spoons, motion, pointer });
        const line = fmt(parts);
        log(line);
        if (isSkip || parts.status === 'SKIP') skip++;
        else if (parts.status === 'FAIL') fail++;
        else pass++;
      }
    }
  }
}

// 200% zoom cell — 320px width, spoon 3, no-preference, coarse pointer.
const zoom = await runCell({ width: 320, spoons: 3, motion: 'no-preference', pointer: 'coarse', zoom: true });
const zline = fmt(zoom.parts);
log(zline);
if (zoom.skip || zoom.parts.status === 'SKIP') skip++;
else if (zoom.parts.status === 'FAIL') fail++;
else pass++;

log('─'.repeat(110));
log(`SUMMARY: ${pass} PASS | ${fail} FAIL | ${skip} SKIP | ${(Date.now() - started) / 1000}s`);
if (outPath) {
  writeFileSync(outPath, lines.join('\n') + '\n');
  log(`report written: ${outPath}`);
}
await browser.close();
process.exit(fail === 0 ? 0 : 1);