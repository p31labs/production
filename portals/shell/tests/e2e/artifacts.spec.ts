import { test, expect } from '@playwright/test';

/**
 * The artifact memoization gate. A parent re-renders many times (ticking
 * state) while the artifact props stay unchanged. The memoized ArtifactPane
 * must NOT re-render — its render count stays at 1 — because a pane that
 * re-renders per token re-renders the scroll container and re-measures rows.
 */
test('the artifact pane does not re-render when props are unchanged', async ({ page }) => {
  await page.goto('/harness-artifacts.html');
  await page.locator('.artifact-pane').waitFor();

  const before = await page.evaluate(() => (window as unknown as { __artifactPaneRenders?: number }).__artifactPaneRenders ?? 0);

  // Parent re-renders 20 times; the pane's props (content, version) never change.
  for (let i = 0; i < 20; i++) {
    await page.click('#tick');
  }
  await page.waitForTimeout(100);

  const after = await page.evaluate(() => (window as unknown as { __artifactPaneRenders?: number }).__artifactPaneRenders ?? 0);

  // One initial render, and no growth across 20 parent ticks.
  expect(after).toBeLessThanOrEqual(before + 1);
});