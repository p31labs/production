import { test, expect } from '@playwright/test';

test('guest sending a message gets the set-up nudge but can still send as guest', async ({ page }) => {
  await page.goto('#/entry');
  await page.waitForSelector('.onboarding__steps');
  await page.waitForTimeout(1000);

  await page.goto('#/street');
  await expect(page.getByText(/Set up your shelf to keep what you make/)).toBeVisible();

  await page.goto('#/talk');
  await page.waitForSelector('.talk-composer');

  const input = page.getByLabel(/Message Family notebook/);
  await input.fill('hi fam');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByRole('dialog', { name: 'Set up your shelf' })).toBeVisible();

  await page.getByRole('button', { name: 'Send as guest' }).click();

  await expect(page.getByText('hi fam')).toBeVisible();
});
