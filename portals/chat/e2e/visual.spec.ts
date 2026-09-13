import { test, expect } from '@playwright/test';
import { seedSandbox } from './seed';

test.describe('chat sandbox visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('empty state', async ({ page }) => {
    const emptyState = page.locator('.chat-empty-prompt').first();
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toHaveScreenshot('empty-state.png', {
      animations: 'disabled',
    });
  });

  test('composer', async ({ page }) => {
    const composer = page.locator('.chat-composer').first();
    await expect(composer).toBeVisible();
    await expect(composer).toHaveScreenshot('composer.png', {
      animations: 'disabled',
    });
  });

  test('sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedSandbox(page);
    const sidebar = page.locator('.chat-sidebar').first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveScreenshot('sidebar.png', {
      animations: 'disabled',
    });
  });

  for (const viewport of [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    test(`app shell @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      const shell = page.locator('.app').first();
      await expect(shell).toBeVisible();
      await expect(shell).toHaveScreenshot(`app-shell-${viewport.name}.png`, {
        animations: 'disabled',
      });
    });
  }
});
