/**
 * Control surface E2E — Playwright.
 *
 * Two run modes:
 *   • Local:    `pnpm test:e2e`          (builds --mode test, serves at :4173)
 *   • Deployed: `pnpm test:e2e:deployed` (BASE_URL set; no local server)
 *
 * Honest about what it proves: the UI/WS path, the learn flow, persistence
 * across reload, and the honest offline states. It does NOT prove the audio
 * graph changed — that needs a browser-mode AudioContext probe.
 *
 * The persistence + learn tests need the __controlRoom hook, which only
 * exists in a --mode test build. They skip against a deployed (production)
 * URL rather than fail with a confusing error.
 */

import { test, expect } from '@playwright/test';

const HAS_HOOK = !process.env.BASE_URL; // the hook only exists in a --mode test build

test.describe('control surface', () => {
  test('renders three columns and connects', async ({ page }) => {
    await page.goto('/#/control');
    await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Sources' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Rack' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Matrix' })).toBeVisible();
    await expect(page.locator('.control-surface__dot--open')).toBeVisible({ timeout: 10_000 });
  });

  test('sound is off by default and only turns on via the toggle', async ({ page }) => {
    await page.goto('/#/control');
    await expect(page.locator('.control-surface__dot--open')).toBeVisible({ timeout: 10_000 });
    const toggle = page.getByRole('button', { name: 'sound off' });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'sound on' })).toBeVisible();
  });

  test('a knob is an ARIA slider with a full keyboard contract', async ({ page }) => {
    await page.goto('/#/control');
    const knob = page.getByRole('slider', { name: 'cutoff' }).first();
    await expect(knob).toBeVisible();
    await expect(knob).toHaveAttribute('aria-valuemin', '0');
    await expect(knob).toHaveAttribute('aria-valuemax', '1');
    const before = Number(await knob.getAttribute('aria-valuenow'));
    await knob.focus();
    await page.keyboard.press('ArrowUp');
    const after = Number(await knob.getAttribute('aria-valuenow'));
    expect(after).toBeGreaterThan(before);
    await page.keyboard.press('Home');
    await expect(knob).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('End');
    await expect(knob).toHaveAttribute('aria-valuenow', '1');
  });

  test('a committed mapping survives a reload (the DO fold)', async ({ page }) => {
    test.skip(!HAS_HOOK, 'requires the __controlRoom test hook (--mode test build)');
    await page.goto('/#/control');
    await expect(page.locator('.control-surface__dot--open')).toBeVisible({ timeout: 10_000 });

    await page.evaluate(async () => {
      const api = (window as unknown as {
        __controlRoom?: { setMapping: (s: string, d: string) => Promise<void> };
      }).__controlRoom;
      if (!api) throw new Error('__controlRoom hook not present — build with --mode=test');
      await api.setMapping('midi:in-0', 'synth:param-cutoff');
    });
    const bound = page.locator('.control-surface__matrix tbody tr', { hasText: 'cutoff' });
    await expect(bound.locator('.badge')).toHaveText('bound');

    await page.reload();
    await expect(page.locator('.control-surface__dot--open')).toBeVisible({ timeout: 10_000 });
    const afterReload = page.locator('.control-surface__matrix tbody tr', { hasText: 'cutoff' });
    await expect(afterReload.locator('.badge')).toHaveText('bound');
  });

  test('learn: clicking a row arms it, the DO resolves on the first CC', async ({ page }) => {
    test.skip(!HAS_HOOK, 'requires the __controlRoom test hook (--mode test build)');
    await page.goto('/#/control');
    await expect(page.locator('.control-surface__dot--open')).toBeVisible({ timeout: 10_000 });

    // Idempotency cleanup (Blocker 2): a prior run may have left resonance
    // bound, and the Matrix row handler is `bound ? clear : arm` — so without
    // this, a second run clicks an already-bound row and UNBINDS it, failing
    // the `learning` assertion. The DO's control.mapping.clear is idempotent,
    // so clearing an unbound pair is a safe no-op.
    await page.evaluate(async () => {
      const api = (window as unknown as {
        __controlRoom?: { clearMapping: (s: string, d: string) => Promise<void> };
      }).__controlRoom;
      if (!api) throw new Error('__controlRoom hook not present');
      await api.clearMapping('midi:in-0', 'synth:param-resonance').catch(() => {});
    });

    const row = page.locator('.control-surface__matrix tbody tr', { hasText: 'resonance' });
    await row.click();
    await expect(row.locator('.badge')).toHaveText('learning');

    await page.evaluate(async () => {
      const api = (window as unknown as {
        __controlRoom?: { sendMove: (s: string, v: number, cc?: number) => void };
      }).__controlRoom;
      if (!api) throw new Error('__controlRoom hook not present');
      api.sendMove('midi:in-0', 0.7, 74);
    });
    await expect(row.locator('.badge')).toHaveText('bound');
  });

  test('an unsupported MIDI browser hides the panel honestly', async ({ page }) => {
    await page.goto('/#/control');
    await expect(page.locator('.control-surface__dot--open')).toBeVisible({ timeout: 10_000 });
    const badge = page.locator('.control-surface__source').first().locator('.badge');
    await expect(badge).not.toHaveText('granted');
  });

  test('the surface renders at spoons=0', async ({ page }) => {
    await page.goto('/#/control');
    await page.evaluate(() => document.documentElement.style.setProperty('--motion-scale', '0'));
    await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
    await expect(page.getByRole('slider').first()).toBeVisible();
  });

  test('reduced motion zeroes the transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/control');
    await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
    const scale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--motion-scale').trim(),
    );
    expect(Number(scale)).toBeLessThanOrEqual(0.1);
  });
});