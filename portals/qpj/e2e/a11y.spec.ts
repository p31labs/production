import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  { hash: '#/entry', name: 'entry' },
  { hash: '#/street', name: 'street' },
  { hash: '#/talk', name: 'talk' },
  { hash: '#/you', name: 'you' },
  { hash: '#/switch', name: 'switch' },
  { hash: '#/craft', name: 'craft' },
  { hash: '#/workshop', name: 'workshop' },
  { hash: '#/site', name: 'site' },
  { hash: '#/worker', name: 'worker' },
];

for (const route of ROUTES) {
  test(`a11y: ${route.name}`, async ({ page }) => {
    await page.goto(route.hash);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
