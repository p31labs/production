#!/usr/bin/env node
/**
 * layout-invariants — the deterministic structural gate.
 *
 * The "cheapest signal first" layer of agent+human verification. DOM-based,
 * NOT screenshots — the research is explicit: "Structural assertions FIRST
 * (DOM-based, never screenshot OCR). Trust DOM, not pixels, for any structural
 * HTML claim."
 *
 * This catches the class of bug pixel-diff structurally cannot: a layout break
 * that --update-snapshots baked into a baseline. The 960px topbar in a 1440px
 * viewport is a DOM geometric fact, caught here in milliseconds, before any
 * model call.
 *
 * Usage:
 *   node layout-invariants.mjs <url>            # one route
 *   node layout-invariants.mjs <url> --json     # machine-readable
 *   node layout-invariants.mjs <url> --routes /catalog,/playground
 */
import { chromium } from 'playwright-core';

const VIEWPORT = { width: 1440, height: 900 };
const MIN_TOPBAR_RATIO = 0.95;      // topbar must span ≥95% viewport width
const CHROME_SELECTORS = [
  '.topbar', '.sidebar', '.main-workspace', '.app-main', 'main', 'nav',
];

function parseArgs() {
  const a = process.argv.slice(2);
  const url = a.find((x) => x.startsWith('http'));
  const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  const routes = (get('--routes') ?? '').split(',').filter(Boolean);
  return { url, json: a.includes('--json'), routes };
}

async function checkRoute(page, url, route) {
  await page.goto(url + route, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(800);

  return page.evaluate(({ minRatio, chromeSelectors }) => {
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const failures = [];
    const checks = [];

    // 1. Horizontal overflow — the top-level structural integrity signal.
    const scrollW = document.documentElement.scrollWidth;
    const noHorizOverflow = scrollW <= vw + 1;
    checks.push({ id: 'no-horizontal-overflow', pass: noHorizOverflow, detail: `${scrollW}px vs viewport ${vw}px` });
    if (!noHorizOverflow) failures.push('horizontal overflow: page scrollWidth exceeds viewport');

    // 2. Chrome elements within viewport bounds. A missing selector is a WARNING
    //    (info), not a failure — not every portal uses every container class.
    //    Two context rules keep this calibrated for real portals:
    //    (a) an element that is (or is inside) a position:fixed drawer fully
    //        translated off-canvas (translateX(-100%)) is legitimate chrome;
    //    (b) in-flow containers (main, .app-main) scroll vertically — their
    //        bottom legitimately exceeds the viewport. Bounds are enforced only
    //        for fixed/sticky chrome; in-flow horizontal position is
    //        informational (real breaks surface via the overflow + child-overflow
    //        checks).
    const isOffCanvasContext = (n) => {
      while (n && n !== document.body) {
        if (getComputedStyle(n).position === 'fixed') {
          const nr = n.getBoundingClientRect();
          if (nr.right <= 0 || nr.left >= vw) return true;
        }
        n = n.parentElement;
      }
      return false;
    };
    for (const sel of chromeSelectors) {
      const el = document.querySelector(sel);
      if (!el) { checks.push({ id: `absent-${sel}`, pass: true, detail: `${sel} not present (ok)` }); continue; }
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const isFixedSticky = style.position === 'fixed' || style.position === 'sticky';
      const offCanvas = isOffCanvasContext(el);
      checks.push({ id: `drawer-context-${sel}`, pass: true, detail: offCanvas ? `${sel} inside off-canvas drawer (ok)` : 'visible context' });
      if (offCanvas) continue;

      if (isFixedSticky) {
        const within = r.left >= 0 && r.top >= 0 && r.right <= vw + 1 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 1;
        checks.push({ id: `bounds-${sel}`, pass: within, detail: `x=${Math.round(r.left)} w=${Math.round(r.width)} of ${vw}` });
        if (!within) failures.push(`${sel} outside viewport bounds`);
      } else {
        checks.push({ id: `inflow-x-${sel}`, pass: true, detail: `x=${Math.round(r.left)} w=${Math.round(r.width)} of ${vw} (in-flow, informational)` });
      }

      // 3. The topbar must span the viewport width (the 960/1440 bug).
      if (sel === '.topbar' && r.width > 0) {
        const ratio = r.width / vw;
        const full = ratio >= minRatio;
        checks.push({ id: 'topbar-full-width', pass: full, detail: `${Math.round(r.width)}px / ${vw}px = ${ratio.toFixed(2)}` });
        if (!full) failures.push(`topbar spans only ${ratio.toFixed(2)} of viewport width (expected ≥${minRatio})`);
      }
    }

    // 4. No child element overflows its chrome parent. A child in an
    //    out-of-flow subtree (itself or any ancestor between it and the chrome
    //    parent is position:fixed/absolute — pickers, backdrops, floating
    //    chrome) legitimately escapes the parent's box; only in-flow children
    //    are bound.
    const isOutOfFlowSubtree = (node, root) => {
      let n = node;
      while (n && n !== root) {
        const p = getComputedStyle(n).position;
        if (p === 'fixed' || p === 'absolute') return true;
        n = n.parentElement;
      }
      return false;
    };
    for (const sel of chromeSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const pr = el.getBoundingClientRect();
      const overflow = [...el.querySelectorAll('*')].find((c) => {
        const cr = c.getBoundingClientRect();
        if (cr.width <= 0) return false;
        if (isOutOfFlowSubtree(c, el)) return false;
        return cr.right > pr.right + 1 || cr.left < pr.left - 1;
      });
      checks.push({ id: `no-child-overflow-${sel}`, pass: !overflow, detail: overflow ? overflow.tagName + '.' + (overflow.className || '').slice(0,20) : 'clean' });
      if (overflow) failures.push(`${sel} has overflowing child`);
    }

    return { vw, checks, failures };
  }, { minRatio: MIN_TOPBAR_RATIO, chromeSelectors: CHROME_SELECTORS });
}

async function main() {
  const { url, json, routes } = parseArgs();
  if (!url) { console.error('Usage: node layout-invariants.mjs <url> [--json] [--routes /catalog,/x]'); process.exit(2); }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  const routeList = routes.length > 0 ? routes : ['/'];  // default: home
  const report = { url, viewport: VIEWPORT, routes: [], ok: false };

  try {
    for (const route of routeList) {
      const res = await checkRoute(page, url, route);
      report.routes.push({ route, ...res });
    }
    report.ok = report.routes.every((r) => r.failures.length === 0);
  } finally {
    await browser.close();
  }

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`layout-invariants — ${report.ok ? '✅' : '✗'} ${report.url}`);
    for (const r of report.routes) {
      console.log(`  ${r.route}: ${r.failures.length === 0 ? '✓ clean' : '✗ FAIL'}`);
      for (const f of r.failures) console.log(`    ✗ ${f}`);
      for (const c of r.checks) if (!c.pass) console.log(`    ✗ ${c.id}: ${c.detail}`);
    }
  }
  process.exit(report.ok ? 0 : 1);
}

await main();