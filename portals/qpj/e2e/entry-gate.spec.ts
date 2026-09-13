import { test, expect } from '@playwright/test';

test('guest lands on entry, completes onboarding, arrives at verified street', async ({ page }) => {
  await page.goto('#/entry');

  await expect(page.getByRole('region', { name: 'Set up your identity' })).toBeVisible();

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('sage').click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /Claim my identity/ }).click();

  await page.waitForURL(/#\/street/);
  await expect(page.getByText(/Set up your shelf to keep what you make/)).not.toBeVisible();
  await expect(page.locator('main.page.street')).toBeVisible();
});
