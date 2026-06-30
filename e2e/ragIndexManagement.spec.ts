import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

test.describe('Source material management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
  })

  test('Teacher can open the source materials modal and add and remove a collection', async ({ page }) => {
    // Open the source materials modal from the sidebar
    await page.getByTestId('openSourceMaterialsButton').click()

    // Create a new collection
    await page.getByTestId('createNewRagButton').click()
    await page.getByTestId('ragIndexNameInput').fill('perkele')

    // This submit button is cursed, lets press enter for a good measure
    await page.getByTestId('ragIndexCreateSubmit').press('Enter')

    // Creating auto-selects the new collection, so it shows up both in the
    // list and as the detail view title.
    await expect(page.getByText('perkele').first()).toBeVisible()

    // Delete it from the detail view (guarded by a window.confirm dialog)
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId('ragIndexDeleteButton').click()

    await expect(page.getByTestId('ragIndexDeleteSuccessSnackbar')).toBeVisible()
    await expect(page.getByText('perkele')).toHaveCount(0)
  })
})
