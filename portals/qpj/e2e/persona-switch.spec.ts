import { test, expect } from '@playwright/test';

test('switching passengers reveals the quiet set-up banner', async ({ page }) => {
  await page.goto('#/entry');

  await expect(page.getByRole('region', { name: 'Set up your identity' })).toBeVisible();

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('sage').click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /Claim my identity/ }).click();

  await page.waitForURL(/#\/street/);
  await expect(page.getByText(/Set up your shelf to keep what you make/)).not.toBeVisible();

  await page.getByRole('button', { name: /Open Dillpickle's menu/ }).click();
  await page.getByRole('button', { name: 'Switch to Half-Sour' }).click();

  await expect(page.getByText(/Set up your shelf to keep what you make/)).toBeVisible();
});
