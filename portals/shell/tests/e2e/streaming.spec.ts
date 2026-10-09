import { test, expect } from '@playwright/test';

/**
 * Wave 7 behavioural gate — the two things a unit test cannot see:
 *
 *  1. A 100-event burst must cost a handful of store updates, not 100. The
 *     counter is incremented by a real zustand subscription while the events
 *     are pumped one per macrotask, exactly as a live stream delivers them.
 *  2. Stop must be in the DOM for the whole turn — Phase 1 (the POST is
 *     pending, zero tokens exist) and Phase 2 (tokens landing) alike — and
 *     clicking it must actually end the turn.
 */
declare global {
  interface Window {
    __updates?: number;
    __streaming?: () => boolean;
    __pump?: (n: number) => Promise<void>;
    __phase2?: () => void;
    __reset?: () => void;
  }
}

test('a 100-event burst is batched into a few store updates', async ({ page }) => {
  await page.goto('/harness-streaming.html');
  await page.evaluate(() => window.__reset?.());

  await page.evaluate(async () => {
    await window.__pump?.(100);
  });
  // Let the queued animation frame land after the last macrotask.
  await page.waitForTimeout(250);

  const updates = await page.evaluate(() => window.__updates ?? 0);
  const rendered = await page.locator('[data-message-id]').count();

  expect(rendered).toBeGreaterThan(0); // the burst DID reach the thread
  expect(updates).toBeGreaterThan(0); // ...and was flushed at least once
  expect(updates).toBeLessThan(5); // one frame, not one update per token
});

test('Stop is visible from the first frame of a turn', async ({ page }) => {
  await page.goto('/harness-streaming.html');

  await page.fill('.chat-composer__input', 'draw me a diagram');
  await page.click('.chat-composer__send');

  // Phase 1: onSend's promise never settles, yet Stop is up immediately.
  await expect(page.locator('.chat-composer__send--stop')).toBeVisible();
  expect(await page.evaluate(() => window.__streaming?.() ?? false)).toBe(true);

  await page.click('.chat-composer__send--stop');
  await expect(page.locator('.chat-composer__send--stop')).toHaveCount(0);
  await expect(page.locator('.chat-composer__send')).toBeVisible();
  expect(await page.evaluate(() => window.__streaming?.() ?? false)).toBe(false);
});

test('a mid-stream Stop ends Phase 2', async ({ page }) => {
  await page.goto('/harness-streaming.html');

  await page.click('#phase2');
  await expect(page.locator('.chat-composer__send--stop')).toBeVisible();
  expect(await page.evaluate(() => window.__streaming?.() ?? false)).toBe(true);

  // Tokens land while Stop is offered.
  await page.waitForTimeout(250);
  expect(await page.locator('[data-message-id]').count()).toBeGreaterThan(0);

  await page.click('.chat-composer__send--stop');
  await expect(page.locator('.chat-composer__send--stop')).toHaveCount(0);
  expect(await page.evaluate(() => window.__streaming?.() ?? false)).toBe(false);
});
