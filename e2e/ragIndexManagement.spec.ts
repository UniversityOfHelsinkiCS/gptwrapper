import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

test.describe('Rag index management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
  })

  test.only('Can create a new rag and delete it', async ({ page }) => {
    await page.getByTestId('course-settings-button').click()
    await page.getByTestId('sourceMaterialsTab').click()
    await page.getByTestId('createNewRagButton').click()
    await page.getByTestId('ragIndexNameInput').fill('perkelee')
    await page.getByTestId('ragIndexLanguageInput').click()
    await page.getByTestId('ragIndexLanguageOptionFinnish').click()
    await page.getByTestId('ragIndexCreateSubmit').click()
    await expect(page.getByText('perkelee')).toBeVisible()

    // Go back
    await page.getByTestId('ragIndexBackToList').click()

    await expect(page.getByText('perkelee')).toBeVisible()
    // Should be first in list now
    await page.getByTestId('ragIndexDetails').first().click()

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId('ragIndexDeleteButton').click()

    await expect(page.getByTestId('ragIndexDeleteSuccessSnackbar')).toBeVisible()

    await expect(page.getByText('perkelee')).not.toBeVisible()
  })
})
