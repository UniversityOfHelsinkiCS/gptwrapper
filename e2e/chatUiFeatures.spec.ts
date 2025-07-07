import { expect, test } from '@playwright/test'

test.describe('Chat v2 UI Features Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2')
  })

  test('Disclaimer is visible', async ({ page }) => {
    await expect(page.locator('#close-disclaimer')).toBeVisible()
  })

  test('Disclaimer can be opened manually', async ({ page }) => {
    await page.locator('#close-disclaimer').click()
    await page.locator('#help-button').click()
    await expect(page.locator('#close-disclaimer')).toBeVisible()
  })

  test('Settings can be opened and closed', async ({ page }) => {
    await page.locator('#close-disclaimer').click()
    await page.locator('#settings-button').click()
    await expect(page.locator('#close-settings')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('#close-settings')).not.toBeVisible()
  })
})
