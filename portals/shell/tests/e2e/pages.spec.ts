import { test, expect } from '@playwright/test';

/**
 * The collab pages behavioural gate, run against harness-collab.html. The
 * convergence spec uses an empty draft (no seed) so two pages merge their
 * edits; the suggestion/orphan specs use `?seed=1` so the initial draft and a
 * real Y.RelativePosition anchor exist.
 */
test('two pages converge on both edits', async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto('/harness-collab.html?session=collab-converge');
  await pageB.goto('/harness-collab.html?session=collab-converge');

  await pageA.locator('.draft').focus();
  await pageA.keyboard.press('End');
  await pageA.keyboard.type('AAA');
  await pageB.locator('.draft').focus();
  await pageB.keyboard.press('End');
  await pageB.keyboard.type('BBB');

  await pageA.waitForTimeout(600);

  await expect(pageA.locator('.draft')).toHaveValue(/AAA/);
  await expect(pageA.locator('.draft')).toHaveValue(/BBB/);
  await expect(pageB.locator('.draft')).toHaveValue(/AAA/);
  await expect(pageB.locator('.draft')).toHaveValue(/BBB/);

  await context.close();
});

test('an agent suggestion does not change the draft until accepted', async ({ page }) => {
  await page.goto('/harness-collab.html?session=collab-suggestion&seed=1');

  await expect(page.locator('.draft')).toHaveValue('draft with anchored text');
  await expect(page.locator('.suggestion')).toBeVisible();
  await expect(page.locator('#accept')).toBeVisible();

  // The suggestion is rendered but not applied: the draft is untouched.
  await expect(page.locator('.draft')).not.toHaveValue(/suggestion/);

  await page.click('#accept');
  await expect(page.locator('.draft')).toHaveValue(/suggestion/);
});

test('deleting the anchored text orphans the suggestion', async ({ page }) => {
  await page.goto('/harness-collab.html?session=collab-orphan&seed=1');

  await expect(page.locator('.suggestion')).toBeVisible();
  await expect(page.locator('.draft')).toHaveValue('draft with anchored text');

  // Delete the anchored text; the relative position resolves to a tombstone
  // whose content no longer matches — the suggestion is orphaned.
  await page.locator('.draft').fill('anchor gone');
  await expect(page.locator('.orphaned')).toBeVisible();
});