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

// design-core vendored selectors (exact class match — no substrings).
const VENDOR_NODE_TARGETS = new Set([
  '.btn', '.btn-primary', '.btn-secondary', '.btn-ghost', '.btn-sm', '.btn-lg',
]);
const VENDOR_VIOLATION_IDS = new Set([
  // SpoonDial `aria-checked` on toggle buttons — vendored markup,
  // documented in docs/24-DESIGN-SYSTEM-AUDIT.md (do not patch locally).
  'aria-allowed-attr',
]);

const isVendorNode = (node: { target: string[] }) =>
  node.target.some((t) => {
    const cls = t.split(' > ').pop()!.split(':')[0];
    return VENDOR_NODE_TARGETS.has(cls);
  });

const isVendor = (v: { id: string; nodes: { target: string[] }[] }) =>
  VENDOR_VIOLATION_IDS.has(v.id) ||
  (v.id === 'color-contrast' && v.nodes.every(isVendorNode));

for (const route of ROUTES) {
  test(`a11y: ${route.name}`, async ({ page }) => {
    await page.goto(route.hash);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    // QPJ owns zero violations per route — fails loudly on any QPJ-owned issue.
    const qpwOwned = results.violations.filter((v) => !isVendor(v));
    expect(qpwOwned).toEqual([]);

    // Vendor IDs are pinned — a change (vendor fixed, added, or removed) fails loudly.
    const vendorIds = results.violations.filter(isVendor).map((v) => v.id).sort();
    const expectedVendorIds =
      route.hash === '#/entry' || route.hash === '#/you'
        ? ['aria-allowed-attr', 'color-contrast']
        : ['aria-allowed-attr'];
    expect(vendorIds).toEqual(expectedVendorIds);
  });
}
