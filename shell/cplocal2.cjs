const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const out=[];
  page.on('console', m=>out.push(m.type()+': '+(m.text()||'').slice(0,400)));
  page.on('pageerror', e=>out.push('PAGEERR: '+e.message.slice(0,1200)));
  await page.goto('http://localhost:8099/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e=>out.push('goto: '+e.message));
  await page.waitForTimeout(1500);
  await page.click('button.drawer-toggle').catch(()=>{});
  await page.waitForTimeout(500);
  await page.click('button.drawer-nav-item:has-text("Cockpit")').catch(()=>{});
  await page.waitForTimeout(3000);
  const shot = await page.evaluate(()=>document.querySelector('.ship-root')?'SHIP-PRESENT':'NO-SHIP').catch(()=>'err');
  out.push('SHOT: '+shot);
  console.log(out.filter(l=>/DBG|PAGEERR|SHOT|invalid|185|Error type/.test(l)).join('\n'));
  await browser.close();
})().catch(e=>{console.error('SCRIPT',e.message); process.exit(1);});
