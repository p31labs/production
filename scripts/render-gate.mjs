#!/usr/bin/env node
/**
 * render-gate.mjs — Gate 1: rendered-output gate for the P31 marketplace.
 *
 * Drives Playwright (chromium) against the LIVE marketplace and FAILS when
 * any rendered assertion trips. This is the sensor that would have caught
 * the 560px-tall select — a raw control grown by portal CSS the canon
 * contract never saw.
 *
 * Matrix: routes × viewports × themes.
 *   Routes   #/home, #/discover, #/server/p31-crypto, #/playground, #/publish
 *   Viewports 375×812 (phone), 768×1024 (chromebook), 1280×800 (desktop)
 *   Themes   ocean (default) + aurora (dark variant) — see THEME HOOK below.
 *
 * Assertions (any trip FAILS the gate):
 *   A1  CONTROL CEILING — no visible <select>/<input>/<textarea> with
 *       rendered height > 64px (the control ceiling).
 *   A2  HORIZONTAL OVERFLOW — document.scrollingElement.scrollWidth <=
 *       window.innerWidth + 1px tolerance.
 *   A3  TOPBAR CLIP — first visible content element's bounding top >=
 *       topbar bottom (topbar found via [data-p31], .topbar, or
 *       header[role=banner]). Clipped titles fail.
 *   A4  DOUBLED TEXT — no two adjacent visible text nodes with identical
 *       trimmed content (catches the doubled "helper isn't connected").
 *   A5  CARD WIDTH — every grid-item card (an element whose class contains
 *       'card' sitting directly inside a computed display:grid container,
 *       or a direct element child of [data-p31="grid"]) has rendered width
 *       >= 240px (1px tolerance). Inner card pieces (…-title/-icon/-desc)
 *       are not cards themselves.
 *   A6  SCREENSHOTS — one per route/viewport (default theme) plus one per
 *       route/viewport/theme, written to the out dir for diff review.
 *   A7  CENTERED PAGE — on viewports wider than 1280px (above
 *       --p31-page-max 80rem) the [data-p31="page"] wrapper's left/right
 *       viewport margins must differ by <= 8px. The page wrapper centers
 *       ITSELF (margin-inline: auto); children never center themselves.
 *   A8  SCROLL-PADDING PARITY — computed scroll-padding-top on <html>
 *       must be >= the sticky header's bottom − 2px (anchor jumps clear
 *       the bar). Measured via getComputedStyle(documentElement) against
 *       the A3 topbar bottom anchor. Unset (`auto`) is recorded in
 *       evidence as a note, not a failure: the canon rule ships with
 *       canon-v2.css, and a frozen bundle without it cannot be judged
 *       (fix-plan: canon-v2-header-height-legacy-drift.md).
 *
 * THEME HOOK: the portal exposes themes via the runtime attribute
 * `data-theme` on <html> (set by useThemeEffects from the design-core
 * theme-store; worlds: garden/ocean/aurora/zen/volt, default ocean). The
 * gate sets that attribute directly — the same hook the app uses — and
 * re-runs every assertion per theme. A layout that only works in one theme
 * fails.
 *
 * NEGATIVE CONTROLS (--self-test): plants fixture pages under /tmp/opencode
 * — bad.html trips ALL SEVEN assertion classes (must FAIL), good.html trips
 * none (must PASS). Exit 1 if any expectation is violated. The live-market
 * baseline (docs/fix-plans/render-gate-baseline-failures.md) is the
 * second, real-world negative control.
 *
 * Flags:
 *   --url <base>        target base URL (default: live marketplace)
 *   --routes <csv>      hash routes (default: the five above)
 *   --viewports <csv>   "375x812,768x1024,1280x800"
 *   --themes <csv>      default "ocean,aurora"
 *   --out <dir>         screenshot/evidence dir (default /tmp/opencode/render-gate)
 *   --info-targets <csv> extra base URLs run + reported but NOT exit-failing
 *   --self-test         fixture negative controls, then exit
 *
 * Playwright resolves from portals/mcp-marketplace/node_modules (its own
 * workspace — installed there per the portal workspace contract).
 */
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)));
const ROOT = resolve(HERE, '..');
const PORTAL = resolve(ROOT, 'portals', 'mcp-marketplace');

