import { expect, Page } from '@playwright/test'

export const acceptDisclaimer = async (page: Page) => {
  const checkbox = page.getByTestId('accept-disclaimer')
  await checkbox.waitFor({ state: 'visible' })
  await checkbox.scrollIntoViewIfNeeded()
  await checkbox.click()

  const submitButton = page.getByTestId('submit-accept-disclaimer')
  await expect(submitButton).toBeEnabled({ timeout: 10000 })
  await submitButton.click()
}

export const closeSendPreference = async (page: Page) => {
  await page.getByTestId('submit-send-preference').click()
}

export const sendChatMessage = async (page: Page, message: string) => {
  const chatInput = page.getByTestId('chat-input').first()
  await chatInput.fill(message)
  const sendBtn = page.getByTestId('send-chat-message')
  await sendBtn.click()
}

export const useMockModel = async (page: Page) => {
  await page.getByTestId('model-selector').first().click()
  await page.getByTestId('mock-option').first().click()
}
