import { beforeEach, describe, expect, test } from 'vitest'
import {
  MAX_READING_POSITIONS,
  minimizedStorageKey,
  openFileStorageKey,
  readingPositionKey,
  readMinimized,
  readOpenFile,
  readReadingPosition,
  writeMinimized,
  writeOpenFile,
  writeReadingPosition,
} from './viewerPersistence'

beforeEach(() => localStorage.clear())

describe('open file per chat context', () => {
  test('is stored under the chat context and removed on close', () => {
    writeOpenFile('hy-opt-cur-1', 'Course/notes.md')
    writeOpenFile('general', 'book.pdf')
    expect(localStorage.getItem(openFileStorageKey('hy-opt-cur-1'))).toBe('Course/notes.md')
    expect(readOpenFile('hy-opt-cur-1')).toBe('Course/notes.md')
    expect(readOpenFile('general')).toBe('book.pdf')
    expect(readOpenFile('otm-2')).toBe(null)

    writeOpenFile('general', null)
    expect(readOpenFile('general')).toBe(null)
    expect(readOpenFile('hy-opt-cur-1')).toBe('Course/notes.md')
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
