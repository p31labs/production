// Playwright skeleton for B4. TODO(blocked-on: selectors) replace with real chat selectors.
import { test, expect } from '@playwright/test';

test.describe('reduce', () => {
  test.use({ reducedMotion: 'reduce' });
  test('animations collapse, functional feedback remains', async ({ page }) => {
    await page.goto('/');
    const durations = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.chat-msg-bubble'))
        .map((el) => getComputedStyle(el).animationDuration));
    const toMs = (v: string) => v.split(',').map((t) => { const s = t.trim(); const n = parseFloat(s); return s.endsWith('ms') ? n : n * 1000; });
    for (const d of durations) {
      for (const ms of toMs(d)) expect(ms).toBeLessThanOrEqual(0.01);
    }
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
    expect(outline).not.toBe('none');
  });
});

test.describe('no-preference', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('animations still run', async ({ page }) => {
    await page.goto('/');
    // TODO: assert non-zero animationDuration on an opt-in animated element.
  });
});
