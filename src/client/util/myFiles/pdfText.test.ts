import { describe, expect, test, vi } from 'vitest'
import { createMemoryStore } from './memoryStore'
import { createMemoryPdfTextCache, createPdfPagesReader, pageTextFromItems, type PdfTextCache, type PdfTextExtractor } from './pdfText'

// The real parsing is tested in `pdfText.node.test.ts`; here the extractor is a fake.
const fakeExtract = () => vi.fn<PdfTextExtractor>(async (bytes) => [new TextDecoder().decode(bytes)])

describe('pageTextFromItems', () => {
  test('joins the items, breaks lines where pdf.js marks them and trims trailing spaces', () => {
    const items = [
      { str: 'Entropy ', hasEOL: false },
      { str: 'increases. ', hasEOL: true },
      { str: '' },
      { str: 'Always.', hasEOL: false },
      { type: 'beginMarkedContent' },
    ]
    expect(pageTextFromItems(items)).toBe('Entropy increases.\nAlways.')
    expect(pageTextFromItems([{ str: '   ', hasEOL: true }])).toBe('')
  })
})

describe('createPdfPagesReader', () => {
  test('parses a PDF once and serves it from the cache while its path, size and lastModified stay the same', async () => {
    const store = createMemoryStore()
    const extract = fakeExtract()
    const cache = createMemoryPdfTextCache()
    const read = createPdfPagesReader({ cache, extract })
    const entry = await store.write('A/book.pdf', 'first', { lastModified: 1000 })

    expect(await read(store, entry)).toEqual(['first'])
    expect(await read(store, entry)).toEqual(['first'])
    // Another reader on the same cache (e.g. after a reload) does not parse it either
    expect(await createPdfPagesReader({ cache, extract })(store, entry)).toEqual(['first'])
    expect(extract).toHaveBeenCalledTimes(1)

    // A new copy of the file (other time or size) is parsed again
    const changed = await store.write('A/book.pdf', 'second', { lastModified: 2000 })
    expect(await read(store, changed)).toEqual(['second'])
    expect(extract).toHaveBeenCalledTimes(2)

    // After the cache is cleared ("Clear my files"), it is parsed again
    await cache.clear()
    expect(await read(store, changed)).toEqual(['second'])
    expect(extract).toHaveBeenCalledTimes(3)
  })

  test('calls for the same file while it is parsed share one parse', async () => {
    const store = createMemoryStore()
    const extract = fakeExtract()
    const read = createPdfPagesReader({ cache: createMemoryPdfTextCache(), extract })
    const entry = await store.write('A/book.pdf', 'text')
    expect(await Promise.all([read(store, entry), read(store, entry)])).toEqual([['text'], ['text']])
    expect(extract).toHaveBeenCalledTimes(1)
  })

  test('works without a cache, or with one that fails', async () => {
    const store = createMemoryStore()
    const entry = await store.write('A/book.pdf', 'text')
    expect(await createPdfPagesReader({ cache: null, extract: fakeExtract() })(store, entry)).toEqual(['text'])
    const broken: PdfTextCache = {
      get: () => Promise.reject(new Error('no OPFS')),
      set: () => Promise.reject(new Error('quota')),
      clear: () => Promise.resolve(),
    }
    expect(await createPdfPagesReader({ cache: broken, extract: fakeExtract() })(store, entry)).toEqual(['text'])
  })
})
