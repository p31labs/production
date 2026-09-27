# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> @tablet >> /tokens matches baseline
- Location: tests/visual.spec.ts:73:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.surface-panel.active').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('.surface-panel.active').first()

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Visual baselines — 13 surfaces × 3 breakpoints (39 screenshots).
  5   |  * Navigation is IN-APP (click the sidebar nav item) because the portal's
  6   |  * deep-link pre-hook rewrites paths to hashes (BrowserRouter reads pathname),
  7   |  * so page.goto('/marketplace') would always land on Showcase. Force-click
  8   |  * works even when the sidebar is hidden at mobile widths.
  9   |  * Animated regions (ambient canvases, LED controller, motion demos) are
  10  |  * masked; CSS animations frozen. Baselines commit to
  11  |  * tests/visual.spec.ts-snapshots/. Regenerate intentionally with:
  12  |  *   npx playwright test --update-snapshots
  13  |  */
  14  | const NAV_LABELS: Record<string, string> = {
  15  |   '/': 'Home / Launcher',
  16  |   '/marketplace': 'Marketplace',
  17  |   '/catalog': 'Catalog',
  18  |   '/playground': 'Playground',
  19  |   '/a2ui': 'A2UI',
  20  |   '/tokens': 'Tokens',
  21  |   '/glass': 'Glass Lab',
  22  |   '/brands': 'Brands',
  23  |   '/recipes': 'Recipes',
  24  |   '/mcp': 'MCP Console',
  25  |   '/a11y': 'Accessibility',
  26  |   '/icons': 'Icons',
  27  |   '/dome': 'Dome',
  28  | };
  29  | const ROUTES = Object.keys(NAV_LABELS);
  30  | 
  31  | const VIEWPORTS = [
  32  |   { name: 'desktop', width: 1440, height: 900 },
  33  |   { name: 'tablet', width: 820, height: 1180 },
  34  |   { name: 'mobile', width: 480, height: 900 },
  35  | ];
  36  | 
  37  | async function open(page: Page, route: string) {
  38  |   // Freeze JS-driven animation (ambient rAF drift, motion springs) so the
  39  |   // screenshot target is stable: let ~12 frames render, then stop the loop.
  40  |   await page.addInitScript(() => {
  41  |     let frames = 0;
  42  |     const orig = window.requestAnimationFrame.bind(window);
  43  |     window.requestAnimationFrame = (cb: FrameRequestCallback) =>
  44  |       orig(() => {
  45  |         if (frames++ < 12) cb(performance.now());
  46  |       });
  47  |   });
  48  |   await page.goto('/');
  49  |   if (route !== '/') {
  50  |     const label = NAV_LABELS[route];
  51  |     // Native .click() dispatch works even when the sidebar is display:none
  52  |     // (mobile) — Playwright's force-click does not navigate a hidden button.
  53  |     await page.evaluate((lbl) => {
  54  |       const btn = [...document.querySelectorAll('.sidebar .nav-item')].find((b) => b.textContent?.includes(lbl));
  55  |       (btn as HTMLElement)?.click();
  56  |     }, label);
  57  |   }
> 58  |   await expect(page.locator('.surface-panel.active').first()).toBeVisible();
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  59  |   // Hide fixed/absolute chrome (ambient canvases, LED controller) — they
  60  |   // repaint via WebGL/rAF and would make captures non-deterministic. They are
  61  |   // z-0/absolute, so display:none does not shift the surface layout. The
  62  |   // motion demos are content-area → masked instead.
  63  |   await page.addStyleTag({ content: `
  64  |     * { animation: none !important; transition: none !important; }
  65  |     .starfield, .molecular-heart-layer, .devpanel { display: none !important; }
  66  |   `});
  67  | }
  68  | 
  69  | for (const vp of VIEWPORTS) {
  70  |   test.describe(`@${vp.name}`, () => {
  71  |     test.use({ viewport: { width: vp.width, height: vp.height } });
  72  |     for (const route of ROUTES) {
  73  |       test(`${route} matches baseline`, async ({ page }) => {
  74  |         await open(page, route);
  75  |         const name = `${vp.name}-${route.replace(/^\/+/, 'index').replace(/\//g, '-')}.png`;
  76  |         // Preflight: always write the actual screenshot so breakages have
  77  |         // instant visual evidence, regardless of pass/fail.
  78  |         await page.screenshot({ path: `test-results/preflight/${name}`, animations: 'disabled' });
  79  |         await expect(page.locator('#root')).toHaveScreenshot(name, {
  80  |           animations: 'disabled',
  81  |           mask: [
  82  |             page.locator('.motion-strip'),
  83  |           ],
  84  |         });
  85  |       });
  86  |     }
  87  |   });
  88  | }
  89  | 
  90  | // Tier 2 tripwire — the exact defect class: a composition card computing
  91  | // padding: 0 (the undefined p-* utilities bug). Fails the moment a card
  92  | // renders padding-less again, before the pixel diff can be ambiguous.
  93  | for (const vp of VIEWPORTS) {
  94  |   test.describe(`@${vp.name} · padding tripwire`, () => {
  95  |     test.use({ viewport: { width: vp.width, height: vp.height } });
  96  |     for (const route of ['/marketplace', '/catalog', '/glass', '/icons', '/a2ui']) {
  97  |       test(`${route} cards have padding`, async ({ page }) => {
  98  |         await open(page, route);
  99  |         const panel = page.locator('.surface-panel.active').first();
  100 |         // Wait for a composition card to actually render (lazy chunks can lag).
  101 |         await expect(panel.locator('.glass-strong, .glass-panel, .a2ui-pane').first()).toBeAttached();
  102 |         const pads = await panel.evaluate(() => {
  103 |           const out = [];
  104 |           for (const sel of ['.glass-strong', '.glass-panel', '.a2ui-pane', '.glab-hero', '.glab-strip']) {
  105 |             document.querySelectorAll(sel).forEach((el) => {
  106 |               const p = parseFloat(getComputedStyle(el).padding);
  107 |               if (Number.isFinite(p) && p > 0) out.push(p);
  108 |             });
  109 |           }
  110 |           return out;
  111 |         });
  112 |         expect(pads.length, 'at least one padded composition card').toBeGreaterThan(0);
  113 |       });
  114 |     }
  115 |   });
  116 | }
```