# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: design-system.spec.ts >> Crisis mode (spoons=0) >> motion is disabled and glass is opaque
- Location: e2e/design-system.spec.ts:34:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "0ms"
Received: "0s"
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: Ⓟ
      - text: 31 Design
    - generic [ref=e9]:
      - generic [ref=e10]:
        - text: 💎
        - strong [ref=e11]: —
        - text: LOVE
      - generic [ref=e12]: ⬡ Design System
    - radiogroup "Cognitive load" [ref=e14]:
      - button "Spoons = 0" [ref=e15] [cursor=pointer]
      - button "Spoons = 1" [ref=e20] [cursor=pointer]
      - button "Spoons = 2" [ref=e25] [cursor=pointer]
      - button "Spoons = 3" [ref=e30] [cursor=pointer]
      - button "Spoons = 4" [ref=e35] [cursor=pointer]
      - button "Spoons = 5" [ref=e40] [cursor=pointer]
  - navigation "Design system sections" [ref=e45]:
    - button "Starfield" [ref=e46] [cursor=pointer]
    - button "Colors" [ref=e50] [cursor=pointer]
    - button "Typography" [ref=e58] [cursor=pointer]
    - button "Spoons" [ref=e64] [cursor=pointer]
    - button "Glass" [ref=e68] [cursor=pointer]
    - button "Spacing" [ref=e74] [cursor=pointer]
    - button "WCAG 2.2" [ref=e80] [cursor=pointer]
    - button "Components" [ref=e88] [cursor=pointer]
    - button "Playground" [ref=e94] [cursor=pointer]
    - button "Icons" [ref=e98] [cursor=pointer]
    - button "Templates" [ref=e104] [cursor=pointer]
    - button "Notifications" [ref=e110] [cursor=pointer]
    - button "MCP Console" [ref=e115] [cursor=pointer]
    - button "MCP Docs" [ref=e120] [cursor=pointer]
  - main [ref=e126]:
    - generic [ref=e127]:
      - heading "Starfield" [level=2] [ref=e128]
      - paragraph [ref=e129]: Jitterbug starfield — 12-vertex cuboctahedron with 290 stars + 7 bright anchors.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * P31 Design System — visual + behavioral matrix.
  5  |  * Runs against the deployed portal (or PREVIEW_URL for local vite preview).
  6  |  * Viewport matrix comes from playwright.config projects; spoons via query param.
  7  |  */
  8  | const BASE = process.env.PREVIEW_URL || 'https://design.p31ca.org';
  9  | 
  10 | test.describe('Design System core', () => {
  11 |   test('portal loads with system CSS bundle', async ({ page }) => {
  12 |     await page.goto(BASE);
  13 |     const cssLoaded = await page.evaluate(async () => {
  14 |       const link = document.querySelector<HTMLLinkElement>('link[href*="design-system.css"]');
  15 |       if (!link) return false;
  16 |       const res = await fetch(link.href);
  17 |       return res.ok;
  18 |     });
  19 |     expect(cssLoaded).toBe(true);
  20 |   });
  21 | 
  22 |   test('data-spoons attribute present and tokens resolve', async ({ page }) => {
  23 |     await page.goto(BASE);
  24 |     expect(await page.getAttribute('html', 'data-spoons')).toBeTruthy();
  25 |     const tokens = await page.evaluate(() => {
  26 |       const s = getComputedStyle(document.documentElement);
  27 |       return { accent: s.getPropertyValue('--p31-accent').trim(), blur: s.getPropertyValue('--p31-glass-blur').trim() };
  28 |     });
  29 |     expect(tokens.accent).toBeTruthy();
  30 |   });
  31 | });
  32 | 
  33 | test.describe('Crisis mode (spoons=0)', () => {
  34 |   test('motion is disabled and glass is opaque', async ({ page }) => {
  35 |     await page.goto(`${BASE}?spoons=0`.replace('#', ''));
  36 |     await page.evaluate(() => document.documentElement.setAttribute('data-spoons', '0'));
  37 |     const state = await page.evaluate(() => {
  38 |       const panel = document.createElement('div');
  39 |       panel.className = 'glass-panel';
  40 |       document.body.appendChild(panel);
  41 |       const cs = getComputedStyle(panel);
  42 |       return {
  43 |         transition: getComputedStyle(document.documentElement).getPropertyValue('--p31-motion-fast').trim(),
  44 |         blur: getComputedStyle(document.documentElement).getPropertyValue('--p31-glass-blur').trim(),
  45 |       };
  46 |     });
> 47 |     expect(state.transition).toBe('0ms');
     |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  48 |     expect(state.blur).toBe('0px');
  49 |   });
  50 | 
  51 |   test('decorative elements are hidden at spoons=0', async ({ page }) => {
  52 |     await page.goto(BASE);
  53 |     await page.evaluate(() => {
  54 |       document.documentElement.setAttribute('data-spoons', '0');
  55 |       const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  56 |       svg.setAttribute('class', 'decorative');
  57 |       document.body.appendChild(svg);
  58 |     });
  59 |     const hidden = await page.evaluate(() => {
  60 |       const el = document.querySelector('.decorative') as SVGElement;
  61 |       return getComputedStyle(el as unknown as Element).display === 'none';
  62 |     });
  63 |     expect(hidden).toBe(true);
  64 |   });
  65 | });
  66 | 
  67 | test.describe('Tablet breakpoint (768px)', () => {
  68 |   test.use({ viewport: { width: 768, height: 1024 } });
  69 | 
  70 |   test('container padding scales up from mobile base', async ({ page }) => {
  71 |     await page.goto(BASE);
  72 |     const pad = await page.evaluate(() => {
  73 |       const probe = document.createElement('div');
  74 |       probe.className = 'container';
  75 |       document.body.appendChild(probe);
  76 |       return getComputedStyle(probe).paddingLeft;
  77 |     });
  78 |     // tablet uses --p31-space-lg; mobile base uses --p31-space-md
  79 |     const mobilePad = await page.evaluate(() => {
  80 |       document.documentElement.style.width = '375px';
  81 |       return getComputedStyle(document.documentElement).getPropertyValue('--p31-space-md').trim();
  82 |     });
  83 |     expect(pad).not.toBe('');
  84 |     expect(mobilePad).not.toBe('');
  85 |   });
  86 | 
  87 |   test('bottom nav hides on tablet, side nav appears', async ({ page }) => {
  88 |     await page.goto(BASE);
  89 |     const nav = await page.evaluate(() => {
  90 |       const bn = document.createElement('nav');
  91 |       bn.className = 'bottom-nav';
  92 |       document.body.appendChild(bn);
  93 |       return getComputedStyle(bn).display;
  94 |     });
  95 |     expect(nav).toBe('none');
  96 |   });
  97 | });
  98 | 
```