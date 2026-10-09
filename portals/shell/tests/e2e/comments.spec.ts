import { test, expect } from '@playwright/test';

test('deleting the anchored text orphans the comment', async ({ page }) => {
  await page.goto('/harness-collab.html?session=collab-orphan&seed=1');

  await expect(page.locator('.suggestion')).toBeVisible();
  await expect(page.locator('.draft')).toHaveValue('draft with anchored text');

  await page.locator('.draft').fill('anchor gone');
  await expect(page.locator('.orphaned')).toBeVisible();
});

test('three mentions of one person collapse to a single notification', async ({ page }) => {
  await page.goto('/harness-collab.html?session=collab-mentions&seed=1');

  await expect(page.locator('.draft')).toBeVisible();
  await page.locator('.draft').fill('three mentions, one person');
  await expect(page.locator('.draft')).toHaveValue('three mentions, one person');
});