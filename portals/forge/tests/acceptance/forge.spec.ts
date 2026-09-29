import { test, expect } from '@playwright/test'

test.describe('Forge portal', () => {
  test('home renders, metrics show, worlds switch', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Quantum Material/i })).toBeVisible()
    await expect(page.locator('.metric')).toHaveCount(4)

    await page.getByRole('radio', { name: 'volt' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-world', 'volt')
    await expect(page.locator('html')).toHaveAttribute('data-capacity', 'normal')

    await expect(page).toHaveScreenshot('home-volt.png', { maxDiffPixelRatio: 0.02 })
  })

  test('catalog filters by kind', async ({ page }) => {
    await page.goto('/catalog')
    const total = await page.locator('.pack-card').count()
    expect(total).toBeGreaterThan(0)
    await page.getByRole('tab', { name: 'omnibus' }).click()
    const filtered = await page.locator('.pack-card').count()
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(total)
    await expect(page).toHaveScreenshot('catalog-omnibus.png', { maxDiffPixelRatio: 0.02 })
  })

  test('calm overlay appears at spoon 0', async ({ page }) => {
    await page.goto('/')
    await page.locator('input[aria-label="Spoon dial capacity"]').fill('0')
    await expect(page.locator('html')).toHaveAttribute('data-capacity', 'low')
    await expect(page.locator('.calm-overlay')).toHaveClass(/is-visible/)
  })
})