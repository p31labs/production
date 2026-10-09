// Live repro v2 — capture full React #185 stack + component stack + CSP source.
const { chromium } = require('playwright');
const BASE = process.env.REPRO_BASE || 'https://p31-shell.trimtab-signal.workers.dev';
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const errs = [];
  const cons = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR:\n' + e.message + '\nSTACK:\n' + (e.stack || '')));
  page.on('console', (msg) => {
    const t = msg.text();
    cons.push(`[${msg.type()}] ${t}`);
  });
  await page.addInitScript(() => { window.__P31_VERIFY__ = true; });
  // Block ALL cross-origin requests so local dev (no secrets) doesn't crash app init;
  // lets dev (non-minified) React render the cockpit and print the full #185 message.
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('http://localhost:5173') || u.startsWith('ws://localhost:5173')) return route.continue();
    return route.abort();
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  await page.click('.drawer-toggle').catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.header-drawer [role="tab"]'));
    const idx = tabs.findIndex(t => /cockpit/i.test(t.textContent || ''));
    console.log('cockpit idx=', idx);
    if (idx >= 0) tabs[idx].click();
    else console.log('tabs:', tabs.map(t=>t.textContent.trim()));
  });
  await page.waitForTimeout(3000);

  // Collect response headers for the cockpit chunk + main doc CSP.
  console.log('=== DOC CSP ===');
  const csp = await page.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content);
  console.log('meta CSP:', csp || '(none)');
  const docResp = await page.goto(BASE + '/') ? null : null;

  console.log('\n=== PAGE ERRORS ===');
  console.log(errs.join('\n\n---\n') || '(none)');
  console.log('\n=== ALL CONSOLE (first 45) ===');
  console.log(cons.slice(0, 45).join('\n') || '(none)');
  await browser.close();
})().catch((e) => { console.error('REPRO FAIL:', e.message); process.exit(1); });
