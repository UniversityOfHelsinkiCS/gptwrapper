import { mkdtempSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import { strToU8, zipSync } from 'fflate'
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

adminTest('the agent writes a file into Outputs, downloaded from the chat and from My files', async ({ page }) => {
  await page.goto('/test-course-course-id')
  await acceptDisclaimer(page)
  await useMockModel(page)

  // No folders attached: Outputs and Agent notes are in every chat
  await sendChatMessage(page, 'writeout study-plan.md')
  await closeSendPreference(page)
  const part = page.getByTestId('tool-part')
  await expect(part).toHaveAttribute('data-tool-name', 'write_file')
  await expect(part).toHaveAttribute('data-tool-status', 'ok')
  await expect(part).toContainText('Wrote the file Outputs/study-plan.md')

  const outputs = page.getByTestId('output-files')
  await expect(outputs.getByTestId('output-file')).toHaveAttribute('data-path', 'Outputs/study-plan.md')
  const [fromChat] = await Promise.all([page.waitForEvent('download'), outputs.getByRole('button', { name: 'Download study-plan.md' }).click()])
  expect(fromChat.suggestedFilename()).toBe('study-plan.md')
  expect(readFileSync(await fromChat.path(), 'utf8')).toContain('A file written by the mock model.')

  await page.getByTestId('my-files-button').click()
  const dialog = page.getByRole('dialog', { name: 'My files' })
  await expect(dialog.locator('[data-folder="Outputs"]')).toContainText('Files: 1')
  await dialog.getByRole('button', { name: /^Outputs/ }).click()
  const [fromDialog] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download study-plan.md' }).click()])
  expect(fromDialog.suggestedFilename()).toBe('study-plan.md')
  expect(readFileSync(await fromDialog.path(), 'utf8')).toContain('A file written by the mock model.')
  await dialog.getByTestId('my-files-close').click()

  // A write outside Outputs and Agent notes is refused in the browser
  await sendChatMessage(page, 'writeout ../Course notes/x.md')
  await expect(part.nth(1)).toHaveAttribute('data-tool-status', 'error')
  await expect(page.getByTestId('assistant-message').nth(1)).toContainText('not a valid path')
  await expect(page.getByTestId('output-files')).toHaveCount(1)
})

adminTest('notes written in one chat are read by the agent in a new chat, and export and import as a zip', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-notes-'))
  try {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await useMockModel(page)

    await sendChatMessage(page, 'note Goal: pass the thermodynamics exam in May.')
    await closeSendPreference(page)
    await expect(page.getByTestId('tool-part')).toHaveAttribute('data-tool-status', 'ok')
    await expect(page.getByTestId('tool-part')).toContainText('Wrote the file Agent notes/learner-profile.md')
    // Notes are not outputs
    await expect(page.getByTestId('output-files')).toHaveCount(0)

    await page.getByTestId('new-conversation-button').click()
    await page.getByTestId('submit-confirm-reset').click()
    await expect(page.getByTestId('assistant-message')).toHaveCount(0)

    // The mock model lists Agent notes and reads its first file
    await sendChatMessage(page, 'files Agent notes')
    await expect(page.getByTestId('tool-part').nth(1)).toContainText('Read the file Agent notes/learner-profile.md')
    await expect(page.getByTestId('assistant-message')).toContainText('Goal: pass the thermodynamics exam in May.')

    // The student views the note, exports Agent notes and imports the zip back
    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByRole('button', { name: /^Agent notes/ }).click()
    await dialog.getByRole('button', { name: 'View learner-profile.md' }).click()
    await expect(dialog.getByTestId('my-files-note-text')).toHaveText('Goal: pass the thermodynamics exam in May.')

    const [exported] = await Promise.all([page.waitForEvent('download'), dialog.getByTestId('my-files-export-notes').click()])
    expect(exported.suggestedFilename()).toBe('agent-notes.zip')
    const zipPath = join(root, 'agent-notes.zip')
    await exported.saveAs(zipPath)

    await dialog.getByTestId('my-files-input-notes-zip').setInputFiles(zipPath)
    const confirm = page.getByRole('dialog', { name: 'Replace Agent notes?' })
    await expect(confirm).toContainText('the 1 files in agent-notes.zip')
    await page.getByTestId('confirm-dialog-confirm').click()
    await expect(dialog.getByTestId('my-files-status')).toContainText('Agent notes replaced: 1 files imported.')
    await expect(dialog.locator('[data-folder="Agent notes"]')).toContainText('Files: 1')

    // A zip with a path outside Agent notes is refused
    writeFileSync(join(root, 'evil.zip'), zipSync({ 'Agent notes/ok.md': strToU8('ok'), '../evil.md': strToU8('evil') }))
    await dialog.getByTestId('my-files-input-notes-zip').setInputFiles(join(root, 'evil.zip'))
    await expect(dialog.getByTestId('my-files-status')).toContainText('the zip has a file outside Agent notes (../evil.md)')
    await expect(dialog.locator('[data-folder="Agent notes"]')).toContainText('Files: 1')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
