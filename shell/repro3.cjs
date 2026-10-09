const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const all=[];
  page.on('console', msg => all.push(msg.type()+': '+(msg.text()||'').slice(0,700)));
  page.on('pageerror', e => all.push('PAGEERR: '+e.message.slice(0,1500)));
  await page.goto('https://p31-shell.trimtab-signal.workers.dev/', { waitUntil: 'networkidle', timeout: 45000 }).catch(e=>all.push('goto: '+e.message));
  await page.waitForSelector('[role="tab"]', { timeout: 15000 }).catch(()=>all.push('no nav'));
  // click Cockpit tab
  try { await page.click('[role="tab"]:has-text("Cockpit")'); all.push('CLICKED cockpit'); }
  catch(e) { all.push('click err: '+e.message); }
  await page.waitForTimeout(3500);
  // snapshot
  const shot = await page.evaluate(()=>{
    const cockpit = document.querySelector('.cockpit, .ship-root');
    return {cockpitOk:!!cockpit, bodyText: document.body.innerText.slice(0,200).replace(/\n+/g,' / ')};
  }).catch(()=>({shot:'err'}));
  console.log('=== SHOT ===', JSON.stringify(shot));
  console.log('=== CONSOLE ('+all.length+') ===');
  console.log(all.join('\n'));
  await browser.close();
})().catch(e=>{console.error('SCRIPT ERR', e.stack); process.exit(1);});
