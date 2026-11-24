import { beforeEach, describe, expect, test } from 'vitest'
import {
  chatFilesStorageKey,
  MAX_CHAT_FILES,
  MAX_READING_POSITIONS,
  minimizedStorageKey,
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
  test('are stored under the chat context, newest first, and removed when empty', () => {
    writeChatFiles('hy-opt-cur-1', ['Course/notes.md', 'book.pdf'])
    writeChatFiles('general', ['book.pdf'])
    expect(localStorage.getItem(chatFilesStorageKey('hy-opt-cur-1'))).toBe('["Course/notes.md","book.pdf"]')
    expect(readChatFiles('hy-opt-cur-1')).toEqual(['Course/notes.md', 'book.pdf'])
    expect(readChatFiles('general')).toEqual(['book.pdf'])
    expect(readChatFiles('otm-2')).toEqual([])

    writeChatFiles('general', [])
    expect(localStorage.getItem(chatFilesStorageKey('general'))).toBe(null)
    expect(readChatFiles('hy-opt-cur-1')).toEqual(['Course/notes.md', 'book.pdf'])
  })

  test('opening a file moves it to the front and keeps at most MAX_CHAT_FILES', () => {
    expect(withOpenedFile(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b'])
    expect(withOpenedFile(['a'], 'b')).toEqual(['b', 'a'])
    const full = Array.from({ length: MAX_CHAT_FILES }, (_, n) => `${n}.md`)
    const next = withOpenedFile(full, 'new.md')
    expect(next).toHaveLength(MAX_CHAT_FILES)
    expect(next[0]).toBe('new.md')
    expect(next).not.toContain(`${MAX_CHAT_FILES - 1}.md`)
  })

  test('malformed entries are skipped', () => {
    localStorage.setItem(chatFilesStorageKey('general'), '["a.md", 3, "", "a.md", "b.md"]')
    expect(readChatFiles('general')).toEqual(['a.md', 'b.md'])
    localStorage.setItem(chatFilesStorageKey('general'), '{"a": 1}')
    expect(readChatFiles('general')).toEqual([])
    localStorage.setItem(chatFilesStorageKey('general'), 'not json')
    expect(readChatFiles('general')).toEqual([])
  })

  test('the open file stored before the list is read as the only file, until the list is written', () => {
    localStorage.setItem(openFileStorageKey('general'), 'old.md')
    expect(readChatFiles('general')).toEqual(['old.md'])
    writeChatFiles('general', ['new.md', 'old.md'])
    expect(localStorage.getItem(openFileStorageKey('general'))).toBe(null)
    expect(readChatFiles('general')).toEqual(['new.md', 'old.md'])
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
