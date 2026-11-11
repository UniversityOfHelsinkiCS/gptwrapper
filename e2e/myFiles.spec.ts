import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import { adminTest, studentTest } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

// My files is stored in OPFS, which each Playwright browser context gets empty.

const makeFolder = () => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-'))
  const folder = join(root, 'Course notes')
  mkdirSync(join(folder, 'week1'), { recursive: true })
  writeFileSync(join(folder, 'syllabus.md'), '# Syllabus')
  writeFileSync(join(folder, 'week1', 'lecture.md'), 'Lecture 1')
  const old = new Date('2026-01-01T12:00:00Z')
  utimesSync(join(folder, 'syllabus.md'), old, old)
  utimesSync(join(folder, 'week1', 'lecture.md'), old, old)
  return { root, folder }
}

const openMyFiles = async (page: Page) => {
  await page.goto('/general')
  await acceptDisclaimer(page)
  await page.getByTestId('my-files-button').click()
  const dialog = page.getByRole('dialog', { name: 'My files' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByTestId('my-files-folder')).toHaveCount(2) // Outputs and Agent notes
  return dialog
}

adminTest('admin adds, syncs and clears a folder in My files', async ({ page }) => {
  const { root, folder } = makeFolder()
  try {
    const dialog = await openMyFiles(page)
    await expect(dialog.locator('[data-folder="Outputs"]')).toContainText('Filled by the assistant')
    await expect(dialog.locator('[data-folder="Agent notes"]')).toBeVisible()

    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 2, updated: 0, unchanged: 0.')
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await expect(dialog.locator('[data-path="Course notes/week1/lecture.md"]')).toBeVisible()

    // Change one file, then sync: only it is copied.
    writeFileSync(join(folder, 'week1', 'lecture.md'), 'Lecture 1, revised')
    await dialog.getByRole('button', { name: 'Sync folder Course notes' }).click()
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 0, updated: 1, unchanged: 1.')
    await expect(dialog.locator('[data-path="Course notes/week1/lecture.md"]')).toHaveAttribute('data-status', 'updated')

    // The files survive closing the dialog and a reload.
    await page.reload()
    await page.getByTestId('my-files-button').click()
    await expect(page.getByRole('dialog', { name: 'My files' }).locator('[data-folder="Course notes"]')).toContainText('Files: 2')

    await page.getByTestId('my-files-clear').click()
    await page.getByTestId('confirm-dialog-confirm').click()
    await expect(page.locator('[data-folder="Course notes"]')).toHaveCount(0)
    await expect(page.getByTestId('my-files-folder')).toHaveCount(2)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('uploads into reserved folders are refused', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-'))
  try {
    mkdirSync(join(root, 'Outputs'))
    writeFileSync(join(root, 'Outputs', 'fake.md'), 'not from the agent')
    const dialog = await openMyFiles(page)
    await dialog.getByTestId('my-files-input-folder').setInputFiles(join(root, 'Outputs'))
    await expect(dialog.getByTestId('my-files-status')).toContainText('Not copied: 1')
    await expect(dialog.locator('[data-folder="Outputs"]')).toContainText('Files: 0')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

studentTest('students do not see My files', async ({ page }) => {
  await page.goto('/general')
  await acceptDisclaimer(page)
  await expect(page.getByTestId('new-conversation-button')).toBeVisible()
  await expect(page.getByTestId('my-files-button')).toHaveCount(0)
})

adminTest('My files is hidden in embedded mode', async ({ page }) => {
  await page.goto('/general?embedded=true')
  await acceptDisclaimer(page)
  await expect(page.getByTestId('new-conversation-button').first()).toBeVisible()
  await expect(page.getByTestId('my-files-button')).toHaveCount(0)
})
