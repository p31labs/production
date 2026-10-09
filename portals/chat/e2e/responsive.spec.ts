import { test, expect } from '@playwright/test';

// Regression guard for the container-first mobile migration. These assert the
// computed layout at mobile (375px) and desktop (1440px) — the exact state
// that earlier regressed. If a future CSS change breaks the drawer/rail
// cascade or the composer collapse, this fails.

const BASE_URL = '/';

test.describe('container-first responsive', () => {
  test('mobile 375px: drawer closed on load, opens on toggle, backdrop covers viewport, composer prefs collapse', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const sidebar = page.locator('.chat-sidebar');
    const backdrop = page.locator('.chat-sidebar-backdrop');
    const prefs = page.locator('.composer-prefs');
    const toggle = page.locator('.composer-prefs-toggle');

    // Fresh mobile load: drawer closed (off-screen), user lands on the chat.
    await expect(sidebar).toHaveCSS('visibility', 'hidden');
    await expect(backdrop).toHaveCSS('display', 'none');
    await expect(prefs).toHaveCSS('display', 'none');
    await expect(toggle).toHaveCSS('display', 'flex');

    // Open via the control-bar hamburger.
    await page.locator('.chat-control-bar__btn').first().click();
    await page.waitForTimeout(400);
    await expect(sidebar).toHaveCSS('visibility', 'visible');
    await expect(backdrop).toHaveCSS('display', 'block');

    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.x)).toBe(0); // flush to viewport edge, not app padding

    const bd = await backdrop.boundingBox();
    expect(bd).not.toBeNull();
    expect(Math.round(bd!.width)).toBe(375);
    expect(Math.round(bd!.height)).toBe(812);
  });

  test('desktop 1440px: sidebar is an inline rail, backdrop hidden, composer prefs visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const sidebar = page.locator('.chat-sidebar');
    const backdrop = page.locator('.chat-sidebar-backdrop');
    const prefs = page.locator('.composer-prefs');
    const toggle = page.locator('.composer-prefs-toggle');

    await expect(sidebar).toHaveCSS('position', 'relative');
    await expect(sidebar).toHaveCSS('visibility', 'visible');
    await expect(backdrop).toHaveCSS('display', 'none');
    await expect(prefs).toHaveCSS('display', 'flex');
    await expect(toggle).toHaveCSS('display', 'none');
  });
});