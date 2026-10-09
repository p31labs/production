import { test, expect } from '@playwright/test';

/**
 * The sidebar-flicker gate. Seeds 200 threads through the production
 * ThreadList, scrolls it rapidly, and asserts a settled row does not drift —
 * the absolute-positioning contract keeps row offsets deterministic, where a
 * padding-based layout feeds the virtualizer a measurement-correction loop.
 */
test('sidebar rows do not jump after scrolling settles', async ({ page }) => {
  await page.goto('/harness-threads.html');
  await page.locator('[data-thread-id]').first().waitFor();

  const scroller = page.locator('.threadlist__scroll');

  // Rapid scroll: several fixed advances, then settle.
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      const el = document.querySelector('.threadlist__scroll') as HTMLElement | null;
      if (el) el.scrollTop += 400;
    });
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(300);

  // Read a visible row's position twice, ~120ms apart; it must not drift.
  const visible = page.locator('[data-thread-id]').filter({ has: page.locator(':scope') }).first();
  const anchor = page.locator('[data-thread-id]').first();
  const candidates = page.locator('[data-thread-id]');
  const count = await candidates.count();
  expect(count).toBeGreaterThan(0);

  let chosen = anchor;
  for (let i = 0; i < count; i++) {
    const box = await candidates.nth(i).boundingBox();
    if (box && box.y > 0 && box.y < (page.viewportSize()?.height ?? 900)) {
      chosen = candidates.nth(i);
      break;
    }
  }

  const y1 = (await chosen.boundingBox())?.y ?? -1;
  await page.waitForTimeout(120);
  const y2 = (await chosen.boundingBox())?.y ?? -1;

  expect(Math.abs(y2 - y1)).toBeLessThan(1);
});