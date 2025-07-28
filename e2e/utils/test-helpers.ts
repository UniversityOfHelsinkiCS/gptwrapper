import { Page } from '@playwright/test'

export const acceptDisclaimer = async (page: Page) => {
  await page.locator('#accept-disclaimer').click()
  await page.locator('#submit-accept-disclaimer').click()
}
