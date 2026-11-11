// @vitest-environment node
// pdf.js parses for real here: its Node build runs without a worker thread, which happy-dom does not have.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { ClientToolResult } from '../../../shared/chatSocket'
import { FILE_TOOL_LIMITS } from '../../../shared/fileTools'
import { makeNoTextPdf, makeTextPdf } from '../../../test/pdfFixtures'
import { executeFileTool } from './agentTools'
import { createMemoryStore } from './memoryStore'
import { createMemoryPdfTextCache, createPdfPagesReader, extractPdfPagesWith, PdfParseError } from './pdfText'
import type { MyFilesStore } from './store'

const extract = (bytes: Uint8Array) => extractPdfPagesWith(pdfjs, bytes)

const okContent = (result: ClientToolResult) => {
  if (result.status !== 'ok') throw new Error(`Expected ok, got: ${result.error}`)
  return result.content
}

const errorOf = (result: ClientToolResult) => {
  if (result.status !== 'error') throw new Error(`Expected an error, got: ${result.content}`)
  return result.error
}

/** Page n says "Page n is about topic n." and, on page 3, "The exam is on Friday the 13th." */
const book = makeTextPdf(
  Array.from({ length: 5 }, (_, i) => [`Page ${i + 1} is about topic ${i + 1}.`, ...(i === 2 ? ['The exam is on Friday the 13th.'] : [])]),
)

describe('extractPdfPagesWith (pdf.js)', () => {
  test('returns the text of each page', async () => {
    const pages = await extract(book)
    expect(pages).toHaveLength(5)
    expect(pages[0]).toBe('Page 1 is about topic 1.')
    expect(pages[2]).toBe('Page 3 is about topic 3.\nThe exam is on Friday the 13th.')
  })

  test('a PDF without a text layer has empty pages', async () => {
    expect(await extract(makeNoTextPdf(2))).toEqual(['', ''])
  })

  test('refuses bytes that are not a PDF, and password-protected PDFs', async () => {
    await expect(extract(new TextEncoder().encode('%PDF-1.4 not really'))).rejects.toMatchObject({ reason: 'invalid' })
    const locked = makeTextPdf([['Secret']], { password: 'pw' })
    await expect(extract(locked)).rejects.toBeInstanceOf(PdfParseError)
    await expect(extract(locked)).rejects.toMatchObject({ reason: 'password' })
  })
})