const DEFAULT_URL = 'https://p31-portal-mcp-marketplace.pages.dev';
const DEFAULT_ROUTES = ['#/home', '#/discover', '#/server/p31-crypto', '#/playground', '#/publish'];
const DEFAULT_VIEWPORTS = [[375, 812], [768, 1024], [1280, 800]];
const DEFAULT_THEMES = ['ocean', 'aurora'];
const DEFAULT_OUT = join('/tmp/opencode', 'render-gate');

const CONTROL_MAX_H = 64;
const CARD_MIN_W = 240;
const TOL = 1; // px tolerance for overflow / clip / card width

function loadPlaywright() {
  const portalRequire = createRequire(join(PORTAL, 'package.json'));
  try {
    return portalRequire('@playwright/test');
  } catch {
    throw new Error(
      'render-gate: @playwright/test not found in portals/mcp-marketplace — ' +
      'install it there: cd portals/mcp-marketplace && pnpm add -D @playwright/test && pnpm exec playwright install chromium',
    );
  }
}

/** The in-page assertion bundle. Plain-data returns only. */
function assertBundle(controlMax, cardMin, tol) {
  const out = { controls: [], overflow: null, clip: null, adjacent: [], cards: [], page: null, scrollPadding: null, scrollPaddingUnset: false, topbar: null };
  const visible = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const pathOf = (el) => {
    const cls = typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    return el.tagName.toLowerCase() + cls;
  };

  // A3 anchor — topbar. Prefer the canon shell-topbar region; fall back to
  // banner/.topbar/header. The bare [data-p31] catch-all was removed: it
  // matched the shell root (full-page box) once faces moved their topbar
  // inside the Shell, inflating "topbar bottom" to the viewport height.
  const topbar = document.querySelector('[data-p31="shell-topbar"], header[role="banner"], .topbar, header');
  if (!topbar || !visible(topbar)) {
    out.topbar = 'missing';
  }

  // A1 — control ceiling.
  for (const el of document.querySelectorAll('select, input, textarea')) {
    if (!visible(el)) continue;
    if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.height > controlMax) {
      out.controls.push({
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        label: el.getAttribute('aria-label') || el.getAttribute('title') || el.id || pathOf(el),
        height: Math.round(r.height * 10) / 10,
      });
    }
  }

  // A2 — horizontal overflow.
  const se = document.scrollingElement || document.documentElement;
  if (se.scrollWidth > window.innerWidth + tol) {
    out.overflow = { scrollWidth: se.scrollWidth, innerWidth: window.innerWidth };
  }

  // A3 — first visible content below the topbar.
  if (topbar && visible(topbar)) {
    const tbBottom = topbar.getBoundingClientRect().bottom;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    let node;
    let first = null;
    while ((node = walker.nextNode())) {
      const p = node.parentElement;
      if (!p || topbar.contains(p)) continue;
      if (!visible(p)) continue;
      const r = p.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= window.innerHeight) continue;
      if (p.closest('.skip-link, [class*="starfield"], [class*="notification"]')) continue;
      let anchor = p;
      while (anchor.parentElement && getComputedStyle(anchor).display === 'inline') anchor = anchor.parentElement;
      const pos = getComputedStyle(anchor).position;
      if (pos === 'fixed' || pos === 'absolute') continue;
      first = anchor;
      break;
    }
    if (first) {
      const top = first.getBoundingClientRect().top;
      if (top < tbBottom - tol) {
        out.clip = {
          text: (first.textContent || '').trim().slice(0, 60),
          top: Math.round(top * 10) / 10,
          topbarBottom: Math.round(tbBottom * 10) / 10,
        };
      }
    }
  }

  // A4 — adjacent identical visible text nodes (topbar chrome excluded).
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  let prev = null;
  let n;
  while ((n = tw.nextNode())) {
    const p = n.parentElement;
    if (!p || (topbar && topbar.contains(p)) || !visible(p)) continue;
    const t = n.textContent.trim();
    if (prev && prev.text === t) {
      out.adjacent.push({ text: t.slice(0, 80), a: prev.path, b: pathOf(p) });
      if (out.adjacent.length >= 3) break;
    }
    prev = { text: t, path: pathOf(p) };
  }

  // A5 — card widths in grid contexts. A "card" is a grid ITEM whose class
  // contains 'card' (or a direct child of [data-p31="grid"]). Inner pieces
  // (surface-card-title / -icon / -desc) are not cards themselves.
  const cardRe = /(^|[\s-])card([\s-]|$)/;
  for (const el of document.querySelectorAll('[class]')) {
    const cls = el.className;
    if (typeof cls !== 'string' || !cardRe.test(cls)) continue;
    if (!visible(el)) continue;
    if (getComputedStyle(el).display === 'grid') continue; // container, not a card
    let grid = el.parentElement;
    let container = null;
    while (grid) {
      if (grid.getAttribute && grid.getAttribute('data-p31') === 'grid') { container = grid; break; }
      if (getComputedStyle(grid).display === 'grid') { container = grid; break; }
      grid = grid.parentElement;
    }
    if (!container || el.parentElement !== container) continue; // not a grid item
    const w = el.getBoundingClientRect().width;
    if (w < cardMin - tol) {
      out.cards.push({ cls: cls.trim().split(/\s+/)[0], width: Math.round(w * 10) / 10 });
    }
  }
  for (const gridEl of document.querySelectorAll('[data-p31="grid"]')) {
    if (!visible(gridEl)) continue;
    for (const child of gridEl.children) {
      if (!visible(child)) continue;
      const w = child.getBoundingClientRect().width;
      if (w < cardMin - tol) {
        out.cards.push({ cls: 'data-p31-grid-child', width: Math.round(w * 10) / 10 });
      }
    }
  }

  // A7 — centered page. Above --p31-page-max (80rem = 1280px) the page
  // wrapper's own margin-inline: auto must hold it centered: the distance
  // from the left viewport edge to the page's left edge must differ from
  // the right-side distance by <= 8px. Children centering themselves is a
  // different bug class (nested margins) — this checks the wrapper only.
  if (window.innerWidth > 1280) {
    const pageEl = document.querySelector('[data-p31="page"]');
    if (pageEl && visible(pageEl)) {
      const r = pageEl.getBoundingClientRect();
      const left = r.left;
      const right = window.innerWidth - r.right;
      if (Math.abs(left - right) > 8) {
        out.page = {
          left: Math.round(left * 10) / 10,
          right: Math.round(right * 10) / 10,
          width: Math.round(r.width * 10) / 10,
        };
      }
    }
  }

  // A8 — scroll-padding parity. html scroll-padding-top must cover the
  // sticky header (>= header bottom − 2px) so anchor jumps and focus
  // targets land clear of the bar. Unset (`auto`) parses to NaN and is
  // recorded — not failed — because a frozen bundle cannot be judged for
  // a rule it predates (fix-plan: canon-v2-header-height-legacy-drift.md).
  if (topbar && visible(topbar)) {
    const tbBottom = topbar.getBoundingClientRect().bottom;
    const sp = getComputedStyle(document.documentElement).scrollPaddingTop;
    const px = parseFloat(sp);
    if (!Number.isNaN(px)) {
      if (px < tbBottom - 2) {
        out.scrollPadding = {
          computed: sp,
          px: Math.round(px * 10) / 10,
          headerBottom: Math.round(tbBottom * 10) / 10,
        };
      }
    } else {
      out.scrollPaddingUnset = true;
    }
  }

  return out;
}

