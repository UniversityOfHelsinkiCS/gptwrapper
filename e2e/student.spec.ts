import { expect, request as playwrightRequest } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'
import { studentTest as test } from './fixtures'

/**
 * Course prompts can only be created by a responsible teacher, so the student specs borrow the
 * worker's teacher user for the setup. Logging in is what grants that responsibility. Resetting
 * test data only wipes the student's own prompts, so the caller has to remove this one again.
 */
const createCoursePromptAsTeacher = async (baseURL: string, workerIndex: number, name: string) => {
  const teacher = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      'x-test-user-index': String(workerIndex),
      'x-test-user-role': 'teacher',
    },
  })

  await teacher.get('/api/users/login')

  const response = await teacher.post('/api/prompts', {
    data: {
      type: 'CHAT_INSTANCE',
      chatInstanceId: 'test-course',
      name,
      systemMessage: 'mocktest opettajan prompti',
      userInstructions: '',
    },
  })

  expect(response.status()).toBe(201)
  const prompt = (await response.json()) as { id: string }

  const remove = async () => {
    await teacher.delete(`/api/prompts/${prompt.id}`)
    await teacher.dispose()
  }

  return { prompt, remove }
}

test.describe('Student', () => {
  test('Enrolled chat works', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)

    await useMockModel(page)

    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
  })

  test('is sent to general page from general chat', async ({ page }) => {
    // Tries to access general chat
    await page.goto('/')
    // Student is sent to chats page
    await expect(page).not.toHaveURL(/sandbox/)
    await expect(page).toHaveURL(/general/)
  })

  test('is sent to general page from non-enrolled course', async ({ page }) => {
    // Tries to access sandbox course
    await page.goto('/sandbox')
    // Student is sent to chats page
    await expect(page).not.toHaveURL(/sandbox/)
    await expect(page).toHaveURL(/general/)
  })

  test('sees only student specific elements in sidebars COURSE SECTION', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)

    await expect(page.getByTestId('course-settings-button')).toBeHidden()
    await expect(page.getByTestId('edit-prompt-button')).toBeHidden()
  })

  test('sees only student specific elements in sidebars PROMPT SECTION', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)

    // Students shouldn't see the edit prompt button in the sidebar (when no prompt is selected)
    await expect(page.getByTestId('edit-prompt-button')).not.toBeVisible()
    
    // They should see the button to choose a prompt
    await expect(page.getByTestId('choose-prompt-button')).toBeVisible()
  })

  test('cannot copy a course prompt', async ({ page, baseURL }) => {
    // Unique per run: the prompt outlives the student's test data reset
    const promptName = `opettajan-prompti-${test.info().workerIndex}-${Date.now()}`
    const { prompt, remove } = await createCoursePromptAsTeacher(baseURL as string, test.info().workerIndex, promptName)

    try {
      await page.goto('/test-course-course-id')
      await acceptDisclaimer(page)

      await page.getByTestId('choose-prompt-button').click()
      await page.getByTestId('toggle-course-prompts-test-course-button').click()
      await page.getByTestId(`prompt-row-${promptName}`).click()

      await expect(page.getByTestId(`prompt-preview-title-for-${promptName}`)).toBeVisible()
      await expect(page.getByTestId('copy-prompt-button')).toBeHidden()

      // The server has to say no too, not just the hidden button
      const response = await page.request.post(`/api/prompts/${prompt.id}/copy`, {
        data: { target: { type: 'PERSONAL' } },
      })
      expect(response.status()).toBe(403)
    } finally {
      await remove()
    }
  })

  test('can duplicate their own prompt, but only into their own prompts', async ({ page }) => {
    const promptName = `oma-prompti-${test.info().workerIndex}`

    await page.goto('/general')
    await acceptDisclaimer(page)

    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId('create-personal-prompt-button').click()
    await page.getByTestId('prompt-name-input').fill(promptName)
    await page.getByTestId('system-message-input').fill('mocktest oma prompti')
    await page.getByRole('button', { name: 'Save' }).click()

    // Saving leaves the new prompt open in the preview
    await expect(page.getByTestId(`prompt-preview-title-for-${promptName}`)).toBeVisible()
    await page.getByTestId('copy-prompt-button').click()

    // No course is a valid destination for a student
    await expect(page.getByTestId('copy-target-test-course-course-id')).toBeHidden()

    await page.getByTestId('copy-target-personal').click()

    await page.getByTestId('my-prompts-open').click()
    await expect(page.getByTestId(`prompt-row-${promptName} (2)`)).toBeVisible()
  })
})
