import { expect } from '@playwright/test'
import { acceptDisclaimer } from './utils/test-helpers'
import { test } from './fixtures'

test.describe('Chat v2 UI Features Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2')
  })

  test('Disclaimer is visible', async ({ page }) => {
    await expect(page.locator('#submit-accept-disclaimer')).toBeVisible()
  })

  test('Disclaimer is not visible after accepting and reloading', async ({ page }) => {
    await acceptDisclaimer(page)
    await page.reload()
    await expect(page.locator('#submit-accept-disclaimer')).not.toBeVisible()
  })

  test('Disclaimer (help) can be opened manually', async ({ page }) => {
    await acceptDisclaimer(page)
    await page.locator('#help-button').click()
    await expect(page.locator('#submit-accept-disclaimer')).toBeVisible()
  })

  test('Settings can be opened and closed', async ({ page }) => {
    await acceptDisclaimer(page)
    await page.locator('#settings-button').click()
    await expect(page.locator('#close-settings')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('#close-settings')).not.toBeVisible()
  })
})