function summarize(bundle, route, viewport, theme) {
  const failures = [];
  if (bundle.topbar === 'missing') failures.push({ kind: 'topbar-missing', detail: 'no visible [data-p31]/.topbar/header[role=banner] found' });
  for (const c of bundle.controls) failures.push({ kind: 'control-ceiling', detail: `<${c.tag}${c.type ? ' type=' + c.type : ''}> "${c.label}" rendered ${c.height}px tall (ceiling ${CONTROL_MAX_H}px)` });
  if (bundle.overflow) failures.push({ kind: 'overflow', detail: `scrollWidth ${bundle.overflow.scrollWidth} > innerWidth ${bundle.overflow.innerWidth}` });
  if (bundle.clip) failures.push({ kind: 'topbar-clip', detail: `"${bundle.clip.text}" top ${bundle.clip.top}px < topbar bottom ${bundle.clip.topbarBottom}px` });
  for (const a of bundle.adjacent) failures.push({ kind: 'doubled-text', detail: `adjacent identical text "${a.text}" (${a.a} → ${a.b})` });
  for (const c of bundle.cards) failures.push({ kind: 'card-width', detail: `card "${c.cls}" ${c.width}px wide (min ${CARD_MIN_W}px)` });
  if (bundle.page) {
    const d = Math.abs(bundle.page.left - bundle.page.right);
    failures.push({ kind: 'centered-page', detail: `[data-p31="page"] margins L ${bundle.page.left}px vs R ${bundle.page.right}px (Δ ${Math.round(d * 10) / 10}px > 8px)` });
  }
  if (bundle.scrollPadding) {
    failures.push({ kind: 'scroll-padding', detail: `html scroll-padding-top ${bundle.scrollPadding.computed} < header bottom ${bundle.scrollPadding.headerBottom}px − 2` });
  }
  return failures;
}

