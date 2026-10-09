const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('https://p31-shell.trimtab-signal.workers.dev/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const tabs = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[role="tab"], [role="tab"] button, nav button')];
    return btns.map(b => ({text:(b.textContent||'').trim().slice(0,20), vis:getComputedStyle(b).visibility, disp:getComputedStyle(b).display, sel:b.getAttribute('aria-selected'), cls:b.className.slice(0,40)}));
  });
  console.log(JSON.stringify(tabs,null,1));
  await browser.close();
})().catch(e=>{console.error(e.stack);process.exit(1);});
