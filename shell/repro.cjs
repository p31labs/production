const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const msgs=[];
  page.on('console', msg => { 
    const t=msg.text(); 
    if(/invalid|#185|Element type|caught|expected/i.test(t)) msgs.push(msg.type()+': '+t.slice(0,1000));
  });
  page.on('pageerror', e => msgs.push('PAGEERR: '+e.message.slice(0,1200)));
  await page.goto('https://p31-shell.trimtab-signal.workers.dev/cockpit', { waitUntil: 'networkidle', timeout: 45000 }).catch(e=>console.log('goto',e.message));
  await page.waitForTimeout(3500);
  console.log('=== CAPTURED ===');
  console.log(msgs.join('\n---\n') || '(none)');
  // also dump any <pre>/<code> react-error overlay
  const overlay = await page.$('pre, code, .react-error') .then(x=>x).catch(()=>null);
  if (overlay) console.log('overlay:', await overlay.textContent().then(t=>t.slice(0,1500)).catch(()=>''));
  await browser.close();
})().catch(e=>{console.error('SCRIPT ERR', e.stack); process.exit(1);});
