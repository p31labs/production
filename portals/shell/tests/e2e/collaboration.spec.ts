import { test, expect } from '@playwright/test';

/**
 * The multiplayer behavioural gate, run against harness-collab.html. Two pages
 * in ONE browser context share a BroadcastChannel room stub (separate contexts
 * cannot share one); both edit the draft and both edits survive (convergence
 * via the incremental binding + two-step sync handshake); a join shows a real
 * awareness avatar and a departure removes it; the agent chip appears during a
 * turn; and typing while a remote cursor hovers still types.
 */
test('two pages converge on both edits', async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto('/harness-collab.html?session=collab-converge');
  await pageB.goto('/harness-collab.html?session=collab-converge');

  // Each page appends a distinct edit (incremental, not a full replace).
  await pageA.locator('.draft').focus();
  await pageA.keyboard.press('End');
  await pageA.keyboard.type('AAA');
  await pageB.locator('.draft').focus();
  await pageB.keyboard.press('End');
  await pageB.keyboard.type('BBB');

  await pageA.waitForTimeout(600);

  // Convergence: both edits survive — neither page lost the other's text.
  await expect(pageA.locator('.draft')).toHaveValue(/AAA/);
  await expect(pageA.locator('.draft')).toHaveValue(/BBB/);
  await expect(pageB.locator('.draft')).toHaveValue(/AAA/);
  await expect(pageB.locator('.draft')).toHaveValue(/BBB/);

  await context.close();
});

test('a join shows a presence avatar and a departure removes it', async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto('/harness-collab.html?session=collab-presence');
  await pageB.goto('/harness-collab.html?session=collab-presence');

  // B joins → A sees B's avatar (A excludes its own presence).
  await expect(pageA.locator('.presence-avatar')).toHaveCount(1, { timeout: 5000 });

  // B departs (announced before teardown) → the avatar disappears.
  await pageB.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
  await expect(pageA.locator('.presence-avatar')).toHaveCount(0, { timeout: 5000 });

  await context.close();
});

test('the agent chip appears during a turn', async ({ page }) => {
  await page.goto('/harness-collab.html?session=collab-agent');
  await page.click('#run-turn');
  await expect(page.locator('.presence-agent')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.presence-agent')).toContainText(/thinking|streaming/);
});

test('typing while a remote cursor hovers still types', async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto('/harness-collab.html?session=collab-focus');
  await pageB.goto('/harness-collab.html?session=collab-focus');

  // A sees B's remote cursor (pointer-events: none — it never captures focus).
  await expect(pageA.locator('.remote-cursor')).toHaveCount(1, { timeout: 5000 });
  await pageA.locator('.draft').click();
  await pageA.keyboard.type('still types');
  await expect(pageA.locator('.draft')).toHaveValue(/still types/);

  await context.close();
});