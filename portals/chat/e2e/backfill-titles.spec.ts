import { test, expect } from '@playwright/test';

const TITLE_URL = 'https://chat-sandbox.trimtab-signal.workers.dev/title';
const DB_NAME = 'p31-sandbox';
const DAY = 86400000;
const FILLER_RE = /^(build|create|make|design|generate|write|set up|setup|add|do|implement)\s+/i;

test('backfill thread titles via /title', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.app');
  await page.waitForTimeout(300);

  const results = await page.evaluate(async (ctx: { titleUrl: string; day: number }) => {
    const { titleUrl, day: DAY } = ctx;
    const db = await new Promise<IDBDatabase>((res, rej) => { const o = indexedDB.open('p31-sandbox', 1); o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); });

    const seedThread = { id: 'seed-untitled', title: 'build a login form with validation', lastMessage: '', createdAt: Date.now() - DAY, updatedAt: Date.now() - DAY, lastViewedAt: Date.now() - DAY };
    const seedMsgs = [
      { id: 'seed-m1', threadId: 'seed-untitled', role: 'user' as const, content: 'build a login form with validation', timestamp: Date.now() - DAY },
      { id: 'seed-m2', threadId: 'seed-untitled', role: 'assistant' as const, content: 'Email + password with inline validation', timestamp: Date.now() - DAY + 1000 },
    ];
    const tx = db.transaction(['threads', 'messages'], 'readwrite');
    tx.objectStore('threads').put(seedThread);
    for (const m of seedMsgs) tx.objectStore('messages').put(m);
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });

    const threads = await new Promise<any[]>((res, rej) => { const r = db.transaction('threads', 'readonly').objectStore('threads').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const allMsgs = await new Promise<any[]>((res, rej) => { const r = db.transaction('messages', 'readonly').objectStore('messages').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const byThread = new Map<string, any[]>();
    for (const m of allMsgs) { const l = byThread.get(m.threadId) ?? []; l.push(m); byThread.set(m.threadId, l); }

    const out: Array<{ id: string; from: string; to: string | null }> = [];
    for (const t of threads) {
      if (!(t.title.startsWith('Untitled') || /^(build|create|make|design|generate|write|set up|setup|add|do|implement)\s+/i.test(t.title))) { out.push({ id: t.id, from: t.title, to: null }); continue; }
      const msgs = (byThread.get(t.id) ?? []).sort((a: any, b: any) => a.timestamp - b.timestamp);
      const firstUser = msgs.find((m: any) => m.role === 'user');
      const firstAssistant = msgs.find((m: any) => m.role === 'assistant');
      if (!firstUser) { out.push({ id: t.id, from: t.title, to: null }); continue; }
      try {
        const resp = await fetch(titleUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ firstUserMessage: (firstUser.content ?? '').slice(0, 800), firstAssistantReply: (firstAssistant?.content ?? '').slice(0, 800) }),
        });
        const data = await resp.json() as { ok?: boolean; title?: string | null };
        if (data.ok && data.title) {
          db.transaction('threads', 'readwrite').objectStore('threads').put({ ...t, title: data.title });
          out.push({ id: t.id, from: t.title, to: data.title });
        } else {
          out.push({ id: t.id, from: t.title, to: null });
        }
      } catch (e) {
        out.push({ id: t.id, from: t.title, to: null });
      }
    }
    return out;
  }, { titleUrl: TITLE_URL, day: DAY });

  await page.reload();
  await page.waitForSelector('.chat-thread-item');

  for (const r of results) {
    const titles = await page.locator('.chat-thread-item-title').allTextContents();
    if (r.to) {
      expect(titles).toContain(r.to);
      expect(titles).not.toContain(r.from);
    }
  }
  const renamed = results.filter((r) => r.to);
  expect(renamed.length).toBeGreaterThanOrEqual(1);
});