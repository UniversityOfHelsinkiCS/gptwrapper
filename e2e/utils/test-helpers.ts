import { Page } from '@playwright/test'

export const acceptDisclaimer = async (page: Page) => {
  await page.getByTestId('accept-disclaimer').click()
  await page.getByTestId('submit-accept-disclaimer').click()
}
