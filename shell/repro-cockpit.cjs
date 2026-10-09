// Targeted repro of Cockpit React #185 against LOCAL dev server.
const { chromium } = require('playwright');
const BASE = process.env.REPRO_BASE || 'http://localhost:26001';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const allErrors = [];
  const allConsole = [];
  page.on('pageerror', (e) => allErrors.push(e.message + '\n' + (e.stack || '')));
  page.on('console', (msg) => {
    const t = msg.text();
    // capture anything that looks like an error/exception/critical
    if (/error|exception|invalid|caught|warn/i.test(t)) allConsole.push(`[${msg.type()}] ${t}`);
  });
  // Neutralize cross-origin noise: abort calls to live worker endpoints (local dev has no secrets).
  await page.route('**/*.trimtab-signal.workers.dev/**', (route) => route.abort());
  await page.route('**/api/ **', (route) => route.abort()).catch(() => {});
  page.on('requestfailed', (req) => { if (/trimtab/.test(req.url())) return; allConsole.push(`FAIL ${req.url()} — ${req.failure()?.errorText}`); });

  await page.addInitScript(() => { window.__P31_VERIFY__ = true; });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await page.click('.drawer-toggle').catch(() => {});
  await page.waitForTimeout(600);
  // Click Cockpit tab robustly: find tab by text index
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.header-drawer [role="tab"]'));
    const idx = tabs.findIndex(t => /cockpit/i.test(t.textContent || ''));
    if (idx >= 0) tabs[idx].click();
  });
  await page.waitForTimeout(300);
  await page.waitForTimeout(2500); // allow mount + first render of Canvas/dome
  await page.waitForFunction(() => document.querySelector('.cockpit'), null, { timeout: 10000 }).catch(() => null);

  console.log('=== COCKPIT MOUNTED:', await page.$eval('.cockpit', (el) => !!el).catch(() => false));
  console.log('=== DOM SNAPSHOT (cockpit area title) ===');
  console.log(await page.$eval('.cockpit', (el) => el ? el.innerHTML.slice(0, 400) : 'no .cockit').catch(() => 'none'));
  console.log('\n=== PAGE ERRORS ===');
  console.log(allErrors.length ? allErrors.join('\n---\n') : '(none)');
  console.log('\n=== CONSOLE (errors/warnings) ===');
  console.log(allConsole.length ? allConsole.slice(0, 40).join('\n') : '(none)');
  await browser.close();
})().catch((e) => { console.error('REPRO FAIL:', e.message); process.exit(1); });
