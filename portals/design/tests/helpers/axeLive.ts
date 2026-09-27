import { chromium, type Browser } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * axeLive — run axe-core against the LIVE deployed site, outside the test
 * runner. Uses browser.newContext() — @axe-core/playwright throws without it
 * when invoked ad-hoc (the pattern that broke the WP-2026-09-30 live probe).
 *
 * Not a spec: no .spec.ts suffix, so the gate's testMatch never picks it up.
 * It exists for manual/live verification:
 *   node --input-type=module -e "..."
 * or from a scratch script in scripts/.
 */
export async function axeLive(
  url: string,
  tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  routes: { label: string; click: () => void }[] = [],
) {
  const browser: Browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const results = await new AxeBuilder({ page }).withTags(tags).analyze();
    return results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  } finally {
    await browser.close();
  }
}