function slugRoute(route) {
  return route.replace(/^#\//, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'root';
}

/**
 * Run one target (base URL) across its routes × viewports × themes.
 * Returns failure records [{ target, route, viewport, theme, kind, detail }].
 */
async function runTarget(playwright, { baseUrl, routes, viewports, themes, outDir, label }) {
  const failures = [];
  const evidence = { target: baseUrl, label, passes: [], failures: [], notes: [], pageErrors: [] };
  const browser = await playwright.chromium.launch();

  for (const [w, h] of viewports) {
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await context.newPage();
    const vpTag = `${w}x${h}`;
    let pageErrors = 0;
    page.on('pageerror', () => { pageErrors += 1; });

    for (const route of routes) {
      const url = baseUrl.startsWith('file:') ? baseUrl : baseUrl + '/' + route;
      let gotoOk = true;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      } catch {
        gotoOk = false;
      }
      if (!gotoOk) {
        evidence.failures.push({ route, viewport: vpTag, theme: '-', kind: 'goto-failed', detail: `could not load ${url}` });
        console.error(`✗ [goto] ${label} ${route}@${vpTag} — load failed`);
        continue;
      }
      // Let surfaces + data (registry fetch, SW network-first) settle.
      await page.waitForSelector('header[role="banner"], .topbar, [data-p31]', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2500);

      for (let ti = 0; ti < themes.length; ti += 1) {
        const theme = themes[ti];
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        await page.waitForTimeout(400);

        const bundle = await page.evaluate(
          ({ src, cm, cw, tl }) => {
            const fn = (0, eval)('(' + src + ')');
            return fn(cm, cw, tl);
          },
          { src: assertBundle.toString(), cm: CONTROL_MAX_H, cw: CARD_MIN_W, tl: TOL },
        );
        const routeFailures = summarize(bundle, route, vpTag, theme);
        if (bundle.scrollPaddingUnset) {
          evidence.notes.push({
            route, viewport: vpTag, theme,
            note: 'A8 skipped — html scroll-padding-top unset (auto); the canon rule ships with canon-v2.css and a frozen bundle cannot be judged for it (fix-plan: canon-v2-header-height-legacy-drift.md)',
          });
        }
        for (const f of routeFailures) {
          failures.push({ target: baseUrl, route, viewport: vpTag, theme, ...f });
          evidence.failures.push({ route, viewport: vpTag, theme, ...f });
        }
        if (pageErrors > 0) evidence.pageErrors.push({ route, viewport: vpTag, count: pageErrors });

        const shot = join(
          outDir,
          `${slugRoute(route)}-${vpTag}${ti === 0 ? '' : '-' + theme}.png`,
        );
        await page.screenshot({ path: shot });
        evidence.passes.push({ route, viewport: vpTag, theme, ok: routeFailures.length === 0 });
        if (routeFailures.length === 0) {
          console.log(`✓ ${label} ${route}@${vpTag} theme=${theme} — clean`);
        } else {
          console.error(`✗ ${label} ${route}@${vpTag} theme=${theme} — ${routeFailures.length} failure(s)`);
        }
      }
    }
    await context.close();
  }
  await browser.close();
  return { failures, evidence };
}

