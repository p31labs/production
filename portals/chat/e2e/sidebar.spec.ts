import { test, expect } from '@playwright/test';
import { seedSandbox } from './seed';

test.describe('chat sandbox sidebar', () => {
  test('desktop: groups, 2-line items, unread dot, search, resize, keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedSandbox(page);

    const sidebar = page.locator('.chat-sidebar');
    const list = page.locator('.chat-thread-item');
    await expect(list).toHaveCount(4);

    const labels = await page.locator('.chat-thread-group-label').allTextContents();
    expect(labels).toEqual(['Today', 'Yesterday', 'Last 7 days', 'Older']);

    await expect(list.nth(0)).toHaveClass(/chat-thread-item--active/);
    await expect(list.nth(1)).toHaveClass(/chat-thread-item--unread/);
    await expect(list.nth(0)).not.toHaveClass(/chat-thread-item--unread/);

    await expect(page.locator('.chat-thread-item-preview').nth(0)).toContainText('Generated and proven clean');
    await expect(page.locator('.chat-thread-item-time').nth(0)).toHaveText('2h');
    await expect(page.getByRole('button', { name: 'New thread' })).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Search threads' });
    await search.fill('login');
    await expect(page.locator('.chat-thread-item')).toHaveCount(1);
    await expect(page.locator('.chat-thread-item-title')).toHaveText('Login form');
    await search.fill('zzz-nothing');
    await expect(page.getByText('No matches')).toBeVisible();
    await search.fill('');

    const before = await sidebar.boundingBox();
    const handle = page.locator('.chat-sidebar-resize');
    await expect(handle).toBeVisible();
    const hb = await handle.boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width + 60, hb.y + hb.height / 2, { steps: 5 });
    await page.mouse.up();
    const after = await sidebar.boundingBox();
    expect(after.width).toBeGreaterThan(before.width + 40);
    const stored = await page.evaluate(() => Number(localStorage.getItem('p31-chat-sidebar-width')));
    expect(stored).toBeGreaterThan(before.width);

    await page.locator('.chat-thread-item').nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.chat-thread-item').nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.chat-thread-item').nth(0)).toBeFocused();
  });

  test('mobile: composer pinned, no overflow, slide-over toggles', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedSandbox(page);

    const composer = page.locator('.chat-composer');
    await expect(composer).toBeVisible();
    const cb = await composer.boundingBox();
    expect(cb.y + cb.height).toBeLessThanOrEqual(812);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const sidebar = page.locator('.chat-sidebar');
    await expect(sidebar).toBeVisible();

    await page.locator('.chat-sidebar-backdrop').click({ position: { x: 360, y: 400 } });
    await expect(sidebar).toBeHidden();
  });
});