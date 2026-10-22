import { expect } from '@playwright/test'
import { studentTest as test, teacherTest, adminTest } from '../fixtures'
import { scan, writeAxeReport } from '../axe/axe_utils'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from '../utils/test-helpers'

test.describe('axe wcag scan for global menu', () => {
  test.afterAll(writeAxeReport)

  test('scan first load', async ({ page }, testInfo) => {
    await page.goto('/')
    await acceptDisclaimer(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await scan(page, testInfo.title)
  })

  test('scan global menu', async ({ page }, testInfo) => {
    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('global-menu-button').click()
    const modal = page.getByRole('menu')
    await expect(modal).toBeVisible()
    await scan(page, testInfo.title)
  })

  test('scan settings modal', async ({ page }, testInfo) => {
    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('global-menu-button').click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(page.locator('#basic-menu')).toHaveCount(0)
    await scan(page, testInfo.title)
  })

  test('scan disclaimer modal', async ({ page }, testInfo) => {
    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('global-menu-button').click()
    await page.getByRole('menuitem', { name: 'About service' }).click()
    await expect(page.locator('#basic-menu')).toHaveCount(0)
    await scan(page, testInfo.title)
  })
  test('scan feedback modal', async ({ page }, testInfo) => {
    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('global-menu-button').click()
    await page.getByRole('menuitem', { name: 'Give feedback' }).click()
    await expect(page.locator('#basic-menu')).toHaveCount(0)
    await scan(page, testInfo.title)
  })

  adminTest('scan api-key modal', async ({ page }, testInfo) => {
    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('global-menu-button').click()
    await page.getByRole('menuitem', { name: 'API keys' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(page.locator('#basic-menu')).toHaveCount(0)
    await scan(page, testInfo.title)
  })
})

test.describe('axe wcag scan for prompt modal', () => {
  test.afterAll(writeAxeReport)

  test('scan prompt modal', async ({ page }, testInfo) => {
    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('choose-prompt-button').click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await scan(page, testInfo.title)
  })

  teacherTest('scan course preview', async ({ page }, testInfo) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await page.getByTestId('choose-prompt-button').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByTestId('show-course-info-test-course-button').click()
    await expect(page.getByTestId('course-status-chip')).toBeVisible()
    await scan(page, testInfo.title)
  })

  test('scan my prompt creator', async ({ page }, testInfo) => {
    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('choose-prompt-button').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByTestId('create-personal-prompt-button').click()
    await expect(page.getByTestId('prompt-name-input')).toBeVisible()
    await scan(page, testInfo.title)
  })

  test('scan my prompt editor', async ({ page }, testInfo) => {
    const promptName = `axe-my-prompt-${testInfo.workerIndex}`

    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('choose-prompt-button').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByTestId('create-personal-prompt-button').click()
    await page.getByTestId('prompt-name-input').fill(promptName)
    await page.getByTestId('system-message-input').fill('axe test prompt')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByTestId(`prompt-preview-title-for-${promptName}`)).toBeVisible()
    await page.getByTestId(`edit-prompt-${promptName}`).click()
    await expect(page.getByTestId('prompt-name-input')).toHaveValue(promptName)
    await scan(page, testInfo.title)
  })
})

test.describe('axe wcag scan for chat', () => {
  test.afterAll(writeAxeReport)

  test('scan chat with prompt', async ({ page }, testInfo) => {
    const promptName = `axe-chat-prompt-${testInfo.workerIndex}`

    await page.goto('/general')
    await acceptDisclaimer(page)

    await page.getByTestId('choose-prompt-button').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByTestId('create-personal-prompt-button').click()
    await page.getByTestId('prompt-name-input').fill(promptName)
    await page.getByTestId('system-message-input').fill('mocktest axe chat prompt')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByTestId(`prompt-preview-title-for-${promptName}`)).toBeVisible()
    await page.getByTestId('change-to-prompt-button').click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await useMockModel(page)
    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest axe chat prompt')
    await scan(page, testInfo.title)
  })
})

adminTest.describe('axe wcag scan for university prompt gallery', () => {
  adminTest.afterAll(writeAxeReport)

  adminTest('scan university prompt gallery', async ({ page }, testInfo) => {
    const headers = { 'x-test-user-index': String(testInfo.workerIndex), 'x-test-user-role': 'admin' }
    const uniPromptName = `axe-uni-prompt-${testInfo.workerIndex}`
    const templateName = `axe-template-${testInfo.workerIndex}`

    const createUniPrompt = async (type: 'UNIVERSITY' | 'TEMPLATE', name: string) => {
      const res = await page.request.post('/api/uniprompts', {
        headers,
        data: { type, published: true, en: { name, userInstructions: `${name} instructions`, systemMessage: 'axe test prompt' } },
      })
      expect(res.status()).toBe(201)
      return (await res.json()).id as string
    }

    const createdIds = [await createUniPrompt('UNIVERSITY', uniPromptName), await createUniPrompt('TEMPLATE', templateName)]

    try {
      await page.goto('/general')
      await acceptDisclaimer(page)
      await page.getByTestId('choose-prompt-button').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      await page.getByTestId('university-prompts-open').click()
      await expect(page.getByTestId('university-prompts-open')).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByTestId(`uni-prompt-card-${uniPromptName}`)).toBeVisible()
      await expect(page.getByTestId(`uni-prompt-card-${templateName}`)).toBeVisible()
      await scan(page, testInfo.title)
    } finally {
      for (const id of createdIds) {
        await page.request.delete(`/api/uniprompts/${id}`, { headers })
      }
    }
  })
})

teacherTest.describe('axe wcag scan for prompt modal previews', () => {
  teacherTest.afterAll(writeAxeReport)

  teacherTest('scan prompt preview', async ({ page }, testInfo) => {
    const promptName = `axe-prompt-${testInfo.workerIndex}`

    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await page.getByTestId('choose-prompt-button').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByTestId('create-course-prompt-test-course-course-id-button').click()
    await page.getByTestId('prompt-name-input').fill(promptName)
    await page.getByTestId('system-message-input').fill('axe test prompt')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByTestId(`prompt-row-${promptName}`).click()
    await expect(page.getByTestId(`prompt-preview-title-for-${promptName}`)).toContainText(promptName)
    await scan(page, testInfo.title)
  })
})
