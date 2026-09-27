import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * A11y gate (WP-2026-09-30) — axe-core scans the highest-signal surfaces for
 * WCAG 2.1 AA violations. Scope: A + AA tags only (AAA creates noise).
 * Blocking rule: only critical/serious violations fail the gate; moderate and
 * minor go to a tech-debt ledger. ZERO-tolerance: no "known violations"
 * allowlist — if it appears, fix it or the PR does not merge.
 *
 * Same in-app navigation + webServer as the visual spec (the deep-link
 * pre-hook rewrites direct paths to hashes).
 */
const NAV_LABELS: Record<string, string> = {
  '/marketplace': 'Marketplace',
  '/catalog': 'Catalog',
  '/tokens': 'Tokens',
  '/glass': 'Glass Lab',
  '/recipes': 'Recipes',
  '/icons': 'Icons',
};

const ROUTES = ['/', ...Object.keys(NAV_LABELS)];

async function open(page: Page, route: string) {
  await page.goto('/');
  if (route !== '/') {
    const label = NAV_LABELS[route];
    await page.evaluate((lbl) => {
      const btn = [...document.querySelectorAll('.sidebar .nav-item')].find((b) => b.textContent?.includes(lbl));
      (btn as HTMLElement)?.click();
    }, label);
  }
  await expect(page.locator('.surface-panel.active').first()).toBeVisible();
}

for (const route of ROUTES) {
  test(`${route} has no critical/serious WCAG 2.1 AA violations`, async ({ page }) => {
    await open(page, route);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const summary = blocking.map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({ target: n.target.join(' '), summary: n.failureSummary.split('\n')[0] })),
    }));
    expect(blocking, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}