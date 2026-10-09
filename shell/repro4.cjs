const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const all=[];
  page.on('console', msg => { const t=msg.text(); if(/invalid|#185|Element type|caught|expected|Spaceship|cockpit|dome|Canvas|OrbitControls|Perspective/i.test(t)) all.push(msg.type()+': '+t.slice(0,900)); });
  page.on('pageerror', e => all.push('PAGEERR: '+e.message.slice(0,1500)));
  await page.goto('https://p31-shell.trimtab-signal.workers.dev/', { waitUntil: 'networkidle', timeout: 45000 }).catch(e=>all.push('goto: '+e.message));
  await page.waitForTimeout(1500);
  // open drawer
  await page.click('button.drawer-toggle').catch(e=>all.push('opendrawer: '+e.message));
  await page.waitForTimeout(800);
  // click Cockpit
  await page.click('#tab:text("Cockpit")').catch(async(e)=>{ all.push('clickCockpit: '+e.message); try{ await page.click('button.drawer-nav-item:has-text("Cockpit")'); all.push('click2 ok'); }catch(e2){ all.push('click2: '+e2.message);} });
  await page.waitForTimeout(3500);
  const shot = await page.evaluate(()=>{
    const c = document.querySelector('.ship-root, .cockpit, canvas');
    return {cockpitOrShip:(c?(c.tagName+'/'+c.className.slice(0,30)):'NONE'), bodyText:document.body.innerText.slice(0,120).replace(/\n+/g,' / ')};
  }).catch(()=>({shot:'err'}));
  console.log('SHOT:', JSON.stringify(shot));
  console.log('CONSOLE:', all.length? all.join('\n'):'(none)');
  await browser.close();
})().catch(e=>{console.error('SCRIPT ERR', e.stack); process.exit(1);});
