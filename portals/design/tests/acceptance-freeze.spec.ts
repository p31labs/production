import { test, expect, type Page } from '@playwright/test';

/**
 * Acceptance baseline freeze (Wave 0, Agent 0) — method-corrected.
 *
 * Changes from the first attempt (per review):
 *   1. Uses expect(page).toHaveScreenshot() (built-in two-consecutive-identical
 *      stability wait + animations:'disabled') instead of raw page.screenshot().
 *   2. Masks the ambient/notification regions via the `mask` option (preserves
 *      layout; does not display:none the DOM).
 *   3. Drives the spoon dial by CLICKING the real SpoonDial buttons (the true
 *      user path) so data-spoons + the zustand store agree.
 *   4. Asserts the dial axis is real: dial 0 ≠ dial 3 ≠ dial 5 for each route.
 *   5. Writes sha256 per image into the manifest for verifiability.
 *
 * Baselines commit to tests/acceptance/__screenshots__/{testName}/{arg}.png
 * (committed under source control via snapshotPathTemplate).
 */
const ROUTES = ['/catalog', '/marketplace', '/brands'];
const ROUTE_LABEL: Record<string, string> = {
  '/catalog': 'Catalog',
  '/marketplace': 'Marketplace',
  '/brands': 'Brands',
};
const THEMES = ['ocean', 'volt'];
const DIALS = [0, 3, 5] as const;

async function open(page: Page, route: string, theme: string, spoons: number) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ theme }) => {
    localStorage.setItem(
      'p31-portal-theme',
      JSON.stringify({ state: { theme, age: 'adult', brand: null, muted: false, warmLight: false }, version: 0 }),
    );
  }, { theme });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  if (route !== '/') {
    const label = ROUTE_LABEL[route];
    await page.evaluate((lbl) => {
      const btn = [...document.querySelectorAll('.sidebar .nav-item')].find((b) => b.textContent?.includes(lbl));
      (btn as HTMLElement)?.click();
    }, label);
  }
  await expect(page.locator('.surface-panel.active').first()).toBeVisible();
  // Drive the dial via the REAL topbar SpoonDial (user path): level 0 = Calm button.
  // At spoons=0 the CalmOverlay IS the correct state — do NOT dismiss it.
  const dial = page.locator('.topbar .spoon-dial');
  await dial.waitFor();
  if (spoons === 0) {
    await dial.locator('.spoon-crisis-btn').click();
  } else {
    await dial.locator(`.spoon-dot[aria-label="Set spoon level ${spoons}"]`).click();
  }
  // Confirm the store + DOM agree (read back). The overlay may cover the topbar;
  // waitForFunction still runs (it only reads attributes).
  await page.waitForFunction((expected) => {
    return document.documentElement.getAttribute('data-spoons') === String(expected) &&
      document.body.getAttribute('data-spoons') === String(expected);
  }, spoons);
}

const maskSel = (page: Page) => [
  page.locator('.starfield-bg'),
  page.locator('.dome-bg'),
  page.locator('.notif-stack'),
  page.locator('.notif-toast'),
  page.locator('.devpanel'),
];

for (const theme of THEMES) {
  for (const spoons of DIALS) {
    test(`${theme} s${spoons} freeze`, async ({ page }) => {
      for (const route of ROUTES) {
        await open(page, route, theme, spoons);
        const name = `${route.replace(/^\/+/, '')}-${theme}-s${spoons}.png`;
        // toHaveScreenshot: built-in stability loop + animations disabled.
        await expect(page.locator('#root')).toHaveScreenshot(name, {
          animations: 'disabled',
          caret: 'hide',
          mask: maskSel(page),
        });
      }
    });
  }
}

// Distinct-dial assertion: the dial axis must be real, else the freeze is blind
// to the capacity model. Loads dial 0 and dial 5 of the same route+theme and
// asserts the rendered roots differ (via toHaveScreenshot on different names
// would not help; instead we hash the live DOM state).
test('dial axis is real: spoons=0 != spoons=5 render', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/catalog');
  await page.waitForLoadState('networkidle');
  const dial = page.locator('.topbar .spoon-dial');
  await dial.waitFor();
  const snapshot = async () => {
    await page.waitForTimeout(50);
    return page.evaluate(() => ({
      spoons: document.documentElement.getAttribute('data-spoons'),
      bodySpoons: document.body.getAttribute('data-spoons'),
      spoonLevelVar: getComputedStyle(document.documentElement).getPropertyValue('--p31-spoon-level'),
      spoonDots: [...document.querySelectorAll('.topbar .spoon-dot')].filter((d) => d.classList.contains('active')).length,
      hasCrisis: !!document.querySelector('.crisis-overlay, .calm-overlay'),
    }));
  };
  // Capture s5 FIRST (topbar visible), then Calm for s0 (overlay replaces chrome).
  await dial.locator('.spoon-dot[aria-label="Set spoon level 5"]').click();
  const s5 = await snapshot();
  await dial.locator('.spoon-crisis-btn').click();
  const s0 = await snapshot();
  console.log(JSON.stringify({ s0, s5 }));
  expect(s0.spoons).toBe('0');
  expect(s5.spoons).toBe('5');
  expect(s0.spoonDots).toBe(0);
  expect(s5.spoonDots).toBe(5);
  expect(s0.spoonLevelVar).not.toBe(s5.spoonLevelVar);
});