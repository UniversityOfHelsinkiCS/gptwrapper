import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

test.describe('Rag index management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
  })

  test('Can create a new rag and delete it', async ({ page }) => {
    await page.getByTestId('course-settings-button').click()
    await page.getByTestId('sourceMaterialsTab').click()
    await page.getByTestId('createNewRagButton').click()
    await page.getByTestId('ragIndexNameInput').fill('perkele')
    await page.getByTestId('ragIndexLanguageInput').click()
    // Clicking this button in dropdown should close the dropdown, but in CI it doesnt (weird right???).
    // Mitigate by pressing esc once
    await page.getByTestId('ragIndexLanguageOptionFinnish').click()
    await page.getByTestId('ragIndexLanguageInput').press('Escape')

    await page.getByTestId('ragIndexCreateSubmit').click()
    await expect(page.getByText('perkele')).toBeVisible()

    // Go back
    await page.getByTestId('ragIndexBackToList').click()

    await expect(page.getByText('perkele')).toBeVisible()
    // Should be first in list now
    await page.getByTestId('ragIndexDetails').first().click()

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId('ragIndexDeleteButton').click()

    await expect(page.getByTestId('ragIndexDeleteSuccessSnackbar')).toBeVisible()

    await expect(page.getByText('perkele')).not.toBeVisible()
  })

  test('Can change the name of a RAG index', async ({ page }) => {
    await page.getByTestId('course-settings-button').click()
    await page.getByTestId('sourceMaterialsTab').click()
    await page.getByTestId('createNewRagButton').click()
    await page.getByTestId('ragIndexNameInput').fill('pahaminttu')
    await page.getByTestId('ragIndexLanguageInput').click()
    await page.getByTestId('ragIndexLanguageOptionFinnish').click()
    await page.getByTestId('ragIndexCreateSubmit').click()
    await expect(page.getByText('pahaminttu')).toBeVisible()

    // Go back
    await page.getByTestId('ragIndexBackToList').click()

    await expect(page.getByText('pahaminttu')).toBeVisible()
    // Should be first in list now
    await page.getByTestId('ragIndexDetails').first().click()

    await page.getByTestId('ragIndexNameEditToggle').click()
    await page.getByTestId('ragIndexNameEditInput').fill('minttu')
    await page.getByTestId('ragIndexNameEditSave').click()
    await expect(page.getByText('minttu')).toBeVisible()
    await expect(page.getByText('pahaminttu')).not.toBeVisible()

    // Go back
    await page.getByTestId('ragIndexBackToList').click()

    await expect(page.getByText('minttu')).toBeVisible()
    await expect(page.getByText('pahaminttu')).not.toBeVisible()
  })
})
