import { test, expect } from '@playwright/test'

test.describe('Forge portal', () => {
  test('home renders, metrics show, worlds switch', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /Quantum Material/i })).toBeVisible()
    await expect(page.locator('.metric')).toHaveCount(4)

    await page.getByRole('radio', { name: 'volt' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-world', 'volt')
    await expect(page.locator('html')).toHaveAttribute('data-capacity', 'normal')

    await expect(page).toHaveScreenshot('home-volt.png', { maxDiffPixelRatio: 0.02 })
  })

  test('catalog filters by kind', async ({ page }) => {
    await page.goto('/catalog', { waitUntil: 'networkidle' })
    await expect(page.locator('.pack-card').first()).toBeVisible()
    const total = await page.locator('.pack-card').count()
    expect(total).toBeGreaterThan(0)
    await page.getByRole('tab', { name: 'omnibus' }).click()
    const filtered = await page.locator('.pack-card').count()
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(total)
    await expect(page).toHaveScreenshot('catalog-omnibus.png', { maxDiffPixelRatio: 0.02 })
  })

  test('calm mode activates at spoon 0 — chrome hides, guide breathes, Esc exits', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('input[aria-label="Spoon dial capacity"]')).toBeVisible()
    await page.locator('input[aria-label="Spoon dial capacity"]').fill('0')
    await expect(page.locator('html')).toHaveAttribute('data-capacity', 'low')
    // Calm = subtraction, not a modal: data-calm on <html>, chrome hidden,
    // breathing guide visible, Esc exits.
    await expect(page.locator('html')).toHaveAttribute('data-calm', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-calm-phase', 'sigh')
    await expect(page.locator('.topbar')).toHaveCSS('display', 'none')
    await expect(page.locator('.main-workspace')).toHaveCSS('display', 'none')
    await expect(page.locator('.calm-guide')).toBeVisible()
    await expect(page).toHaveScreenshot('calm-sigh.png', {
      maxDiffPixelRatio: 0.02,
      // The breathing guide is an opacity animation — mask it so the pixel
      // comparison covers the static chrome-hidden surface, not animation phase.
      mask: [page.locator('.calm-guide')],
    })
    await page.keyboard.press('Escape')
    await expect(page.locator('html')).not.toHaveAttribute('data-calm', 'true')
    await expect(page.locator('.calm-guide')).not.toBeVisible()
  })
})