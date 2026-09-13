import type { Page } from '@playwright/test';

const DAY = 86400000;
const DB_NAME = 'p31-sandbox';

function seedEval(): string {
  return `(async () => {
    const DAY = ${DAY};
    const DB = '${DB_NAME}';
    const open = () => new Promise((res, rej) => {
      const o = indexedDB.open(DB, 1);
      o.onupgradeneeded = () => {
        const db = o.result;
        if (!db.objectStoreNames.contains('threads')) db.createObjectStore('threads', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('messages')) db.createObjectStore('messages', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('artifacts')) db.createObjectStore('artifacts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      };
      o.onsuccess = () => res(o.result);
      o.onerror = () => rej(o.error);
    });
    const db = await open();
    const now = Date.now();
    const t1 = { id: 't1', title: 'Calming dashboard', lastMessage: 'Generated and proven clean: contract, rubber, and visual diff all pass.', createdAt: now - DAY, updatedAt: now - 7200000, lastViewedAt: now - 7200000 };
    const t2 = { id: 't2', title: 'Login form', lastMessage: 'Warnings only \u2014 verify visually.', createdAt: now - 2 * DAY, updatedAt: now - DAY - 3600000, lastViewedAt: now - 2 * DAY };
    const t3 = { id: 't3', title: 'Card grid', lastMessage: 'Here\\'s what I built:', createdAt: now - 4 * DAY, updatedAt: now - 3 * DAY, lastViewedAt: now - 4 * DAY };
    const t4 = { id: 't4', title: 'Settings page', lastMessage: 'Deployed to https://example.com', createdAt: now - 30 * DAY, updatedAt: now - 20 * DAY, lastViewedAt: now - 30 * DAY };
    const msgs = [
      { id: 'm1', threadId: 't1', role: 'user', content: 'build a calming dashboard with a spoon meter', timestamp: now - DAY },
      { id: 'm2', threadId: 't1', role: 'assistant', content: 'Generated and proven clean: contract, rubber, and visual diff all pass.', timestamp: now - 7200000 },
      { id: 'm3', threadId: 't2', role: 'user', content: 'create a login form with validation', timestamp: now - 2 * DAY },
      { id: 'm4', threadId: 't2', role: 'assistant', content: 'Warnings only \u2014 verify visually.', timestamp: now - DAY - 3600000 },
      { id: 'm5', threadId: 't3', role: 'user', content: 'make a card grid with glass borders', timestamp: now - 4 * DAY },
      { id: 'm6', threadId: 't3', role: 'assistant', content: 'Here\\'s what I built:', timestamp: now - 3 * DAY },
      { id: 'm7', threadId: 't4', role: 'user', content: 'generate a settings page layout', timestamp: now - 30 * DAY },
      { id: 'm8', threadId: 't4', role: 'assistant', content: 'Deployed to https://example.com', timestamp: now - 20 * DAY },
    ];
    const tx = db.transaction(['threads', 'messages', 'artifacts'], 'readwrite');
    tx.objectStore('threads').clear();
    tx.objectStore('messages').clear();
    tx.objectStore('artifacts').clear();
    [t1, t2, t3, t4].forEach((t) => tx.objectStore('threads').put(t));
    msgs.forEach((m) => tx.objectStore('messages').put(m));
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(new Error('seed aborted'));
    });
    db.close();
  })()`;
}

export async function seedSandbox(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('.app');
  await page.waitForTimeout(200);
  await page.evaluate(seedEval());
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('.chat-thread-item').length === 4);
}