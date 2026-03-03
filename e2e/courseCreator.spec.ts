import { expect, type Page } from '@playwright/test'

import { adminTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

const openCourseCreatorPage = async (page: Page) => {
  await page.goto('/course-creator')

  const disclaimerSubmit = page.getByTestId('submit-accept-disclaimer')
  if (await disclaimerSubmit.isVisible()) {
    await acceptDisclaimer(page)
  }

  await expect(page.getByTestId('course-creator-page')).toBeVisible()
}

const createCustomChat = async (page: Page, name: string, description: string, courseId: string) => {
  await page.getByTestId('course-creator-create-name-input-fi').fill(name)
  await page.getByTestId('course-creator-create-description-input').fill(description)
  await page.getByTestId('course-creator-create-course-id-input').fill(courseId)
  await page.getByTestId('course-creator-create-button').click()

  await expect(page.getByText('Custom chat created')).toBeVisible()

  const row = page.getByTestId('course-creator-chat-row').filter({ hasText: name }).first()
  await expect(row).toBeVisible()
  return row
}

test.describe('Course creator custom chats', () => {
  test.beforeEach(async ({ page }) => {
    await openCourseCreatorPage(page)
    await acceptDisclaimer(page)
  })

  test('can list, edit and save custom chat instance', async ({ page }) => {
    const name = `e2e-custom-chat-${Date.now()}`
    const description = 'e2e description'
    const courseId = `e2e-course-${Date.now()}`

    const row = await createCustomChat(page, name, description, courseId)

    const updatedName = `${name}-updated`
    const updatedDescription = 'e2e updated description'
    const updatedCourseId = `${courseId}-updated`

    await row.getByTestId('course-creator-edit-toggle').click()
    await page.getByTestId('course-creator-edit-name-input-fi').fill(updatedName)
    await page.getByTestId('course-creator-edit-description-input').fill(updatedDescription)
    await page.getByTestId('course-creator-edit-course-id-input').fill(updatedCourseId)
    await page.getByTestId('course-creator-save-button').click()

    await expect(page.getByText('Custom chat saved')).toBeVisible()

    const updatedRow = page.getByTestId('course-creator-chat-row').filter({ hasText: updatedName }).first()
    await expect(updatedRow).toBeVisible()
    await expect(updatedRow.getByRole('link', { name: updatedName })).toHaveAttribute('href', new RegExp(`/${updatedCourseId}$`))
    await updatedRow.getByTestId('course-creator-edit-toggle').click()
    await expect(page.getByTestId('course-creator-edit-description-input')).toHaveValue(updatedDescription)
    await expect(page.getByTestId('course-creator-edit-course-id-input')).toHaveValue(updatedCourseId)
  })

  test('delete uses confirmation dialog', async ({ page }) => {
    const name = `e2e-delete-chat-${Date.now()}`
    const description = 'delete me'
    const courseId = `e2e-course-delete-${Date.now()}`

    const row = await createCustomChat(page, name, description, courseId)

    await row.getByTestId('course-creator-edit-toggle').click()
    await page.getByTestId('course-creator-delete-button').click()

    const dialog = page.getByTestId('course-creator-delete-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(name)

    await page.getByTestId('course-creator-delete-cancel-button').click()
    await expect(dialog).not.toBeVisible()

    await page.getByTestId('course-creator-delete-button').click()
    await page.getByTestId('course-creator-delete-confirm-button').click()

    await expect(page.getByText('Custom chat deleted')).toBeVisible()
    await expect(page.getByTestId('course-creator-chat-row').filter({ hasText: name })).toHaveCount(0)
  })
})
