import { expect } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'
import { studentTest as test } from './fixtures'
import { FREE_MODEL, validModels } from '../src/config'

test.describe('General app tests', async () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`/`)
  })

  test('Disclaimer is visible', async ({ page }) => {
    await expect(page.getByTestId('submit-accept-disclaimer')).toBeVisible()
  })

  test('Disclaimer is not visible after accepting and reloading', async ({ page }) => {
    await acceptDisclaimer(page)
    await expect(page.getByTestId('submit-accept-disclaimer')).not.toBeVisible()
    await page.reload()
    await expect(page.getByTestId('submit-accept-disclaimer')).not.toBeVisible()
  })

  test('Global menu', async ({ page }) => {
    await acceptDisclaimer(page)
    await page.getByTestId('global-menu-button').click()

    await page.getByTestId('open-global-settings-button').click()
    await page.getByTestId('close-global-settings').click()
    await expect(page.getByTestId('close-global-settings')).not.toBeVisible()

    await page.getByTestId('global-menu-button').click()
    await page.getByTestId('open-disclaimer-button').click()
    await expect(page.getByTestId('submit-accept-disclaimer')).toBeVisible()
  })
})
