import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:5193/#/site');
  await page.waitForLoadState('networkidle');
  const info = await page.evaluate(() => {
    const a = document.querySelector('a.skip-link');
    if (!a) return null;
    const chain = [];
    let n = a;
    while (n && chain.length < 8) { chain.push(n.tagName + '.' + String(n.className)); n = n.parentElement; }
    return { html: a.outerHTML, ancestors: chain };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})();
