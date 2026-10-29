import { expect, type Page } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

/**
 * User story: as a teacher previewing a course prompt in the prompt modal, I can toggle
 * "view as student" to see the preview exactly as an enrolled student would.
 */

// New prompts are hidden from students by default
const createCoursePrompt = async (page: Page, name: string, systemMessage: string) => {
  await page.getByTestId('create-course-prompt-test-course-course-id-button').click()
  await page.getByTestId('prompt-name-input').fill(name)
  await page.getByTestId('system-message-input').fill(systemMessage)
  await page.getByRole('button', { name: 'Save' }).click()
}

test.describe('Prompt preview student view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await page.goto('/test-course-course-id/prompts')
  })

  test('shows a hidden course prompt as a student sees it', async ({ page }) => {
    const promptName = `opiskelijanakyma-${test.info().workerIndex}`
    const systemMessage = 'salainen alustus'

    await createCoursePrompt(page, promptName, systemMessage)
    await page.getByTestId(`prompt-row-${promptName}`).click()

    // Teacher view: system message, hidden status and management actions are visible
    await expect(page.getByText(systemMessage)).toBeVisible()
    await expect(page.getByText('Hidden from students').first()).toBeVisible()
    await expect(page.getByTestId(`edit-prompt-${promptName}`)).toBeVisible()
    await expect(page.getByTestId(`delete-prompt-${promptName}`)).toBeVisible()
    await expect(page.getByTestId('copy-prompt-button')).toBeVisible()

    await page.getByTestId('student-view-toggle').click()

    // Student view: the system message is replaced with the hidden prompt info
    await expect(page.getByText(systemMessage)).not.toBeVisible()
    await expect(page.getByText('Prompt text is not visible to students')).toBeVisible()
    await expect(page.getByText('Hidden from students')).not.toBeVisible()
    await expect(page.getByTestId(`edit-prompt-${promptName}`)).not.toBeVisible()
    await expect(page.getByTestId(`delete-prompt-${promptName}`)).not.toBeVisible()
    await expect(page.getByTestId('copy-prompt-button')).not.toBeVisible()
    await expect(page.getByTestId('open-course-embedding-button')).not.toBeVisible()

    // Students can still choose the prompt
    await expect(page.getByTestId('change-to-prompt-button')).toBeVisible()

    // Toggling back restores the teacher view
    await page.getByTestId('student-view-toggle').click()
    await expect(page.getByText(systemMessage)).toBeVisible()
    await expect(page.getByTestId(`edit-prompt-${promptName}`)).toBeVisible()

    await page.getByTestId(`delete-prompt-${promptName}`).click()
    await page.getByTestId('confirm-dialog-confirm').click()
  })

  test('stays on when previewing another prompt', async ({ page }) => {
    const firstName = `opiskelijanakyma-a-${test.info().workerIndex}`
    const secondName = `opiskelijanakyma-b-${test.info().workerIndex}`

    await createCoursePrompt(page, firstName, 'ensimmainen alustus')
    await createCoursePrompt(page, secondName, 'toinen alustus')

    await page.getByTestId(`prompt-row-${firstName}`).click()
    await page.getByTestId('student-view-toggle').click()

    await page.getByTestId(`prompt-row-${secondName}`).click()
    await expect(page.getByTestId(`prompt-preview-title-for-${secondName}`)).toBeVisible()
    await expect(page.getByText('toinen alustus')).not.toBeVisible()
    await expect(page.getByText('Prompt text is not visible to students')).toBeVisible()

    await page.getByTestId('student-view-toggle').click()
    await page.getByTestId(`delete-prompt-${secondName}`).click()
    await page.getByTestId('confirm-dialog-confirm').click()
    await page.getByTestId(`prompt-row-${firstName}`).click()
    await page.getByTestId(`delete-prompt-${firstName}`).click()
    await page.getByTestId('confirm-dialog-confirm').click()
  })

  test('is not offered for personal prompts', async ({ page }) => {
    const promptName = `oma-${test.info().workerIndex}`

    await page.getByTestId('create-personal-prompt-button').click()
    await page.getByTestId('prompt-name-input').fill(promptName)
    await page.getByTestId('system-message-input').fill('oma alustus')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByTestId('my-prompts-toggle').click()
    await page.getByTestId(`prompt-row-${promptName}`).click()
    await expect(page.getByTestId(`prompt-preview-title-for-${promptName}`)).toBeVisible()
    await expect(page.getByTestId('student-view-toggle')).not.toBeVisible()
  })
})
