import { test, expect } from '@playwright/test';

/**
 * The behavioural gate. Mounts 200 real messages through the production Thread,
 * scrolls to the middle, records an anchor row's viewport Y, prepends 50 older
 * messages, and asserts the anchor did not move. This is the assertion that
 * catches the bottom-yank bug — invisible to typecheck, unit tests, and grep.
 */
test('prepending older messages does not move the reader', async ({ page }) => {
  await page.goto('/harness.html');
  const scroller = page.locator('.chat-thread__scroll');
  await scroller.waitFor();

  // Cold-start fix: wait for the virtualizer to size the sizer (200 rows × 72px
  // ≈ 14,400px) before scrolling, so the anchor is never captured against a
  // stale layout. This replaces a sleep with a real signal.
  await page.waitForFunction(() => {
    const sizer = document.querySelector('.chat-thread__sizer') as HTMLElement | null;
    return !!sizer && sizer.offsetHeight > 10000;
  }, { timeout: 15_000 });

  // Scroll to the middle of the thread so a mid-history row is in view.
  await page.evaluate(() => {
    const el = document.querySelector('.chat-thread__scroll') as HTMLElement | null;
    if (el) el.scrollTop = 7000;
  });
  await page.waitForTimeout(300);

  // Pick the middle rendered row — a single stable anchor, no stale-count scan.
  const rows = page.locator('[data-message-id]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  const anchorRow = rows.nth(Math.min(Math.floor(count / 2), count - 1));
  const anchorId = await anchorRow.getAttribute('data-message-id');
  expect(anchorId).not.toBeNull();
  const before = (await anchorRow.boundingBox())!;

  // Prepend 50 older messages.
  await page.click('#prepend');
  await page.waitForTimeout(200);

  // The anchor row must stay within 1px of where it was.
  const after = (await page.locator(`[data-message-id="${anchorId}"]`).boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
});