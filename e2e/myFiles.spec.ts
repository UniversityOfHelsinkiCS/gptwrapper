import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import { adminTest, studentTest } from './fixtures'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'

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

const SECRET_TAIL = 'This last sentence must not be in the tool results of the history.'

/** Copies a `Course notes` folder into My files and attaches it to the chat with the attach menu. */
const attachCourseNotes = async (page: Page, root: string) => {
  const folder = join(root, 'Course notes')
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'syllabus.md'), `The exam is on Friday the 13th.\n${'Filler line.\n'.repeat(30)}${SECRET_TAIL}\n`)

  await page.getByTestId('my-files-button').click()
  const dialog = page.getByRole('dialog', { name: 'My files' })
  await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
  await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
  await dialog.getByTestId('my-files-close').click()
  await expect(dialog).toBeHidden()

  await page.getByTestId('attach-folders-button').click()
  await page.getByRole('menuitemcheckbox', { name: 'Course notes' }).click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Course notes' })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  await expect(page.getByTestId('attached-folder')).toHaveAttribute('data-folder', 'Course notes')
}

adminTest('the agent reads a file from an attached folder in the browser', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-agent-'))
  const sentFrames: string[] = []
  page.on('websocket', (ws) => ws.on('framesent', (frame) => sentFrames.push(String(frame.payload))))
  try {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await useMockModel(page)
    await attachCourseNotes(page, root)

    // The mock model lists the folder with `ls`, then reads its first file with `read_file`
    await sendChatMessage(page, 'files Course notes')
    await closeSendPreference(page)
    await expect(page.getByTestId('assistant-message')).toContainText('The exam is on Friday the 13th.')
    const parts = page.getByTestId('tool-part')
    await expect(parts).toHaveCount(2)
    await expect(parts.nth(0)).toHaveAttribute('data-tool-name', 'ls')
    await expect(parts.nth(0)).toHaveAttribute('data-tool-status', 'ok')
    await expect(parts.nth(1)).toHaveAttribute('data-tool-status', 'ok')
    await expect(parts.nth(1)).toContainText('Read the file Course notes/syllabus.md, lines 1–32 of 32')

    // A path outside the attached folders is refused in the browser
    await sendChatMessage(page, 'files Secret')
    await expect(parts.nth(2)).toHaveAttribute('data-tool-status', 'error')
    await expect(page.getByTestId('assistant-message').nth(1)).toContainText('outside the folders you can see')

    // The tool parts in the history are short summaries, not the file contents
    const runStarts = sentFrames.map((frame) => JSON.parse(frame)).filter((message) => message.type === 'run.start')
    expect(runStarts.map((message) => message.attachedFolders)).toEqual([['Course notes'], ['Course notes']])
    const historyToolParts = runStarts[1].input.options.chatMessages.flatMap((message: { parts?: { type: string }[] }) =>
      (message.parts ?? []).filter((part) => part.type === 'tool'),
    )
    expect(historyToolParts).toHaveLength(2)
    expect(JSON.stringify(historyToolParts)).not.toContain(SECRET_TAIL)

    // The attached folder survives a reload
    await page.reload()
    await expect(page.getByTestId('attached-folder')).toHaveAttribute('data-folder', 'Course notes')
    await page.getByTestId('attached-folder').press('Delete')
    await expect(page.getByTestId('attached-folder')).toHaveCount(0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

studentTest('students cannot attach folders', async ({ page }) => {
  await page.goto('/general')
  await acceptDisclaimer(page)
  await expect(page.getByTestId('chat-input')).toBeVisible()
  await expect(page.getByTestId('attach-folders-button')).toHaveCount(0)
})
