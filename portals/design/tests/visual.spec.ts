import { test, expect, type Page } from '@playwright/test';

/**
 * Visual baselines — 13 surfaces × 3 breakpoints (39 screenshots).
 * Navigation is IN-APP (click the sidebar nav item) because the portal's
 * deep-link pre-hook rewrites paths to hashes (BrowserRouter reads pathname),
 * so page.goto('/marketplace') would always land on Showcase. Force-click
 * works even when the sidebar is hidden at mobile widths.
 * Animated regions (ambient canvases, LED controller, motion demos) are
 * masked; CSS animations frozen. Baselines commit to
 * tests/visual.spec.ts-snapshots/. Regenerate intentionally with:
 *   npx playwright test --update-snapshots
 */
const NAV_LABELS: Record<string, string> = {
  '/': 'Home / Launcher',
  '/marketplace': 'Marketplace',
  '/catalog': 'Catalog',
  '/playground': 'Playground',
  '/a2ui': 'A2UI',
  '/tokens': 'Tokens',
  '/glass': 'Glass Lab',
  '/brands': 'Brands',
  '/recipes': 'Recipes',
  '/mcp': 'MCP Console',
  '/a11y': 'Accessibility',
  '/icons': 'Icons',
  '/dome': 'Dome',
};
const ROUTES = Object.keys(NAV_LABELS);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 480, height: 900 },
];

async function open(page: Page, route: string) {
  // Freeze JS-driven animation (ambient rAF drift, motion springs) so the
  // screenshot target is stable: let ~12 frames render, then stop the loop.
  await page.addInitScript(() => {
    let frames = 0;
    const orig = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      orig(() => {
        if (frames++ < 12) cb(performance.now());
      });
  });
  await page.goto('/');
  if (route !== '/') {
    const label = NAV_LABELS[route];
    await page.locator('.sidebar .nav-item', { hasText: label }).first().click({ force: true });
  }
  await expect(page.locator('.surface-panel.active').first()).toBeVisible();
  await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
}

for (const vp of VIEWPORTS) {
  test.describe(`@${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ROUTES) {
      test(`${route} matches baseline`, async ({ page }) => {
        await open(page, route);
        const name = `${vp.name}-${route.replace(/^\/+/, 'index').replace(/\//g, '-')}.png`;
        await expect(page.locator('#root')).toHaveScreenshot(name, {
          animations: 'disabled',
          mask: [
            page.locator('.starfield'),
            page.locator('.molecular-heart-layer'),
            page.locator('.devpanel'),
            page.locator('.motion-strip'),
          ],
        });
      });
    }
  });
}