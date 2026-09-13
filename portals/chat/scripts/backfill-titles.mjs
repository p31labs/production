import playwright from 'playwright';

const PORTAL_URL = process.env.PORTAL_URL ?? 'http://localhost:5173';
const TITLE_URL = 'https://chat-sandbox.trimtab-signal.workers.dev/title';
const DAY = 86400000;
const FILLER_RE = /^(build|create|make|design|generate|write|set up|setup|add|do|implement)\s+/i;

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log(`Loading ${PORTAL_URL}…`);
  await page.goto(PORTAL_URL);
  await page.waitForSelector('.app', { timeout: 30000 });
  await page.waitForTimeout(500);
  console.log('App loaded.');

  const results = await page.evaluate(async (ctx) => {
    const { titleUrl, day: DAY } = ctx;
    const db = await new Promise((res, rej) => { const o = indexedDB.open('p31-sandbox', 1); o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); });

    const threads = await new Promise((res, rej) => { const r = db.transaction('threads', 'readonly').objectStore('threads').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const allMsgs = await new Promise((res, rej) => { const r = db.transaction('messages', 'readonly').objectStore('messages').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const byThread = new Map();
    for (const m of allMsgs) { const l = byThread.get(m.threadId) ?? []; l.push(m); byThread.set(m.threadId, l); }

    const out = [];
    for (const t of threads) {
      const isDerived = t.title.startsWith('Untitled') || FILLER_RE.test(t.title);
      if (!isDerived) { out.push({ id: t.id, title: t.title, to: null }); continue; }
      const msgs = (byThread.get(t.id) ?? []).sort((a, b) => a.timestamp - b.timestamp);
      const firstUser = msgs.find((m) => m.role === 'user');
      const firstAssistant = msgs.find((m) => m.role === 'assistant');
      if (!firstUser) { out.push({ id: t.id, title: t.title, to: null }); continue; }
      try {
        const resp = await fetch(titleUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ firstUserMessage: (firstUser.content ?? '').slice(0, 800), firstAssistantReply: (firstAssistant?.content ?? '').slice(0, 800) }),
        });
        const data = await resp.json();
        if (data.ok && data.title) {
          db.transaction('threads', 'readwrite').objectStore('threads').put({ ...t, title: data.title });
          out.push({ id: t.id, title: t.title, to: data.title });
        } else {
          out.push({ id: t.id, title: t.title, to: null });
        }
      } catch (e) {
        out.push({ id: t.id, title: t.title, to: null });
      }
    }
    return out;
  }, { titleUrl: TITLE_URL, day: DAY });

  const renamed = results.filter((r) => r.to);
  console.log('\n=== Backfill report ===');
  console.log(`Threads examined: ${results.length}`);
  console.log(`Renamed (derived → AI title): ${renamed.length}`);
  console.log(`Skipped (already good): ${results.length - renamed.length}`);
  if (renamed.length) {
    console.log('\nRenamed:');
    for (const r of renamed) console.log(`  ${r.id}: "${r.title}" → "${r.to}"`);
  }
  console.log('\nReload the page to see updated titles.');

  await browser.close();
})().catch((e) => { console.error('Backfill failed:', e); process.exit(1); });
