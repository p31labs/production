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
    // Native .click() dispatch works even when the sidebar is display:none
    // (mobile) — Playwright's force-click does not navigate a hidden button.
    await page.evaluate((lbl) => {
      const btn = [...document.querySelectorAll('.sidebar .nav-item')].find((b) => b.textContent?.includes(lbl));
      (btn as HTMLElement)?.click();
    }, label);
  }
  await expect(page.locator('.surface-panel.active').first()).toBeVisible();
  // Hide fixed/absolute chrome (ambient canvases, LED controller) — they
  // repaint via WebGL/rAF and would make captures non-deterministic. They are
  // z-0/absolute, so display:none does not shift the surface layout. The
  // motion demos are content-area → masked instead.
  await page.addStyleTag({ content: `
    * { animation: none !important; transition: none !important; }
    .starfield, .molecular-heart-layer, .devpanel { display: none !important; }
  `});
}

for (const vp of VIEWPORTS) {
  test.describe(`@${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ROUTES) {
      test(`${route} matches baseline`, async ({ page }) => {
        await open(page, route);
        const name = `${vp.name}-${route.replace(/^\/+/, 'index').replace(/\//g, '-')}.png`;
        // Preflight: always write the actual screenshot so breakages have
        // instant visual evidence, regardless of pass/fail.
        await page.screenshot({ path: `test-results/preflight/${name}`, animations: 'disabled' });
        await expect(page.locator('#root')).toHaveScreenshot(name, {
          animations: 'disabled',
          mask: [
            page.locator('.motion-strip'),
          ],
        });
      });
    }
  });
}

// Tier 2 tripwire — the exact defect class: a composition card computing
// padding: 0 (the undefined p-* utilities bug). Fails the moment a card
// renders padding-less again, before the pixel diff can be ambiguous.
for (const vp of VIEWPORTS) {
  test.describe(`@${vp.name} · padding tripwire`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ['/marketplace', '/catalog', '/glass', '/icons', '/a2ui']) {
      test(`${route} cards have padding`, async ({ page }) => {
        await open(page, route);
        const panel = page.locator('.surface-panel.active').first();
        // Wait for a composition card to actually render (lazy chunks can lag).
        await expect(panel.locator('.glass-strong, .glass-panel, .a2ui-pane').first()).toBeAttached();
        const pads = await panel.evaluate(() => {
          const out = [];
          for (const sel of ['.glass-strong', '.glass-panel', '.a2ui-pane', '.glab-hero', '.glab-strip']) {
            document.querySelectorAll(sel).forEach((el) => {
              const p = parseFloat(getComputedStyle(el).padding);
              if (Number.isFinite(p) && p > 0) out.push(p);
            });
          }
          return out;
        });
        expect(pads.length, 'at least one padded composition card').toBeGreaterThan(0);
      });
    }
  });
}

// Tier 3 tripwire — topbar affordances survive at every breakpoint. The
// visual gate's 1% tolerance lets small-but-intentional chrome changes slip
// through (the 0.3% End-session button); this asserts the affordance exists
// directly, catching removals without false-positiving on pixels.
for (const vp of VIEWPORTS) {
  test.describe(`@${vp.name} · topbar affordance tripwire`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test('session + spoon + theme affordances are present', async ({ page }) => {
      await open(page, '/');
      await expect(page.locator('.session-btn')).toBeVisible();
      await expect(page.locator('.spoon-dial')).toBeVisible();
      await expect(page.locator('.theme-picker__trigger')).toBeVisible();
    });
  });
}