describe('the file tools on PDFs', () => {
  let store: MyFilesStore
  let parse: ReturnType<typeof vi.fn<typeof extract>>
  const run = (name: string, input: unknown) =>
    executeFileTool(store, ['Course notes'], name, input, { readPdf: createPdfPagesReader({ cache: createMemoryPdfTextCache(), extract: parse }) })

  beforeEach(async () => {
    store = createMemoryStore()
    parse = vi.fn(extract)
    await store.write('Course notes/book.pdf', book)
    await store.write('Course notes/scan.pdf', makeNoTextPdf(3))
    await store.write('Course notes/notes.md', 'The exam is in hall A.\n')
  })

  test('read_file without pages returns the page count and all pages that fit, with markers', async () => {
    const result = await run('read_file', { path: 'Course notes/book.pdf' })
    expect(okContent(result)).toBe(
      [
        '"Course notes/book.pdf" is a PDF with 5 pages. Pages 1-5:',
        '[Page 1]',
        'Page 1 is about topic 1.',
        '[Page 2]',
        'Page 2 is about topic 2.',
        '[Page 3]',
        'Page 3 is about topic 3.',
        'The exam is on Friday the 13th.',
        '[Page 4]',
        'Page 4 is about topic 4.',
        '[Page 5]',
        'Page 5 is about topic 5.',
      ].join('\n'),
    )
    expect(result).toMatchObject({ artifact: { tool: 'read_file', path: 'Course notes/book.pdf', startPage: 1, endPage: 5, totalPages: 5 } })
  })

  test('read_file with pages reads one page or a range', async () => {
    expect(okContent(await run('read_file', { path: 'Course notes/book.pdf', pages: '3' }))).toBe(
      ['"Course notes/book.pdf" is a PDF with 5 pages. Page 3:', '[Page 3]', 'Page 3 is about topic 3.', 'The exam is on Friday the 13th.'].join('\n'),
    )
    const range = await run('read_file', { path: 'Course notes/book.pdf', pages: '4-9' })
    expect(okContent(range)).toBe(
      ['"Course notes/book.pdf" is a PDF with 5 pages. Pages 4-5:', '[Page 4]', 'Page 4 is about topic 4.', '[Page 5]', 'Page 5 is about topic 5.'].join('\n'),
    )
    expect(range).toMatchObject({ artifact: { startPage: 4, endPage: 5, totalPages: 5 } })
  })

  test('read_file refuses page ranges outside the PDF and invalid ones', async () => {
    expect(errorOf(await run('read_file', { path: 'Course notes/book.pdf', pages: '6' }))).toBe(
      '"Course notes/book.pdf" has only 5 pages; page 6 is past its end.',
    )
    expect(errorOf(await run('read_file', { path: 'Course notes/book.pdf', pages: '4-2' }))).toContain('is not a page range')
    expect(errorOf(await run('read_file', { path: 'Course notes/book.pdf', pages: '0' }))).toContain('is not a page range')
    expect(errorOf(await run('read_file', { path: 'Course notes/book.pdf', pages: 'last' }))).toContain('Invalid input for read_file')
    expect(errorOf(await run('read_file', { path: 'Course notes/notes.md', pages: '1' }))).toContain('pages is only for PDF files')
  })

  test('read_file stops at the size cap and says which pages to read next', async () => {
    // 8 pages of about 8000 characters each: the cap fits 4 of them
    const line = 'Thermodynamics is the study of energy, heat and work.'
    const pages = Array.from({ length: 8 }, (_, i) => [`Chapter ${i + 1}`, ...Array.from({ length: 150 }, () => line)])
    await store.write('Course notes/long.pdf', makeTextPdf(pages, { fontSize: 4 }))
    const result = await run('read_file', { path: 'Course notes/long.pdf' })
    const content = okContent(result)
    expect(content.length).toBeLessThanOrEqual(FILE_TOOL_LIMITS.readChars + 300)
    expect(content.startsWith('"Course notes/long.pdf" is a PDF with 8 pages. Pages 1-4:')).toBe(true)
    expect(content).toContain('[Page 4]\nChapter 4')
    expect(content).not.toContain('[Page 5]')
    expect(content.split('\n').at(-1)).toBe('[Showing pages 1-4 of 8. Use pages "5-8" to read further.]')
    expect(result).toMatchObject({ artifact: { startPage: 1, endPage: 4, totalPages: 8 } })
    if (result.status === 'ok') expect(JSON.stringify(result.artifact).length).toBeLessThan(500)

    // A range is capped the same way
    expect(
      okContent(await run('read_file', { path: 'Course notes/long.pdf', pages: '3-8' }))
        .split('\n')
        .at(-1),
    ).toBe('[Showing pages 3-6 of 8. Use pages "7-8" to read further.]')
  })

  test('a PDF without a text layer is a clear "no text layer" result', async () => {
    const error = errorOf(await run('read_file', { path: 'Course notes/scan.pdf' }))
    expect(error).toBe(
      '"Course notes/scan.pdf" cannot be read: the PDF has no text layer (it is probably scanned, or its pages are images), and text in images cannot be read here.',
    )
  })

  test('grep searches PDF text and reports page numbers', async () => {
    const result = await run('grep', { pattern: 'exam', path: 'Course notes' })
    expect(okContent(result)).toBe(
      [
        'Lines matching "exam" in "Course notes":',
        'Course notes/book.pdf (page 3, line 2): The exam is on Friday the 13th.',
        'Course notes/notes.md:1: The exam is in hall A.',
        '[Not searched (binary, too large, or PDFs without a text layer): Course notes/scan.pdf]',
      ].join('\n'),
    )
    expect(result).toMatchObject({
      artifact: {
        matches: [
          { path: 'Course notes/book.pdf', page: 3, line: 2 },
          { path: 'Course notes/notes.md', line: 1 },
        ],
        total: 2,
      },
    })
  })

  test('a PDF is parsed once, then read from the cache until it changes', async () => {
    const readPdf = createPdfPagesReader({ cache: createMemoryPdfTextCache(), extract: parse })
    const call = (name: string, input: unknown) => executeFileTool(store, ['Course notes'], name, input, { readPdf })
    await call('read_file', { path: 'Course notes/book.pdf', pages: '1' })
    await call('read_file', { path: 'Course notes/book.pdf', pages: '2' })
    await call('grep', { pattern: 'topic', path: 'Course notes/book.pdf' })
    expect(parse).toHaveBeenCalledTimes(1)

    await store.write('Course notes/book.pdf', makeTextPdf([['A new edition.']]), { lastModified: Date.now() + 1000 })
    expect(okContent(await call('read_file', { path: 'Course notes/book.pdf' }))).toContain('A new edition.')
    expect(parse).toHaveBeenCalledTimes(2)
  })
})
