import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/v2');
  await page.locator('#close-disclaimer').click();
  await page.getByTestId('settings-button').click();
  await page.getByTestId('assistant-instructions-input').click();
  await page.getByTestId('assistant-instructions-input').fill('Olet avulias avustaja asd');
  await page.getByTestId('save-my-prompt-button').click();
  await page.getByTestId('save-my-prompt-name').click();
  await page.getByTestId('save-my-prompt-name').fill('asdasd');
  await page.getByTestId('save-my-prompt-submit').click();
  await page.goto('http://localhost:3000/v2/sandbox');
  await page.getByTestId('settings-button').click();
  await page.getByTestId('prompt-selector-button').click();
  await page.getByText('My prompts').click();
});