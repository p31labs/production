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

const VENDOR_VIOLATION_IDS = new Set([
  // design-core SpoonDia toggle buttons use aria-checked (vendored markup,
  // documented in docs/24-DESIGN-SYSTEM-AUDIT.md — do not patch locally).
  'aria-allowed-attr',
]);

// design-core Button owns .btn/.btn-sm color-contrast (vendored recipes,
// documented in docs/24 — QPJ does not own these). Filter by node target.
const isVendorNode = (target: string[]) =>
  target.some((t) => t.includes('btn') || t.includes('aria-checked'));

for (const route of ROUTES) {
  test(`a11y: ${route.name}`, async ({ page }) => {
    await page.goto(route.hash);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    const remaining = results.violations.filter((v) => {
      if (VENDOR_VIOLATION_IDS.has(v.id)) return false;
      if (v.id === 'color-contrast' && v.nodes.every((n) => isVendorNode(n.target))) return false;
      return true;
    });
    expect(remaining).toEqual([]);
  });
}
