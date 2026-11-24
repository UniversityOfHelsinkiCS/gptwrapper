import { beforeEach, describe, expect, test } from 'vitest'
import {
  activeFileStorageKey,
  chatFilesStorageKey,
  MAX_CHAT_FILES,
  MAX_READING_POSITIONS,
  minimizedStorageKey,
  nearestKeptFile,
  openFileStorageKey,
  readChatFiles,
  readingPositionKey,
  readMinimized,
  readReadingPosition,
  withOpenedFile,
  writeChatFiles,
  writeMinimized,
  writeReadingPosition,
} from './viewerPersistence'

beforeEach(() => localStorage.clear())

describe('files per chat context', () => {
  test('are stored under the chat context, first opened first, with the shown one, and removed when empty', () => {
    writeChatFiles('hy-opt-cur-1', { files: ['Course/notes.md', 'book.pdf'], active: 'book.pdf' })
    writeChatFiles('general', { files: ['book.pdf'], active: 'book.pdf' })
    expect(localStorage.getItem(chatFilesStorageKey('hy-opt-cur-1'))).toBe('["Course/notes.md","book.pdf"]')
    expect(localStorage.getItem(activeFileStorageKey('hy-opt-cur-1'))).toBe('book.pdf')
    expect(readChatFiles('hy-opt-cur-1')).toEqual({ files: ['Course/notes.md', 'book.pdf'], active: 'book.pdf' })
    expect(readChatFiles('general')).toEqual({ files: ['book.pdf'], active: 'book.pdf' })
    expect(readChatFiles('otm-2')).toEqual({ files: [], active: null })

    writeChatFiles('general', { files: [], active: null })
    expect(localStorage.getItem(chatFilesStorageKey('general'))).toBe(null)
    expect(localStorage.getItem(activeFileStorageKey('general'))).toBe(null)
    expect(readChatFiles('hy-opt-cur-1')).toEqual({ files: ['Course/notes.md', 'book.pdf'], active: 'book.pdf' })
  })

  test('opening a file keeps the order, adds a new one at the end and keeps at most MAX_CHAT_FILES', () => {
    expect(withOpenedFile(['a', 'b', 'c'], 'a')).toEqual(['a', 'b', 'c'])
    expect(withOpenedFile(['a'], 'b')).toEqual(['a', 'b'])
    const full = Array.from({ length: MAX_CHAT_FILES }, (_, n) => `${n}.md`)
    const next = withOpenedFile(full, 'new.md')
    expect(next).toHaveLength(MAX_CHAT_FILES)
    expect(next.at(-1)).toBe('new.md')
    expect(next).not.toContain('0.md')
  })

  test('the file shown instead of a gone one is the next kept one, or the previous one', () => {
    const files = ['a', 'b', 'c', 'd']
    expect(nearestKeptFile(files, 1, (path) => path !== 'b')).toBe('c')
    expect(nearestKeptFile(files, 1, (path) => path === 'a' || path === 'd')).toBe('d')
    expect(nearestKeptFile(files, 3, (path) => path !== 'd')).toBe('c')
    expect(nearestKeptFile(files, 2, (path) => path === 'a')).toBe('a')
    expect(nearestKeptFile(['a'], 0, () => false)).toBe(undefined)
  })

  test('malformed entries are skipped, and a shown file not in the list falls back to the last one', () => {
    localStorage.setItem(activeFileStorageKey('general'), 'gone.md')
    localStorage.setItem(chatFilesStorageKey('general'), '["a.md", 3, "", "a.md", "b.md"]')
    expect(readChatFiles('general')).toEqual({ files: ['a.md', 'b.md'], active: 'b.md' })
    localStorage.setItem(chatFilesStorageKey('general'), '{"a": 1}')
    expect(readChatFiles('general')).toEqual({ files: [], active: null })
    localStorage.setItem(chatFilesStorageKey('general'), 'not json')
    expect(readChatFiles('general')).toEqual({ files: [], active: null })
  })

  test('a list stored without the shown file is the older newest-first one: reversed, its first file shown', () => {
    localStorage.setItem(chatFilesStorageKey('general'), '["c.md", "b.md", "a.md"]')
    expect(readChatFiles('general')).toEqual({ files: ['a.md', 'b.md', 'c.md'], active: 'c.md' })
  })

  test('the open file stored before the list is read as the only file, until the list is written', () => {
    localStorage.setItem(openFileStorageKey('general'), 'old.md')
    expect(readChatFiles('general')).toEqual({ files: ['old.md'], active: 'old.md' })
    writeChatFiles('general', { files: ['old.md', 'new.md'], active: 'new.md' })
    expect(localStorage.getItem(openFileStorageKey('general'))).toBe(null)
    expect(readChatFiles('general')).toEqual({ files: ['old.md', 'new.md'], active: 'new.md' })
  })
})

