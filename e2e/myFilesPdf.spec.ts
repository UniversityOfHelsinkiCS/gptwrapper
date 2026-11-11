import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect } from '@playwright/test'
import { makeNoTextPdf, makeTextPdf } from '../src/test/pdfFixtures'
import { adminTest } from './fixtures'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'

// pdf.js parses the PDFs in the browser (loaded lazily), so this is the real parsing path.
adminTest('the agent reads a specific page of an attached PDF', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-pdf-'))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    writeFileSync(
      join(folder, 'book.pdf'),
      makeTextPdf([['Chapter 1: Energy.'], ['Chapter 2: Entropy.', 'The exam is on Friday the 13th.'], ['Chapter 3: Heat engines.']]),
    )
    writeFileSync(join(folder, 'scan.pdf'), makeNoTextPdf(1))

    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await useMockModel(page)

    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 2')
    await dialog.getByTestId('my-files-close').click()
    await page.getByTestId('attach-folders-button').click()
    await page.getByRole('menuitemcheckbox', { name: 'Course notes' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('attached-folder')).toHaveAttribute('data-folder', 'Course notes')

    // The mock model reads page 2 with read_file and answers with what it read
    await sendChatMessage(page, 'pdfpage 2 Course notes/book.pdf')
    await closeSendPreference(page)
    const answer = page.getByTestId('assistant-message')
    await expect(answer).toContainText('The exam is on Friday the 13th.')
    await expect(answer).toContainText('[Page 2]')
    await expect(answer).not.toContainText('Heat engines')
    const parts = page.getByTestId('tool-part')
    await expect(parts.nth(0)).toHaveAttribute('data-tool-status', 'ok')
    await expect(parts.nth(0)).toContainText('Read the file Course notes/book.pdf, pages 2–2 of 3')

    // A scanned PDF has no text layer
    await sendChatMessage(page, 'pdfpage 1 Course notes/scan.pdf')
    await expect(parts.nth(1)).toHaveAttribute('data-tool-status', 'error')
    await expect(answer.nth(1)).toContainText('no text layer')

    // The extracted text is cached outside My files: the folder still has its 2 files, and clearing removes the cache
    const cacheFiles = () =>
      page.evaluate(async () => {
        const root = await navigator.storage.getDirectory()
        try {
          const dir = await root.getDirectoryHandle('my-files-pdf-text')
          const names: string[] = []
          for await (const [name] of (dir as unknown as { entries(): AsyncIterable<[string, unknown]> }).entries()) names.push(name)
          return names.length
        } catch {
          return 0
        }
      })
    expect(await cacheFiles()).toBe(2)
    await page.getByTestId('my-files-button').click()
    await expect(dialog.locator('[data-folder="Course notes"]')).toContainText('Files: 2')
    await page.getByTestId('my-files-clear').click()
    await page.getByTestId('confirm-dialog-confirm').click()
    await expect(dialog.locator('[data-folder="Course notes"]')).toHaveCount(0)
    await expect.poll(cacheFiles).toBe(0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
