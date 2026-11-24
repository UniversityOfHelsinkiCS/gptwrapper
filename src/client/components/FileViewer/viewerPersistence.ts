import safeLocalStorage from '../../util/safeLocalStorage'

/**
 * What the file viewer remembers in local storage: the file open in each chat context (a course, or the general chat),
 * whether it is minimized there, and a reading position per file version.
 */

/** At most this many reading positions are kept; the least recently saved ones are dropped first. */
export const MAX_READING_POSITIONS = 50

const OPEN_FILE_KEY_PREFIX = 'file-viewer-open-'
const MINIMIZED_KEY_PREFIX = 'file-viewer-minimized-'
const POSITIONS_KEY = 'file-viewer-positions'

/** Where a file was being read: a PDF page, or how far down (0–1) a Markdown or text file was scrolled. */
export type ReadingPosition = { page: number } | { scroll: number }

interface StoredPosition {
  key: string
  position: ReadingPosition
}

/** The storage key for the file open in a chat context: the course id, or `general` for the general chat. */
export const openFileStorageKey = (chatContext: string) => `${OPEN_FILE_KEY_PREFIX}${chatContext}`

export const readOpenFile = (chatContext: string): string | null => {
  const stored = safeLocalStorage.getItem(openFileStorageKey(chatContext))
  return stored ? stored : null
}

export const writeOpenFile = (chatContext: string, path: string | null) => {
  if (path) safeLocalStorage.setItem(openFileStorageKey(chatContext), path)
  else safeLocalStorage.removeItem(openFileStorageKey(chatContext))
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