const BAD_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
html { scroll-padding-top: 10px; }
body { margin: 0; }
.topbar { position: sticky; top: 0; height: 60px; background: #123; color: #fff; z-index: 5; }
h1 { margin-top: -40px; }
.tall-select { height: 100px; }
.wide { width: 3000px; height: 4px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; }
.card { width: 150px; height: 40px; background: #345; }
[data-p31="page"] { box-sizing: border-box; width: 700px; margin: 0 0 0 40px; background: #234; padding: 8px; }
</style></head><body>
<header class="topbar">TOP</header>
<main>
  <h1>Clipped title</h1>
  <select class="tall-select"><option>a</option></select>
  <div class="wide"></div>
  <p>helper isn't connected</p><p>helper isn't connected</p>
  <div class="grid"><div class="card">c1</div><div class="card">c2</div></div>
</main>
<div data-p31="page"><p>off-center page</p></div>
</body></html>`;

const GOOD_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
html { scroll-padding-top: 60px; }
body { margin: 0; }
.topbar { position: sticky; top: 0; height: 60px; background: #123; color: #fff; z-index: 5; }
main { margin-top: 20px; }
select { height: 30px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.card { width: 260px; height: 40px; background: #345; }
[data-p31="page"] { box-sizing: border-box; width: 100%; max-width: 1280px; margin-inline: auto; background: #234; padding: 8px; }
</style></head><body>
<header class="topbar">TOP</header>
<main>
  <h1>Fine title</h1>
  <select><option>a</option></select>
  <p>first line</p><p>second line</p>
  <div class="grid"><div class="card">c1</div><div class="card">c2</div></div>
</main>
<div data-p31="page"><h2>Centered page</h2><p>page body text</p></div>
</body></html>`;

async function selfTest(playwright) {
  const dir = mkdtempSync(join('/tmp/opencode', 'render-gate-self-'));
  const bad = join(dir, 'bad.html');
  const good = join(dir, 'good.html');
  writeFileSync(bad, BAD_HTML);
  writeFileSync(good, GOOD_HTML);
  let broken = false;

  const opts = { viewports: [[1280, 800], [1600, 900]], themes: ['ocean'], outDir: dir };
  const badRun = await runTarget(playwright, { baseUrl: 'file://' + bad, routes: [''], label: 'self-bad', ...opts });
  const badKinds = new Set(badRun.failures.map((f) => f.kind));
  const expected = ['control-ceiling', 'overflow', 'topbar-clip', 'doubled-text', 'card-width', 'centered-page', 'scroll-padding'];
  for (const k of expected) {
    if (!badKinds.has(k)) {
      console.error(`✗ self-test broken: assertion class ${k} did NOT trip on the planted page.`);
      broken = true;
    } else {
      console.log(`✓ negative control: ${k} caught on planted page.`);
    }
  }
  if (badRun.failures.length === 0) {
    console.error('✗ self-test broken: planted page PASSED (no teeth).');
    broken = true;
  }

  const goodRun = await runTarget(playwright, { baseUrl: 'file://' + good, routes: [''], label: 'self-good', ...opts });
  if (goodRun.failures.length !== 0) {
    console.error(`✗ self-test broken: clean page flagged (${goodRun.failures.length}) — ${JSON.stringify(goodRun.failures[0])}.`);
    broken = true;
  } else {
    console.log('✓ negative control: clean page passes.');
  }

  rmSync(dir, { recursive: true, force: true });
  if (broken) {
    console.error('✗ render-gate self-test FAILED.');
    process.exit(1);
  }
  console.log('✅ render-gate self-test: all negative controls proven.');
}

function parseFlags(args) {
  const cfg = {
    url: DEFAULT_URL,
    routes: DEFAULT_ROUTES,
    viewports: DEFAULT_VIEWPORTS,
    themes: DEFAULT_THEMES,
    out: DEFAULT_OUT,
    infoTargets: [],
    selfTest: args.includes('--self-test'),
  };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--url' && args[i + 1]) cfg.url = args[++i];
    else if (a === '--routes' && args[i + 1]) cfg.routes = args[++i].split(',').map((s) => s.trim());
    else if (a === '--viewports' && args[i + 1]) cfg.viewports = args[++i].split(',').map((s) => s.split('x').map(Number));
    else if (a === '--themes' && args[i + 1]) cfg.themes = args[++i].split(',').map((s) => s.trim());
    else if (a === '--out' && args[i + 1]) cfg.out = args[++i];
    else if (a === '--info-targets' && args[i + 1]) cfg.infoTargets = args[++i].split(',').map((s) => s.trim());
  }
  return cfg;
}

async function main() {
  const cfg = parseFlags(process.argv.slice(2));
  const playwright = loadPlaywright();

  if (cfg.selfTest) {
    await selfTest(playwright);
    return;
  }

  mkdirSync(cfg.out, { recursive: true });
  const results = { generatedAt: new Date().toISOString(), targets: [] };

  const primary = await runTarget(playwright, {
    baseUrl: cfg.url, routes: cfg.routes, viewports: cfg.viewports, themes: cfg.themes, outDir: cfg.out, label: 'primary',
  });
  results.targets.push(primary.evidence);

  for (const t of cfg.infoTargets) {
    const info = await runTarget(playwright, {
      baseUrl: t, routes: [''], viewports: [[1280, 800]], themes: cfg.themes, outDir: join(cfg.out, 'info'), label: 'info',
    });
    results.targets.push(info.evidence);
    for (const f of info.failures) {
      console.warn(`⚠ [info-target ${t}] ${f.route}@${f.viewport} ${f.theme} — ${f.kind}: ${f.detail}`);
    }
  }

  writeFileSync(join(cfg.out, 'results.json'), JSON.stringify(results, null, 2));
  const n = primary.failures.length;
  if (n > 0) {
    console.error(`✗ render-gate FAILED — ${n} rendered violation(s) across ${cfg.routes.length} route(s) × ${cfg.viewports.length} viewport(s) × ${cfg.themes.length} theme(s).`);
    console.error(`  Evidence: ${cfg.out}/results.json — screenshots ${cfg.out}/*.png`);
    process.exit(1);
  }
  console.log('✅ render-gate: no oversized controls, no overflow, no topbar clips, no doubled text, no narrow grid cards, page centered, scroll-padding covers the header.');
  process.exit(0);
}

main().catch((e) => {
  console.error(`✗ render-gate crashed: ${e && e.message ? e.message : e}`);
  process.exit(2);
});