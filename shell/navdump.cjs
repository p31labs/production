const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('https://p31-shell.trimtab-signal.workers.dev/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    const all = [...document.querySelectorAll('nav, .bottom-nav, .tab-bar, [role="tablist"], button')];
    const rows = all.slice(0,30).map(n => (
      (n.tagName||'?')+
      (n.getAttribute('role')?`#${n.getAttribute('role')}`:'')+
      ' class='+n.className.slice(0,30)+
      ' text='+'"'+(n.textContent||'').trim().slice(0,18).replace(/"/g,'\\"')+'"'
    ));
    const tabs = [...document.querySelectorAll('button')]
      .filter(b=>/cockpit|🚀|Command Hub|tab/i.test(b.textContent||'')||b.getAttribute('role')==='tab')
      .map(b=>({text:b.textContent.trim().slice(0,18), cls:b.className.slice(0,30), role:b.getAttribute('role')||''}));
    return {rows, tabs};
  });
  console.log('ROWS:', out.rows.join('\n'));
  console.log('MATCHING BUTTONS:', JSON.stringify(out.tabs,null,1));
  await browser.close();
})().catch(e=>{console.error(e.stack);process.exit(1);});