describe('minimized per chat context', () => {
  test('is stored only while minimized', () => {
    writeMinimized('general', true)
    expect(localStorage.getItem(minimizedStorageKey('general'))).toBe('true')
    expect(readMinimized('general')).toBe(true)
    expect(readMinimized('otm-2')).toBe(false)
    writeMinimized('general', false)
    expect(localStorage.getItem(minimizedStorageKey('general'))).toBe(null)
    expect(readMinimized('general')).toBe(false)
  })
})

describe('reading positions', () => {
  test('are keyed by path, size and modification time', () => {
    const key = readingPositionKey('a.pdf', 100, 1)
    expect(readingPositionKey('a.pdf', 100, 1)).toBe(key)
    expect(readingPositionKey('a.pdf', 101, 1)).not.toBe(key)
    expect(readingPositionKey('a.pdf', 100, 2)).not.toBe(key)
    expect(readingPositionKey('b.pdf', 100, 1)).not.toBe(key)

    writeReadingPosition(key, { page: 4 })
    writeReadingPosition(readingPositionKey('notes.md', 10, 1), { scroll: 0.5 })
    expect(readReadingPosition(key)).toEqual({ page: 4 })
    expect(readReadingPosition(readingPositionKey('notes.md', 10, 1))).toEqual({ scroll: 0.5 })
    // A replaced file has no position, so it starts at the top.
    expect(readReadingPosition(readingPositionKey('a.pdf', 100, 2))).toBe(null)
  })

  test(`keep at most ${MAX_READING_POSITIONS}, dropping the least recently saved`, () => {
    for (let n = 0; n < MAX_READING_POSITIONS; n++) writeReadingPosition(`file-${n}`, { page: n + 1 })
    // Saving again makes it the most recent.
    writeReadingPosition('file-0', { page: 9 })
    writeReadingPosition('new', { scroll: 0 })

    expect(JSON.parse(localStorage.getItem('file-viewer-positions')!)).toHaveLength(MAX_READING_POSITIONS)
    expect(readReadingPosition('file-0')).toEqual({ page: 9 })
    expect(readReadingPosition('file-1')).toBe(null)
    expect(readReadingPosition('file-2')).toEqual({ page: 3 })
    expect(readReadingPosition('new')).toEqual({ scroll: 0 })
  })

  test('ignore malformed storage', () => {
    localStorage.setItem('file-viewer-positions', 'not json')
    expect(readReadingPosition('a')).toBe(null)
    localStorage.setItem(
      'file-viewer-positions',
      JSON.stringify([{ key: 'a', position: { page: 0 } }, { key: 'b', position: { scroll: 2 } }, null, { key: 'c', position: { page: 2 } }]),
    )
    expect(readReadingPosition('a')).toBe(null)
    expect(readReadingPosition('b')).toBe(null)
    expect(readReadingPosition('c')).toEqual({ page: 2 })
    writeReadingPosition('d', { page: 1 })
    expect(JSON.parse(localStorage.getItem('file-viewer-positions')!)).toHaveLength(2)
  })
})
