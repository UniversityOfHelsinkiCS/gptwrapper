import safeLocalStorage from '../../util/safeLocalStorage'

/**
 * What the file viewer remembers in local storage: the files opened in each chat context (a course, or the general
 * chat), whether the viewer is minimized there, and a reading position per file version.
 */

/** At most this many reading positions are kept; the least recently saved ones are dropped first. */
export const MAX_READING_POSITIONS = 50

/** At most this many files are kept per chat context; opening another one drops the first opened. */
export const MAX_CHAT_FILES = 10

const FILES_KEY_PREFIX = 'file-viewer-files-'
const ACTIVE_KEY_PREFIX = 'file-viewer-active-'
/** Before the file list, only the open file was remembered. It is read once as the list's only file. */
const OPEN_FILE_KEY_PREFIX = 'file-viewer-open-'
const MINIMIZED_KEY_PREFIX = 'file-viewer-minimized-'
const POSITIONS_KEY = 'file-viewer-positions'

/** Where a file was being read: a PDF page, or how far down (0–1) a Markdown or text file was scrolled. */
export type ReadingPosition = { page: number } | { scroll: number }

interface StoredPosition {
  key: string
  position: ReadingPosition
}

/** The files of a chat context in the order they were first opened, and the one the viewer shows (null without files). */
export interface ChatFiles {
  files: string[]
  active: string | null
}

/** The storage key for the files of a chat context: the course id, or `general` for the general chat. */
export const chatFilesStorageKey = (chatContext: string) => `${FILES_KEY_PREFIX}${chatContext}`

/** The storage key for the file the viewer shows in a chat context. */
export const activeFileStorageKey = (chatContext: string) => `${ACTIVE_KEY_PREFIX}${chatContext}`

/** The storage key of the open file before the file list. */
export const openFileStorageKey = (chatContext: string) => `${OPEN_FILE_KEY_PREFIX}${chatContext}`

const parseFiles = (stored: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return Array.from(new Set(parsed.filter((path): path is string => typeof path === 'string' && path.length > 0)))
  } catch {
    return []
  }
}

/**
 * The files opened in a chat context, first opened first, and the one shown. Anything malformed is skipped; a shown
 * file missing from the list falls back to the last one. Two older formats are read as well: a list without a stored
 * shown file was newest first with the shown file first, and before the list only the open file was stored.
 */
export const readChatFiles = (chatContext: string): ChatFiles => {
  const stored = safeLocalStorage.getItem(chatFilesStorageKey(chatContext))
  if (stored === null) {
    const openFile = safeLocalStorage.getItem(openFileStorageKey(chatContext))
    return openFile ? { files: [openFile], active: openFile } : { files: [], active: null }
  }
  const active = safeLocalStorage.getItem(activeFileStorageKey(chatContext))
  if (active === null) {
    const newestFirst = parseFiles(stored).slice(0, MAX_CHAT_FILES)
    return { files: [...newestFirst].reverse(), active: newestFirst[0] ?? null }
  }
  const files = parseFiles(stored).slice(-MAX_CHAT_FILES)
  return { files, active: files.includes(active) ? active : files.at(-1) ?? null }
}

export const writeChatFiles = (chatContext: string, { files, active }: ChatFiles) => {
  safeLocalStorage.removeItem(openFileStorageKey(chatContext))
  if (files.length > 0 && active) {
    safeLocalStorage.setItem(chatFilesStorageKey(chatContext), JSON.stringify(files.slice(-MAX_CHAT_FILES)))
    safeLocalStorage.setItem(activeFileStorageKey(chatContext), active)
  } else {
    safeLocalStorage.removeItem(chatFilesStorageKey(chatContext))
    safeLocalStorage.removeItem(activeFileStorageKey(chatContext))
  }
}

/**
 * The list with `path` opened: a listed file keeps its place, a new one is added at the end, dropping the first opened
 * beyond `MAX_CHAT_FILES`.
 */
export const withOpenedFile = (paths: string[], path: string): string[] => (paths.includes(path) ? paths : [...paths, path].slice(-MAX_CHAT_FILES))

/**
 * The file to show instead of `paths[index]` when it goes away: the nearest one after it that is kept, or else the
 * nearest one before it. Undefined when none is kept.
 */
export const nearestKeptFile = (paths: string[], index: number, kept: (path: string) => boolean): string | undefined => {
  for (let next = index + 1; next < paths.length; next++) if (kept(paths[next])) return paths[next]
  for (let previous = index - 1; previous >= 0; previous--) if (kept(paths[previous])) return paths[previous]
  return undefined
}

/** Whether the viewer is minimized to the rail in a chat context. */
export const minimizedStorageKey = (chatContext: string) => `${MINIMIZED_KEY_PREFIX}${chatContext}`

export const readMinimized = (chatContext: string): boolean => safeLocalStorage.getItem(minimizedStorageKey(chatContext)) === 'true'

export const writeMinimized = (chatContext: string, minimized: boolean) => {
  if (minimized) safeLocalStorage.setItem(minimizedStorageKey(chatContext), 'true')
  else safeLocalStorage.removeItem(minimizedStorageKey(chatContext))
}

/**
 * A file version's identity, as in the PDF text cache: a replaced file (another size or modification time) gets a new
 * key and so starts at the top.
 */
export const readingPositionKey = (path: string, size: number, lastModified: number) => JSON.stringify([path, size, lastModified])

const isPosition = (value: unknown): value is ReadingPosition => {
  if (!value || typeof value !== 'object') return false
  const { page, scroll } = value as { page?: unknown; scroll?: unknown }
  if (page !== undefined) return typeof page === 'number' && Number.isInteger(page) && page >= 1
  return typeof scroll === 'number' && scroll >= 0 && scroll <= 1
}

/** The stored positions, oldest first. Anything malformed is skipped. */
const readPositions = (): StoredPosition[] => {
  try {
    const parsed: unknown = JSON.parse(safeLocalStorage.getItem(POSITIONS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is StoredPosition => !!entry && typeof entry === 'object' && typeof entry.key === 'string' && isPosition(entry.position),
    )
  } catch {
    return []
  }
}

export const readReadingPosition = (key: string): ReadingPosition | null => readPositions().find((entry) => entry.key === key)?.position ?? null

/** Saves a position as the most recent one, dropping the oldest beyond `MAX_READING_POSITIONS`. */
export const writeReadingPosition = (key: string, position: ReadingPosition) => {
  const entries = readPositions().filter((entry) => entry.key !== key)
  entries.push({ key, position })
  safeLocalStorage.setItem(POSITIONS_KEY, JSON.stringify(entries.slice(-MAX_READING_POSITIONS)))
}
