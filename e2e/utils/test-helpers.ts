import { Page } from '@playwright/test'

export const acceptDisclaimer = async (page: Page) => {
  await page.getByTestId('accept-disclaimer').click()
  await page.getByTestId('submit-accept-disclaimer').click()
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
