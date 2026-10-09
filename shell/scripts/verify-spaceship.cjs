// P31 spaceship-earth — verify suite (Playwright + Chromium, headless).
// Runs against the live Pages deploy.
//
//   NODE_PATH=/home/p31/node_modules node scripts/verify-spaceship.cjs
//   VISUAL_TEST=1 NODE_PATH=/home/p31/node_modules node scripts/verify-spaceship.cjs
//
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.P31_VERIFY_BASE || 'https://spaceship-earth.pages.dev';
const SHIP = '/home/p31/production/packages/spaceship-earth';
const results = [];
const suiteStart = Date.now();

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function safeCount(page, selector) {
  try {
    return await page.locator(selector).count();
  } catch {
    return -1;
  }
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);

  // ── Section A: repo preflight ──
  {
    check('preflight: src/store/shipStore.ts exists', fs.existsSync(path.join(SHIP, 'src', 'store', 'shipStore.ts')));
    check('preflight: src/hooks/useFocusTrap.ts exists', fs.existsSync(path.join(SHIP, 'src', 'hooks', 'useFocusTrap.ts')));
    check('preflight: src/hooks/useCrossAppState.ts exists', fs.existsSync(path.join(SHIP, 'src', 'hooks', 'useCrossAppState.ts')));
    check('preflight: worker/index.ts exists', fs.existsSync(path.join(SHIP, 'worker', 'index.ts')));
    check('preflight: wrangler.toml exists', fs.existsSync(path.join(SHIP, 'wrangler.toml')));
    check('preflight: dist/ build output exists', fs.existsSync(path.join(SHIP, 'dist')) && fs.readdirSync(path.join(SHIP, 'dist')).length > 0);
    check('preflight: public/_headers exists', fs.existsSync(path.join(SHIP, 'public', '_headers')));
  }

  // ── Section B: worker endpoints ──
  {
    const health = await fetch('https://spaceship-relay.trimtab-signal.workers.dev/health').catch(() => null);
    check('worker: /health returns 200', health?.ok === true, `status=${health?.status}`);

    const state = await fetch('https://spaceship-relay.trimtab-signal.workers.dev/api/spaceship-state').catch(() => null);
    check('worker: /api/spaceship-state returns JSON', state?.ok === true, `status=${state?.status}`);

    const status = await fetch('https://spaceship-relay.trimtab-signal.workers.dev/api/status').catch(() => null);
    check('worker: /api/status returns JSON', status?.ok === true, `status=${status?.status}`);
  }

  // ── Section C: app load (lightweight) ──
  const initialResponse = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  check('load: app boots — title present',
    (await page.title()).includes('Spaceship Earth'));

  // ── Section D: DOM structure (defensive — app may crash under heavy evaluate) ──
  {
    const topbarCount = await safeCount(page, '.ship-topbar');
    check('load: topbar renders', topbarCount === 1, `count=${topbarCount}`);

    if (topbarCount !== 1) {
      check('load: metric badge present', false, 'page crashed before render');
      check('hud: HUDShell mounts', false, 'page crashed before render');
    } else {
      const metricCount = await safeCount(page, '.metric-badge');
      check('load: metric badge present', metricCount >= 1, `count=${metricCount}`);

      const hudCount = await safeCount(page, '.hud-shell');
      check('hud: HUDShell mounts', hudCount >= 1, `count=${hudCount}`);
    }
  }

  // ── Section E: security headers (from initial response, avoid re-navigation) ──
  try {
    const respHeaders = {};
    if (initialResponse.headers) {
      const headerEntries = initialResponse.headers();
      if (headerEntries && typeof headerEntries[Symbol.iterator] === 'function') {
        for (const [key, value] of headerEntries) {
          respHeaders[key.toLowerCase()] = value;
        }
      }
    }
    check('security: HSTS present', !!respHeaders['strict-transport-security']);
    check('security: X-Content-Type-Options present', !!respHeaders['x-content-type-options']);
    check('security: X-Frame-Options present', !!respHeaders['x-frame-options']);
    check('security: Permissions-Policy present', !!respHeaders['permissions-policy']);
    check('security: Referrer-Policy present', !!respHeaders['referrer-policy']);
  } catch (e) {
    check('security: headers check', false, e.message);
  }

  // ── Summary ──
  const total = Date.now() - suiteStart;
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} checks passed (${(total / 1000).toFixed(0)}s total)`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SUITE ERROR:', e.message); process.exit(2); });
