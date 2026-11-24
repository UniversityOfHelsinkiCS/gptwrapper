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

studentTest('students see My files, tagged as experimental', async ({ page }) => {
  await page.goto('/general')
  await acceptDisclaimer(page)
  await expect(page.getByTestId('my-files-button')).toContainText('Experimental')
  await page.getByTestId('my-files-button').click()
  await expect(page.getByRole('dialog', { name: 'My files' })).toContainText('Experimental')
})

adminTest('My files is hidden in embedded mode', async ({ page }) => {
  await page.goto('/general?embedded=true')
  await acceptDisclaimer(page)
  await expect(page.getByTestId('new-conversation-button').first()).toBeVisible()
  await expect(page.getByTestId('my-files-button')).toHaveCount(0)
})

adminTest('opens a Markdown file from My files in the viewer next to the chat', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-viewer-'))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'lecture.md'), '# Eigenvalues\n\nSome **bold** text.\n\n![chart](https://example.com/chart.png)')
    writeFileSync(join(folder, 'book.pdf'), '%PDF-1.4')

    const dialog = await openMyFiles(page)
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 2')
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await expect(dialog.getByRole('button', { name: 'Open book.pdf' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Open lecture.md' }).click()
    await expect(dialog).toBeHidden()

    const viewer = page.getByRole('region', { name: 'lecture.md' })
    await expect(viewer.getByRole('heading', { level: 1, name: 'Eigenvalues' })).toBeVisible()
    await expect(viewer).toContainText('Image (not shown): chart')
    await expect(viewer.locator('img')).toHaveCount(0)
    await expect(viewer).toBeFocused()

    // Minimizing keeps the file in the rail, and the rail button brings it back.
    await viewer.getByRole('button', { name: 'Minimize lecture.md' }).click()
    await expect(viewer).toBeHidden()
    const expand = page.getByTestId('right-rail').getByRole('button', { name: 'Open lecture.md' })
    await expect(expand).toBeFocused()
    await expand.click()
    await expect(viewer).toBeVisible()
    await expect(viewer).toBeFocused()
    await expect(page.getByTestId('right-rail')).toHaveCount(0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('asks about text selected in the viewer, sending it as a quote', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-quote-'))
  const sentFrames: string[] = []
  page.on('websocket', (ws) => ws.on('framesent', (frame) => sentFrames.push(String(frame.payload))))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'lecture.md'), '# Week 3\n\n## Eigenvalues\n\nAn eigenvector keeps its direction.\n\nThe end.')

    await page.goto('/general')
    await acceptDisclaimer(page)
    await useMockModel(page)
    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await dialog.getByRole('button', { name: 'Open lecture.md' }).click()
    await expect(dialog).toBeHidden()

    const viewer = page.getByRole('region', { name: 'lecture.md' })
    const paragraph = viewer.getByText('An eigenvector keeps its direction.')
    await expect(viewer.getByTestId('file-viewer-ask')).toBeDisabled()

    // Select the paragraph by dragging the mouse over it.
    const box = (await paragraph.boundingBox())!
    await page.mouse.move(box.x + 1, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()

    const floating = viewer.getByRole('toolbar', { name: 'Selection actions' })
    await expect(floating).toBeVisible()
    await expect(viewer.getByTestId('file-viewer-ask')).toBeEnabled()
    await floating.getByRole('button', { name: 'Ask…' }).click()

    const chip = page.getByTestId('quote-chip')
    await expect(chip).toContainText('Quote from lecture.md · Eigenvalues')
    await expect(chip).toContainText('An eigenvector keeps its direction')
    await expect(page.locator('#chat-input')).toBeFocused()
    await expect(floating).toHaveCount(0)

    await page.locator('#chat-input').fill('What does this mean?')
    await page.getByTestId('send-chat-message').click()
    await closeSendPreference(page)

    const userMessage = page.getByTestId('user-message')
    const card = userMessage.getByTestId('quote-card')
    await expect(card.getByTestId('quote-card-source')).toHaveText('📄 lecture.md · Eigenvalues')
    await expect(card.getByTestId('quote-card-text')).toContainText('An eigenvector keeps its direction')
    await expect(userMessage).toContainText('What does this mean?')
    await expect(chip).toHaveCount(0)
    await expect(page.getByTestId('assistant-message')).toBeVisible()

    const sent = sentFrames.find((frame) => frame.includes('What does this mean?'))
    expect(sent).toContain('"quotes":[{"kind":"text","path":"Course notes/lecture.md","heading":"Eigenvalues","text":"An eigenvector keeps its direction')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

/** Copies a `Course notes` folder with `lecture.md` into My files and opens it in the viewer. */
const openLectureInViewer = async (page: Page, root: string, text: string) => {
  const folder = join(root, 'Course notes')
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'lecture.md'), text)
  await page.getByTestId('my-files-button').click()
  const dialog = page.getByRole('dialog', { name: 'My files' })
  await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
  await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
  await dialog.getByRole('button', { name: /^Course notes/ }).click()
  await dialog.getByRole('button', { name: 'Open lecture.md' }).click()
  await expect(dialog).toBeHidden()
  return page.getByRole('region', { name: 'lecture.md' })
}

adminTest('the viewer collapses the sidebar and is resized with the separator, which remembers the split', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-split-'))
  try {
    await page.goto('/general')
    await acceptDisclaimer(page)
    await expect(page.getByTestId('left-panel-close')).toBeVisible()
    const viewer = await openLectureInViewer(page, root, '# Week 3\n\nSome text.')
    await expect(viewer).toBeFocused()
    await expect(page.getByTestId('left-panel-close')).toBeHidden()

    const separator = page.getByRole('separator', { name: 'Resize the chat and the file' })
    await expect(separator).toHaveAttribute('aria-valuenow', '40')
    const chat = page.locator('#chat-column')
    const before = (await chat.boundingBox())!.width
    await separator.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(separator).toHaveAttribute('aria-valuenow', '50')
    await expect.poll(async () => (await chat.boundingBox())!.width).toBeGreaterThan(before + 50)

    // Dragged far to the left, the chat stays at least 360px wide.
    const box = (await separator.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 200)
    await page.mouse.down()
    await page.mouse.move(10, box.y + 200, { steps: 5 })
    await page.mouse.up()
    await expect.poll(async () => Math.round((await chat.boundingBox())!.width)).toBeGreaterThanOrEqual(360)
    await expect(separator).not.toHaveAttribute('aria-valuenow', '50')
    const dragged = await separator.getAttribute('aria-valuenow')

    // Minimizing does not bring the sidebar back, and the split is remembered.
    await viewer.getByRole('button', { name: 'Minimize lecture.md' }).click()
    await expect(page.getByTestId('left-panel-close')).toBeHidden()
    await page.reload()
    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await dialog.getByRole('button', { name: 'Open lecture.md' }).click()
    await expect(separator).toHaveAttribute('aria-valuenow', dragged!)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('on a narrow screen the viewer covers the chat, and Ask… goes back to the chat', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-narrow-'))
  try {
    await page.setViewportSize({ width: 800, height: 900 })
    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('left-panel-open').click()
    const viewer = await openLectureInViewer(page, root, '# Week 3\n\n## Eigenvalues\n\nAn eigenvector keeps its direction.')

    const paragraph = viewer.getByText('An eigenvector keeps its direction.')
    await expect(paragraph).toBeVisible()
    await expect(page.locator('#chat-input')).toBeHidden()
    await expect(page.getByRole('separator')).toHaveCount(0)
    expect((await viewer.boundingBox())!.width).toBeGreaterThan(780)

    // Back to chat and to the file again.
    await viewer.getByRole('button', { name: 'Back to chat' }).click()
    await expect(viewer).toBeHidden()
    await expect(page.locator('#chat-input')).toBeFocused()
    await page.getByRole('button', { name: 'Back to lecture.md' }).click()
    await expect(viewer).toBeFocused()

    // A mouse selection shows no floating toolbar; the toolbar actions are there instead.
    const box = (await paragraph.boundingBox())!
    await page.mouse.move(box.x + 1, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    await expect(viewer.getByTestId('file-viewer-ask')).toBeEnabled()
    await expect(viewer.getByRole('toolbar', { name: 'Selection actions' })).toHaveCount(0)
    await viewer.getByTestId('file-viewer-ask').click()

    await expect(viewer).toBeHidden()
    await expect(page.getByTestId('quote-chip')).toContainText('Quote from lecture.md · Eigenvalues')
    await expect(page.locator('#chat-input')).toBeFocused()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

const SECRET_TAIL = 'This last sentence must not be in the tool results of the history.'

/** Copies a `Course notes` folder into My files and attaches it to the chat with the attach menu. */
const attachCourseNotes = async (page: Page, root: string) => {
  const folder = join(root, 'Course notes')
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'syllabus.md'), `The exam is on Friday the 13th.\n${'Filler line.\n'.repeat(10)}${SECRET_TAIL}\n`)

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
    // The two tool calls are folded into one activity group, closed by default
    const group = page.getByRole('button', { name: '2 steps' })
    await expect(group).toHaveAttribute('aria-expanded', 'false')
    await group.click()
    const parts = page.getByTestId('tool-part')
    await expect(parts).toHaveCount(2)
    await expect(parts.nth(0)).toHaveAttribute('data-tool-name', 'ls')
    await expect(parts.nth(0)).toHaveAttribute('data-tool-status', 'ok')
    await expect(parts.nth(1)).toHaveAttribute('data-tool-status', 'ok')
    await expect(parts.nth(1)).toContainText('Read the file Course notes/syllabus.md, lines 1–12 of 12')

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

studentTest('students can attach folders', async ({ page }) => {
  await page.goto('/general')
  await acceptDisclaimer(page)
  await expect(page.getByTestId('chat-input')).toBeVisible()
  await expect(page.getByTestId('attach-folders-button')).toBeVisible()
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
    await page.getByRole('button', { name: '2 steps' }).click()
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

adminTest('a Markdown file reopens after a reload scrolled where it was left', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-persist-'))
  try {
    await page.goto('/general')
    await acceptDisclaimer(page)
    const text = Array.from({ length: 80 }, (_, n) => `## Section ${n + 1}\n\nParagraph ${n + 1}.`).join('\n\n')
    const viewer = await openLectureInViewer(page, root, text)
    await expect(viewer.getByText('Paragraph 80.')).toBeAttached()

    const fraction = (region: HTMLElement) => region.scrollTop / (region.scrollHeight - region.clientHeight)
    await viewer.evaluate((region) => region.scrollTo({ top: (region.scrollHeight - region.clientHeight) / 2 }))
    await page.waitForTimeout(500) // the position is saved once scrolling pauses

    await page.reload()
    await expect(viewer.getByText('Paragraph 80.')).toBeAttached()
    await expect.poll(() => viewer.evaluate(fraction)).toBeCloseTo(0.5, 1)
    // Restoring the file does not move the focus into it.
    await expect(viewer).not.toBeFocused()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('a minimized viewer stays minimized after a reload and expands at its position', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-minimize-'))
  try {
    await page.goto('/general')
    await acceptDisclaimer(page)
    const text = Array.from({ length: 80 }, (_, n) => `## Section ${n + 1}\n\nParagraph ${n + 1}.`).join('\n\n')
    const viewer = await openLectureInViewer(page, root, text)
    await expect(viewer.getByText('Paragraph 80.')).toBeAttached()
    const fraction = (region: HTMLElement) => region.scrollTop / (region.scrollHeight - region.clientHeight)
    await viewer.evaluate((region) => region.scrollTo({ top: (region.scrollHeight - region.clientHeight) / 2 }))
    await page.waitForTimeout(500) // the position is saved once scrolling pauses

    await viewer.getByRole('button', { name: 'Minimize lecture.md' }).click()
    await expect(viewer).toBeHidden()
    await expect(page.getByRole('separator', { name: 'Resize the chat and the file' })).toHaveCount(0)
    const expand = page.getByRole('button', { name: 'Open lecture.md' })
    await expect(expand).toBeVisible()

    await page.reload()
    await expect(expand).toBeVisible()
    await expect(viewer).toBeHidden()
    await expand.click()
    await expect(viewer).toBeVisible()
    await expect(viewer).toBeFocused()
    await expect.poll(() => viewer.evaluate(fraction)).toBeCloseTo(0.5, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
