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

// The main agent delegates the PDF to the read_pdf subagent, whose own read_file call runs in the browser too.
adminTest('the PDF reader subagent reads an attached PDF and the answer uses its result', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-pdf-reader-'))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    writeFileSync(
      join(folder, 'book.pdf'),
      makeTextPdf([['Chapter 1: Energy.'], ['Chapter 2: Entropy.', 'The exam is on Friday the 13th.'], ['Chapter 3: Heat engines.']]),
    )

    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await useMockModel(page)

    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
    await dialog.getByTestId('my-files-close').click()
    await page.getByTestId('attach-folders-button').click()
    await page.getByRole('menuitemcheckbox', { name: 'Course notes' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('attached-folder')).toHaveAttribute('data-folder', 'Course notes')

    // The mock subagent reads pages 1-2; the main agent's answer quotes what it answered
    await sendChatMessage(page, 'pdfread Course notes/book.pdf')
    await closeSendPreference(page)
    const answer = page.getByTestId('assistant-message')
    await expect(answer).toContainText('The PDF says (pages 1-2)')
    await expect(answer).toContainText('The exam is on Friday the 13th.')

    const card = page.getByTestId('subagent-card')
    await expect(card).toHaveAttribute('data-subagent-name', 'read_pdf')
    await expect(card).toHaveAttribute('data-subagent-status', 'ok')
    await expect(card).toContainText('Task: Summarise the first pages')
    await expect(card.getByTestId('subagent-progress')).toHaveCount(0)

    // Its own tool call is nested in the card, which is collapsed by default
    const toggle = card.getByRole('button', { name: 'Subagent read_pdf finished' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(card.getByTestId('tool-part')).toHaveCount(0)
    await toggle.click()
    const nested = card.getByTestId('subagent-content').getByTestId('tool-part')
    await expect(nested).toHaveCount(1)
    await expect(nested).toHaveAttribute('data-tool-status', 'ok')
    await expect(nested).toContainText('Read the file Course notes/book.pdf, pages 1–2 of 3')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('opens a PDF from My files in the viewer, with page and zoom controls and internal links', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-pdf-viewer-'))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    const pages = Array.from({ length: 12 }, (_, n) => [`Chapter ${n + 1}: Thermodynamics.`])
    writeFileSync(join(folder, 'book.pdf'), makeTextPdf(pages, { links: [{ page: 1, text: 'Go to chapter 10', to: 10 }] }))
    writeFileSync(join(folder, 'secret.pdf'), makeTextPdf([['Hidden']], { password: 'pw' }))
    writeFileSync(join(folder, 'broken.pdf'), '%PDF-1.4 this is not a PDF')

    await page.goto('/general')
    await acceptDisclaimer(page)
    const openFile = async (name: string) => {
      await page.getByTestId('my-files-button').click()
      const dialog = page.getByRole('dialog', { name: 'My files' })
      if (!(await dialog.getByRole('button', { name: `Open ${name}` }).isVisible())) {
        await dialog.getByRole('button', { name: /^Course notes/ }).click()
      }
      await dialog.getByRole('button', { name: `Open ${name}` }).click()
      await expect(dialog).toBeHidden()
    }

    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 3')
    await dialog.getByTestId('my-files-close').click()

    await openFile('book.pdf')
    const viewer = page.getByRole('region', { name: 'book.pdf' })
    const pdf = viewer.getByTestId('file-viewer-pdf')
    await expect(pdf.locator('.page[data-page-number="1"] .textLayer')).toContainText('Chapter 1: Thermodynamics.')
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 1 / 12')
    await expect(pdf.getByRole('region', { name: 'Page 12' })).toHaveCount(1)
    // Only the pages in view are rendered
    expect(await pdf.locator('.page canvas').count()).toBeLessThan(12)

    // The text layer is selectable
    const selected = await pdf.locator('.page[data-page-number="1"] .textLayer').evaluate((layer) => {
      const range = document.createRange()
      range.selectNodeContents(layer)
      document.getSelection()!.removeAllRanges()
      document.getSelection()!.addRange(range)
      return document.getSelection()!.toString()
    })
    expect(selected).toContain('Chapter 1: Thermodynamics.')

    // Zoom in and out, and back to the page width
    const zoom = viewer.getByTestId('file-viewer-zoom')
    const fitted = await zoom.textContent()
    await viewer.getByRole('button', { name: 'Zoom in' }).click()
    await expect(zoom).not.toHaveText(fitted!)
    await viewer.getByRole('button', { name: 'Fit to width' }).click()
    await expect(zoom).toHaveText(fitted!)

    // An internal link jumps to its page
    await pdf.locator('.page[data-page-number="1"] .annotationLayer a').first().click()
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 10 / 12')
    await expect(pdf.locator('.page[data-page-number="10"] .textLayer')).toContainText('Chapter 10: Thermodynamics.')

    // Password-protected and invalid PDFs say why they are not shown
    await openFile('secret.pdf')
    await expect(page.getByRole('region', { name: 'secret.pdf' }).getByTestId('file-viewer-message')).toHaveText(
      'This PDF is password-protected and cannot be displayed.',
    )
    await openFile('broken.pdf')
    await expect(page.getByRole('region', { name: 'broken.pdf' }).getByTestId('file-viewer-message')).toHaveText('This file could not be read as a PDF.')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('asks about text selected on a PDF page, quoted with its page number', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-pdf-quote-'))
  const sentFrames: string[] = []
  page.on('websocket', (ws) => ws.on('framesent', (frame) => sentFrames.push(String(frame.payload))))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'book.pdf'), makeTextPdf([['Entropy always grows in a closed system.'], ['Chapter 2: Heat engines.']]))

    await page.goto('/general')
    await acceptDisclaimer(page)
    await useMockModel(page)
    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await dialog.getByRole('button', { name: 'Open book.pdf' }).click()
    await expect(dialog).toBeHidden()

    const viewer = page.getByRole('region', { name: 'book.pdf' })
    const line = viewer.locator('.page[data-page-number="1"] .textLayer span', { hasText: 'Entropy always grows' })
    await expect(line).toBeVisible()

    // Select the line on page 1 by dragging the mouse over it.
    const box = (await line.boundingBox())!
    await page.mouse.move(box.x + 1, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()

    const floating = viewer.getByRole('toolbar', { name: 'Selection actions' })
    await expect(floating).toBeVisible()
    await floating.getByRole('button', { name: 'Ask…' }).click()

    const chip = page.getByTestId('quote-chip')
    await expect(chip).toContainText('Quote from book.pdf · p. 1')
    await expect(chip).toContainText('Entropy always grows')

    await page.locator('#chat-input').fill('Why is that?')
    await page.getByTestId('send-chat-message').click()
    await closeSendPreference(page)

    const card = page.getByTestId('user-message').getByTestId('quote-card')
    await expect(card.getByTestId('quote-card-source')).toHaveText('📄 book.pdf · p. 1')
    await expect(card.getByTestId('quote-card-text')).toContainText('Entropy always grows')
    await expect(page.getByTestId('assistant-message')).toBeVisible()

    const sent = sentFrames.find((frame) => frame.includes('Why is that?'))
    expect(sent).toContain('"quotes":[{"kind":"text","path":"Course notes/book.pdf","page":1,"text":"Entropy always grows')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('Explain sends a PDF selection right away, keeping the typed draft', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-pdf-explain-'))
  const sentFrames: string[] = []
  page.on('websocket', (ws) => ws.on('framesent', (frame) => sentFrames.push(String(frame.payload))))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'book.pdf'), makeTextPdf([['Entropy always grows in a closed system.']]))

    await page.goto('/general')
    await acceptDisclaimer(page)
    await useMockModel(page)
    await page.locator('#chat-input').fill('my unsent draft')
    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await dialog.getByRole('button', { name: 'Open book.pdf' }).click()
    await expect(dialog).toBeHidden()

    const viewer = page.getByRole('region', { name: 'book.pdf' })
    const line = viewer.locator('.page[data-page-number="1"] .textLayer span', { hasText: 'Entropy always grows' })
    await expect(line).toBeVisible()
    const box = (await line.boundingBox())!
    await page.mouse.move(box.x + 1, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()

    await viewer.getByRole('toolbar', { name: 'Selection actions' }).getByRole('button', { name: 'Explain' }).click()

    const userMessage = page.getByTestId('user-message')
    // The bubble shows the action as a header over the quote, the model gets the request
    await expect(userMessage.getByTestId('quick-action-header')).toHaveText('Explain')
    await expect(userMessage).not.toContainText('Explain this passage.')
    const card = userMessage.getByTestId('quote-card')
    await expect(card.getByTestId('quote-card-source')).toHaveText('📄 book.pdf · p. 1')
    await expect(card.getByTestId('quote-card-text')).toContainText('Entropy always grows')
    await expect(page.getByTestId('assistant-message')).toBeVisible()
    await expect(page.locator('#chat-input')).toHaveValue('my unsent draft')
    await expect(page.getByTestId('quote-chip')).toHaveCount(0)

    const sent = sentFrames.find((frame) => frame.includes('Explain this passage.'))
    expect(sent).toContain('"quotes":[{"kind":"text","path":"Course notes/book.pdf","page":1,"text":"Entropy always grows')
    expect(sent).not.toContain('my unsent draft')
    expect(sent).toContain('"quickAction":"explain"')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('the open PDF and its page are remembered over a reload and a chat reset', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-pdf-persist-'))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    const pages = Array.from({ length: 12 }, (_, n) => [`Chapter ${n + 1}: Thermodynamics.`])
    writeFileSync(join(folder, 'book.pdf'), makeTextPdf(pages, { links: [{ page: 1, text: 'Go to chapter 8', to: 8 }] }))

    await page.goto('/general')
    await acceptDisclaimer(page)
    await useMockModel(page)
    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await dialog.getByRole('button', { name: 'Open book.pdf' }).click()

    const viewer = page.getByRole('region', { name: 'book.pdf' })
    const pdf = viewer.getByTestId('file-viewer-pdf')
    await pdf.locator('.page[data-page-number="1"] .annotationLayer a').first().click()
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 8 / 12')

    await page.reload()
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 8 / 12')
    await expect(pdf.locator('.page[data-page-number="8"] .textLayer')).toContainText('Chapter 8: Thermodynamics.')

    // Resetting the chat keeps the file open.
    await sendChatMessage(page, 'say hello')
    await closeSendPreference(page)
    await expect(page.getByTestId('assistant-message')).toContainText('hello')
    await expect(page.getByTestId('assistant-message')).not.toContainText('mock endpoint')
    await page.getByTestId('new-conversation-button').click()
    await page.getByTestId('submit-confirm-reset').click()
    await expect(page.getByTestId('assistant-message')).toHaveCount(0)
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 8 / 12')

    // Minimized, it stays minimized over a reload. (With the keyboard: a snackbar may cover the button.)
    await viewer.getByRole('button', { name: 'Minimize book.pdf' }).press('Enter')
    await page.reload()
    await expect(page.locator('#chat-input')).toBeVisible()
    await expect(page.getByTestId('right-rail').getByRole('button', { name: 'Open book.pdf' })).toBeVisible()
    await expect(viewer).toBeHidden()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('the source of a PDF quote opens the file at the quoted page', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-pdf-quote-source-'))
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    const pages = Array.from({ length: 6 }, (_, n) => [`Chapter ${n + 1}: Thermodynamics.`])
    writeFileSync(join(folder, 'book.pdf'), makeTextPdf(pages, { links: [{ page: 1, text: 'Go to chapter 4', to: 4 }] }))

    await page.goto('/general')
    await acceptDisclaimer(page)
    await useMockModel(page)
    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await dialog.getByRole('button', { name: 'Open book.pdf' }).click()

    // Quote a line on page 4.
    const viewer = page.getByRole('region', { name: 'book.pdf' })
    const pdf = viewer.getByTestId('file-viewer-pdf')
    await pdf.locator('.page[data-page-number="1"] .annotationLayer a').first().click()
    const line = pdf.locator('.page[data-page-number="4"] .textLayer span', { hasText: 'Chapter 4' })
    await expect(line).toBeVisible()
    await line.evaluate((span) => {
      const range = document.createRange()
      range.selectNodeContents(span)
      document.getSelection()!.removeAllRanges()
      document.getSelection()!.addRange(range)
    })
    await viewer.getByTestId('file-viewer-ask').click()
    await expect(page.getByTestId('quote-chip')).toContainText('Quote from book.pdf · p. 4')
    await page.locator('#chat-input').fill('What does this mean?')
    await page.getByTestId('send-chat-message').click()
    await closeSendPreference(page)
    await expect(page.getByTestId('assistant-message')).toBeVisible()

    // Back to page 1, which is remembered, then minimized.
    await pdf.evaluate((container) => container.scrollTo({ top: 0 }))
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 1 / 6')
    await viewer.getByRole('button', { name: 'Minimize book.pdf' }).press('Enter')
    await expect(viewer).toBeHidden()

    const source = page.getByTestId('user-message').getByRole('button', { name: 'Open book.pdf · p. 4 in the file viewer' })
    await source.click()
    await expect(viewer).toBeFocused()
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 4 / 6')
    await expect(pdf.locator('.page[data-page-number="4"] .textLayer')).toContainText('Chapter 4: Thermodynamics.')

    // With the file open at another page, the source jumps back to the quoted page.
    await pdf.evaluate((container) => container.scrollTo({ top: 0 }))
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 1 / 6')
    await source.click()
    await expect(viewer.getByTestId('file-viewer-pdf-page')).toHaveText('Page 4 / 6')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

adminTest('a message names the open PDF and its page, not when the viewer is minimized', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'my-files-pdf-open-note-'))
  const sentFrames: string[] = []
  page.on('websocket', (ws) => ws.on('framesent', (frame) => sentFrames.push(String(frame.payload))))
  /** The last user message of the run started with `text`. */
  const sentMessage = (text: string) => {
    const frame = sentFrames
      .map((payload) => JSON.parse(payload))
      .find((sent) => sent.type === 'run.start' && sent.input.options.chatMessages.at(-1)?.content === text)
    return frame?.input.options.chatMessages.at(-1)
  }
  try {
    const folder = join(root, 'Course notes')
    mkdirSync(folder, { recursive: true })
    const pages = Array.from({ length: 5 }, (_, n) => [`Chapter ${n + 1}: Thermodynamics.`])
    writeFileSync(join(folder, 'book.pdf'), makeTextPdf(pages, { links: [{ page: 1, text: 'Go to chapter 3', to: 3 }] }))

    await page.goto('/general')
    await acceptDisclaimer(page)
    await useMockModel(page)
    await page.getByTestId('my-files-button').click()
    const dialog = page.getByRole('dialog', { name: 'My files' })
    await dialog.getByTestId('my-files-input-folder').setInputFiles(folder)
    await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
    await dialog.getByRole('button', { name: /^Course notes/ }).click()
    await dialog.getByRole('button', { name: 'Open book.pdf' }).click()

    const viewer = page.getByRole('region', { name: 'book.pdf' })
    const pdf = viewer.getByTestId('file-viewer-pdf')
    await pdf.locator('.page[data-page-number="1"] .annotationLayer a').first().click()
    await expect(pdf).toHaveAttribute('data-page', '3')
    // Opening the PDF attached its folder; detached, the file tool instructions do not fill the mock model's small context.
    await page.getByTestId('attached-folder').press('Delete')
    await expect(page.getByTestId('attached-folder')).toHaveCount(0)

    await sendChatMessage(page, 'what is on this page?')
    await closeSendPreference(page)
    await expect(page.getByTestId('assistant-message')).toHaveCount(1)
    await expect.poll(() => sentMessage('what is on this page?')?.viewerFile).toEqual({ path: 'Course notes/book.pdf', page: 3 })

    await viewer.getByRole('button', { name: 'Minimize book.pdf' }).press('Enter')
    await expect(viewer).toBeHidden()
    await sendChatMessage(page, 'and in general?')
    await expect(page.getByTestId('assistant-message')).toHaveCount(2)
    await expect.poll(() => sentMessage('and in general?')).toBeTruthy()
    expect(sentMessage('and in general?')).not.toHaveProperty('viewerFile')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
