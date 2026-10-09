// tools/design-parity/check-shell.mjs
// RB-SPINE-001 acceptance gate (Appendix E). Deterministic shell-layout check.
// Usage: BASE_URL=<url> ROUTES=/[,/route2,...] node check-shell.mjs
// Exits non-zero on any failure. This is the regression test for the runbook
// and for every later spine step. A vision model is advisory only; this is
// the authority.
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:8788';
const ROUTES = (process.env.ROUTES ?? '/').split(',');
const WIDTHS = [390, 768, 769, 820, 1100, 1101, 1128, 1200, 1201, 1280, 1300, 1440];

const browser = await chromium.launch();
const page = await browser.newPage();
let failures = 0;

for (const route of ROUTES) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector('.topbar', { timeout: 5000 });
    } catch {
      // A route with no topbar must NOT pass silently: a skipped row would
      // let a broken route yield exit code 0. Count it, and fix ROUTES if the
      // route legitimately has no topbar (redirect, error page, wrong path).
      failures++;
      console.log(`FAIL ${route} @${w} NO-TOPBAR`);
      continue;
    }

    const r = await page.evaluate(() => {
      const shown = (el) =>
        !!el && getComputedStyle(el).display !== 'none' &&
        el.getBoundingClientRect().width > 0;

      const search = document.querySelector('.search-box');
      const btn = document.querySelector('.session-btn');
      const s = search?.getBoundingClientRect();
      const b = btn?.getBoundingClientRect();

      const searchShown = shown(search);
      const btnShown = shown(btn);
      const overlap = searchShown && btnShown && !(s.right <= b.left || s.left >= b.right);

      let hit = null; // null = button intentionally hidden at this width
      if (btnShown) {
        const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        hit = !!el && btn.contains(el);
      }

      const side = shown(document.querySelector('.sidebar'));
      const bottom = shown(document.querySelector('.mobile-bottom-nav'));

      return {
        searchShown,
        btnShown,
        searchWidth: searchShown ? Math.round(s.width) : null,
        gap: searchShown && btnShown ? Math.round(b.left - s.right) : null,
        overlap,
        hit,
        oneNav: side !== bottom,          // exactly one nav; fails if both OR neither
        hOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });

    const ok = !r.overlap && r.hit !== false && r.oneNav && !r.hOverflow;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${route} @${w}`, JSON.stringify(r));
  }
}

await browser.close();
process.exit(failures ? 1 : 0);