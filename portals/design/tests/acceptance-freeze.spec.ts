import { test, expect, type Page } from '@playwright/test';

/**
 * Acceptance baseline freeze (Wave 0, Agent 0).
 * Captures 18 deterministic screenshots:
 *   routes {/catalog, /marketplace, /brands} × themes {ocean, volt} × dial {0, 3, 5}
 * Each image is captured TWICE; the two captures must be pixel-identical or the
 * freeze fails (nondeterminism must be fixed before the baseline is trustworthy).
 * The baseline is a CAPTURE, not an approval — every image is marked PENDING_HUMAN.
 * Does NOT use --update-snapshots; writes to test-results/acceptance/baseline/.
 */
const ROUTES = ['/catalog', '/marketplace', '/brands'];
const ROUTE_LABEL: Record<string, string> = {
  '/catalog': 'Catalog',
  '/marketplace': 'Marketplace',
  '/brands': 'Brands',
};
const THEMES = ['ocean', 'volt'];
const DIALS = [0, 3, 5];
const VIEWPORT = { width: 2256, height: 1415 };

async function prime(page: Page, theme: string, spoons: number) {
  // motion/react respects prefers-reduced-motion: reduce → all variants instant.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Set theme via the persisted zustand store, then spoons via data-spoons.
  await page.addInitScript(({ theme, spoons }) => {
    localStorage.setItem(
      'p31-portal-theme',
      JSON.stringify({ state: { theme, age: 'adult', brand: null, muted: false, warmLight: false }, version: 0 }),
    );
    document.documentElement.setAttribute('data-spoons', String(spoons));
    document.documentElement.setAttribute('data-theme', theme);
  }, { theme, spoons });
}

async function freezeCapture(page: Page, route: string, theme: string, spoons: number, pass: 1 | 2) {
  // Freeze JS-driven animation (ambient rAF) + CSS transitions so captures are stable.
  await page.addInitScript(() => {
    let frames = 0;
    const orig = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      orig(() => { if (frames++ < 12) cb(performance.now()); });
  });
  await page.goto('/');
  if (route !== '/') {
    const label = ROUTE_LABEL[route];
    await page.evaluate((lbl) => {
      const btn = [...document.querySelectorAll('.sidebar .nav-item')].find((b) => b.textContent?.includes(lbl));
      (btn as HTMLElement)?.click();
    }, label);
  }
  await expect(page.locator('.surface-panel.active').first()).toBeVisible();
  await page.addStyleTag({ content: `
    * { animation: none !important; transition: none !important; }
    .starfield, .starfield-bg, .dome-bg, .molecular-heart-layer, .devpanel,
    [class*="led"], [class*="Led"], [class*="led-controller"], .led-chip,
    .notif-stack, .notif-toast, .notif-toast-text, .notif-stack__clear,
    canvas { display: none !important; }
    :root { --motion-scale: 0 !important; }
  `});
  // Prime theme + spoons again after SPA nav (zustand store may re-apply).
  await page.evaluate(({ theme, spoons }) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-spoons', String(spoons));
  }, { theme, spoons });
  // Settle: wait for the lazy route chunk + previews to finish, then let the
  // paint settle before capture. Determinism requires the tree to be stable.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const name = `${route.replace(/^\/+/, '')}-${theme}-s${spoons}-pass${pass}.png`;
  await page.screenshot({ path: `test-results/acceptance/baseline/${name}`, animations: 'disabled' });
  return name;
}

for (const theme of THEMES) {
  for (const spoons of DIALS) {
    test(`freeze ${theme} s${spoons} pass1`, async ({ page }) => {
      await page.setViewportSize(VIEWPORT);
      await prime(page, theme, spoons);
      for (const route of ROUTES) await freezeCapture(page, route, theme, spoons, 1);
    });
    test(`freeze ${theme} s${spoons} pass2 (determinism)`, async ({ page }) => {
      await page.setViewportSize(VIEWPORT);
      await prime(page, theme, spoons);
      for (const route of ROUTES) await freezeCapture(page, route, theme, spoons, 2);
    });
  }
}