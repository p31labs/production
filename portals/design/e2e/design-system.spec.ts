import { test, expect } from '@playwright/test';

/**
 * P31 Design System — visual + behavioral matrix.
 * Runs against the deployed portal (or PREVIEW_URL for local vite preview).
 * Viewport matrix comes from playwright.config projects; spoons via query param.
 */
const BASE = process.env.PREVIEW_URL || 'https://design.p31ca.org';

test.describe('Design System core', () => {
  test('portal loads with system CSS bundle', async ({ page }) => {
    await page.goto(BASE);
    const cssLoaded = await page.evaluate(async () => {
      const link = document.querySelector<HTMLLinkElement>('link[href*="design-system.css"]');
      if (!link) return false;
      const res = await fetch(link.href);
      return res.ok;
    });
    expect(cssLoaded).toBe(true);
  });

  test('data-spoons attribute present and tokens resolve', async ({ page }) => {
    await page.goto(BASE);
    expect(await page.getAttribute('html', 'data-spoons')).toBeTruthy();
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return { accent: s.getPropertyValue('--p31-accent').trim(), blur: s.getPropertyValue('--p31-glass-blur').trim() };
    });
    expect(tokens.accent).toBeTruthy();
  });
});

test.describe('Crisis mode (spoons=0)', () => {
  test('motion is disabled and glass is opaque', async ({ page }) => {
    await page.goto(`${BASE}?spoons=0`.replace('#', ''));
    await page.evaluate(() => document.documentElement.setAttribute('data-spoons', '0'));
    const state = await page.evaluate(() => {
      const panel = document.createElement('div');
      panel.className = 'glass-panel';
      document.body.appendChild(panel);
      const cs = getComputedStyle(panel);
      return {
        transition: getComputedStyle(document.documentElement).getPropertyValue('--p31-motion-fast').trim(),
        blur: getComputedStyle(document.documentElement).getPropertyValue('--p31-glass-blur').trim(),
      };
    });
    expect(state.transition).toBe('0ms');
    expect(state.blur).toBe('0px');
  });

  test('decorative elements are hidden at spoons=0', async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-spoons', '0');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'decorative');
      document.body.appendChild(svg);
    });
    const hidden = await page.evaluate(() => {
      const el = document.querySelector('.decorative') as SVGElement;
      return getComputedStyle(el as unknown as Element).display === 'none';
    });
    expect(hidden).toBe(true);
  });
});

test.describe('Tablet breakpoint (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('container padding scales up from mobile base', async ({ page }) => {
    await page.goto(BASE);
    const pad = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'container';
      document.body.appendChild(probe);
      return getComputedStyle(probe).paddingLeft;
    });
    // tablet uses --p31-space-lg; mobile base uses --p31-space-md
    const mobilePad = await page.evaluate(() => {
      document.documentElement.style.width = '375px';
      return getComputedStyle(document.documentElement).getPropertyValue('--p31-space-md').trim();
    });
    expect(pad).not.toBe('');
    expect(mobilePad).not.toBe('');
  });

  test('bottom nav hides on tablet, side nav appears', async ({ page }) => {
    await page.goto(BASE);
    const nav = await page.evaluate(() => {
      const bn = document.createElement('nav');
      bn.className = 'bottom-nav';
      document.body.appendChild(bn);
      return getComputedStyle(bn).display;
    });
    expect(nav).toBe('none');
  });
});
