import { test, expect } from '@playwright/test';

/**
 * LCP measurement fix (WP-2026-09-28) — the earlier harness read
 * performance.getEntriesByName('largest-contentful-paint') directly, which
 * stays empty until LCP finalizes, returning -1 forever. This uses a
 * PerformanceObserver (buffered) + a 4s settle, resolving with the latest
 * recorded LCP. Gate-friendly: runs against the local webServer, asserts the
 * measurement actually returns a real number.
 */
test('LCP reports a real value on /', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);

  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let value = -1;
        const po = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          value = Math.round(entries[entries.length - 1].startTime);
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
        document.addEventListener(
          'visibilitychange',
          () => {
            if (document.visibilityState === 'hidden') {
              po.disconnect();
              resolve(value);
            }
          },
          { once: true },
        );
        setTimeout(() => {
          po.disconnect();
          resolve(value);
        }, 4000);
      }),
  );

  expect(lcp, 'LCP should be a positive ms value, not -1').toBeGreaterThan(0);
});