const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ javaEnabled:false, javaScriptEnabled:true });
  const page = await ctx.newPage();
  const out=[];
  page.on('console', m=>out.push(m.type()+': '+(m.text()||'').slice(0,500)));
  page.on('pageerror', e=>out.push('PAGEERR: '+e.message.slice(0,1500)));
  await page.goto('http://localhost:8099/', { waitUntil: 'networkidle', timeout: 45000 }).catch(e=>out.push('goto: '+e.message));
  await page.waitForTimeout(1500);
  await page.click('button.drawer-toggle').catch(e=>out.push('opendrawer: '+e.message));
  await page.waitForTimeout(600);
  await page.click('button.drawer-nav-item:has-text("Cockpit")').catch(e=>out.push('clickCockpit: '+e.message));
  await page.waitForTimeout(3500);
  out.push('SHOT: '+await page.evaluate(()=>document.querySelector('.ship-root,.cockpit,canvas')?'SHIP-PRESENT':'NO-SHIP').catch(()=>'shot-err'));
  console.log(out.join('\n'));
  await browser.close();
})().catch(e=>{console.error('SCRIPT ERR', e.stack); process.exit(1);});
