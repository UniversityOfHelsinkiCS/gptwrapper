import { loadPdfjs, type Pdfjs } from '../pdfjs'
import type { MyFilesEntry, MyFilesStore } from './store'

/**
 * The text of the PDFs in My files, for the agent's read tools (issue 13). pdf.js parses a PDF in the browser, once:
 * the text of its pages is cached in OPFS, outside the My files tree (so neither the tools nor the My files listing
 * see it), and served from there while the file's path, size and lastModified stay the same. "Clear my files" clears
 * it too.
 */

/** Why a PDF could not be parsed. */
export class PdfParseError extends Error {
  readonly reason: 'password' | 'invalid'

  constructor(reason: 'password' | 'invalid', message: string) {
    super(message)
    this.name = 'PdfParseError'
    this.reason = reason
  }
}

/** The text of each page of a PDF, in order. A page without a text layer is ''. */
export type PdfTextExtractor = (bytes: Uint8Array) => Promise<string[]>

type TextContentItem = { str?: unknown; hasEOL?: unknown }

/** The text of one page from pdf.js's text items: line ends where pdf.js marks them, trailing spaces trimmed. */
export const pageTextFromItems = (items: readonly TextContentItem[]): string => {
  let text = ''
  for (const item of items) {
    if (typeof item.str === 'string') text += item.str
    if (item.hasEOL === true) text += '\n'
  }
  return text
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .trim()
}

type PdfjsLike = Pick<Pdfjs, 'getDocument'>

/** Extracts the page texts with the given pdf.js (the browser's lazily loaded one, or the Node build in tests). */
export const extractPdfPagesWith = async (pdfjs: PdfjsLike, bytes: Uint8Array): Promise<string[]> => {
  // pdf.js transfers (detaches) the buffer it is given.
  const task = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, verbosity: 0 })
  let doc: Awaited<typeof task.promise>
  try {
    doc = await task.promise
  } catch (error) {
    const name = (error as { name?: string } | null)?.name
    if (name === 'PasswordException') throw new PdfParseError('password', 'the PDF is password-protected')
    throw new PdfParseError('invalid', 'it could not be parsed as a PDF')
  }
  try {
    const pages: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      pages.push(pageTextFromItems(content.items as TextContentItem[]))
      page.cleanup()
    }
    return pages
  } finally {
    await doc.destroy()
  }
}

/** The app's extractor: loads pdf.js on first use. */
export const extractPdfPages: PdfTextExtractor = async (bytes) => extractPdfPagesWith(await loadPdfjs(), bytes)

export type CachedPdfText = { path: string; size: number; lastModified: number; pages: string[] }

export interface PdfTextCache {
  /** The cached text of `path`, whatever its size and time; the reader checks them. */
  get(path: string): Promise<CachedPdfText | null>
  set(entry: CachedPdfText): Promise<void>
  clear(): Promise<void>
}

export const createMemoryPdfTextCache = (): PdfTextCache => {
  const entries = new Map<string, CachedPdfText>()
  return {
    async get(path) {
      return entries.get(path) ?? null
    },
    async set(entry) {
      entries.set(entry.path, entry)
    },
    async clear() {
      entries.clear()
    },
  }
}

/** The OPFS directory of the cache, next to (not inside) the My files tree `my-files/`. */
const CACHE_DIR = 'my-files-pdf-text'
const CACHE_VERSION = 1

const cacheFileName = async (path: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(path))
  return `${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}.json`
}

/** One JSON file per PDF path, named by a hash of the path, holding its size, lastModified and page texts. */
export const createOpfsPdfTextCache = (getRoot: () => Promise<FileSystemDirectoryHandle> = () => navigator.storage.getDirectory()): PdfTextCache => {
  const dir = async () => (await getRoot()).getDirectoryHandle(CACHE_DIR, { create: true })
  return {
    async get(path) {
      try {
        const file = await (await (await dir()).getFileHandle(await cacheFileName(path))).getFile()
        const parsed = JSON.parse(await file.text()) as Partial<CachedPdfText> & { version?: number }
        if (parsed.version !== CACHE_VERSION || parsed.path !== path || !Array.isArray(parsed.pages)) return null
        return { path, size: Number(parsed.size), lastModified: Number(parsed.lastModified), pages: parsed.pages.map(String) }
      } catch {
        return null
      }
    },
    async set(entry) {
      const handle = await (await dir()).getFileHandle(await cacheFileName(entry.path), { create: true })
      const writable = await handle.createWritable()
      try {
        await writable.write(JSON.stringify({ version: CACHE_VERSION, ...entry }))
      } finally {
        await writable.close()
      }
    },
    async clear() {
      try {
        await (await getRoot()).removeEntry(CACHE_DIR, { recursive: true })
      } catch (error) {
        if ((error as { name?: string } | null)?.name !== 'NotFoundError') throw error
      }
    },
  }
}

let defaultCache: PdfTextCache | null = null

/** The app's PDF text cache, or null when the browser has no OPFS. */
export const getPdfTextCache = (): PdfTextCache | null => {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.getDirectory !== 'function') return null
  return (defaultCache ??= createOpfsPdfTextCache())
}

/** The page texts of a PDF file in My files. Throws `PdfParseError`. */
export type PdfPagesReader = (store: MyFilesStore, entry: MyFilesEntry) => Promise<string[]>

/**
 * Reads PDFs through the cache: a file whose path, size and lastModified match the cached entry is not parsed again.
 * The cache is best effort: when it cannot be read or written, the PDF is parsed.
 */
export const createPdfPagesReader = ({ cache, extract }: { cache: PdfTextCache | null; extract: PdfTextExtractor }): PdfPagesReader => {
  // Calls for the same file while it is being parsed share the parse.
  const inFlight = new Map<string, Promise<string[]>>()

  const read = async (store: MyFilesStore, entry: MyFilesEntry) => {
    const cached = await cache?.get(entry.path).catch(() => null)
    if (cached && cached.size === entry.size && cached.lastModified === entry.lastModified) return cached.pages
    const pages = await extract(await store.readBytes(entry.path))
    await cache?.set({ path: entry.path, size: entry.size, lastModified: entry.lastModified, pages }).catch(() => {})
    return pages
  }

  return (store, entry) => {
    const key = JSON.stringify([entry.path, entry.size, entry.lastModified])
    let promise = inFlight.get(key)
    if (!promise) {
      promise = read(store, entry).finally(() => inFlight.delete(key))
      inFlight.set(key, promise)
    }
    return promise
  }
}

let defaultReader: PdfPagesReader | null = null

/** The app's reader: pdf.js in the browser, cached in OPFS. */
export const defaultPdfPagesReader: PdfPagesReader = (store, entry) =>
  (defaultReader ??= createPdfPagesReader({ cache: getPdfTextCache(), extract: extractPdfPages }))(store, entry)
