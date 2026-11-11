import { describe, expect, test } from 'vitest'
import { ensureReservedFolders, importFiles, intoFolder, sourcesFromFiles, type ImportSource } from './importFiles'
import { createMemoryStore } from './memoryStore'
import { isReservedPath, isWithin, normalizePath } from './paths'
import { isMyFilesError } from './store'

const source = (path: string, content: string, lastModified = 1_000): ImportSource => ({
  path,
  file: new File([content], path.split('/').at(-1) ?? path, { lastModified }),
})

describe('paths', () => {
  test('normalises slashes and dots', () => {
    expect(normalizePath('/Course//week1/./notes.md/')).toBe('Course/week1/notes.md')
    expect(normalizePath('')).toBe('')
  })

  test.each(['..', 'a/../b', '../Outputs', 'a/..', 'a\\b', 'a/\u0000b'])('refuses %j', (path) => {
    expect(() => normalizePath(path)).toThrow()
    try {
      normalizePath(path)
    } catch (error) {
      expect(isMyFilesError(error, 'invalid_path')).toBe(true)
    }
  })

  test('isWithin compares whole segments', () => {
    expect(isWithin('Outputs/a.md', 'Outputs')).toBe(true)
    expect(isWithin('Outputs', 'Outputs')).toBe(true)
    expect(isWithin('Outputs2/a.md', 'Outputs')).toBe(false)
    expect(isWithin('anything', '')).toBe(true)
  })

  test('reserved folders are matched case-insensitively at the top level only', () => {
    expect(isReservedPath('Outputs')).toBe(true)
    expect(isReservedPath('outputs/x.md')).toBe(true)
    expect(isReservedPath('/Agent notes/learner-profile.md')).toBe(true)
    expect(isReservedPath('Course/Outputs/x.md')).toBe(false)
    expect(isReservedPath('Agent notes 2/x.md')).toBe(false)
  })
})

describe('memory store', () => {
  test('writes, lists, stats and reads files, creating parents', async () => {
    const store = createMemoryStore()
    await store.write('Course/week1/a.md', 'hello', { lastModified: 42 })
    await store.write('Course/b.bin', new Uint8Array([1, 2, 3]))

    expect((await store.list()).map((e) => e.path)).toEqual(['Course'])
    expect((await store.list('Course', { recursive: true })).map((e) => [e.kind, e.path])).toEqual([
      ['file', 'Course/b.bin'],
      ['directory', 'Course/week1'],
      ['file', 'Course/week1/a.md'],
    ])
    expect(await store.stat('Course/week1/a.md')).toEqual({ path: 'Course/week1/a.md', name: 'a.md', kind: 'file', size: 5, lastModified: 42 })
    expect(await store.stat('missing')).toBeNull()
    expect(await store.readText('Course/week1/a.md')).toBe('hello')
    expect([...(await store.readBytes('Course/b.bin'))]).toEqual([1, 2, 3])
  })

  test('throws typed errors', async () => {
    const store = createMemoryStore()
    await store.write('a.md', 'x')
    await expect(store.readText('nope.md')).rejects.toSatisfy((e) => isMyFilesError(e, 'not_found'))
    await expect(store.write('a.md/child.md', 'x')).rejects.toSatisfy((e) => isMyFilesError(e, 'not_a_directory'))
    await store.mkdir('dir')
    await expect(store.readText('dir')).rejects.toSatisfy((e) => isMyFilesError(e, 'not_a_file'))
    await expect(store.write('../escape.md', 'x')).rejects.toSatisfy((e) => isMyFilesError(e, 'invalid_path'))
    await expect(store.delete('')).rejects.toSatisfy((e) => isMyFilesError(e, 'invalid_path'))
  })

  test('delete removes a folder with its contents, clear removes everything', async () => {
    const store = createMemoryStore()
    await store.write('A/x.md', 'x')
    await store.write('A/sub/y.md', 'y')
    await store.write('B/z.md', 'z')
    await store.delete('A')
    expect((await store.list('', { recursive: true })).map((e) => e.path)).toEqual(['B', 'B/z.md'])
    await store.clear()
    expect(await store.list()).toEqual([])
  })
})

describe('importFiles', () => {
  test('adds new files, skips unchanged ones and replaces changed ones as updated', async () => {
    const store = createMemoryStore()
    const first = await importFiles(store, [source('Course/a.md', 'aaa', 1000), source('Course/b.md', 'bbb', 1000)])
    expect(first).toEqual({ added: ['Course/a.md', 'Course/b.md'], updated: [], skipped: [], refused: [] })

    const second = await importFiles(store, [
      source('Course/a.md', 'aaa', 1000), // unchanged
      source('Course/b.md', 'bbb', 2000), // same size, newer
      source('Course/c.md', 'ccc', 1000), // new
    ])
    expect(second).toEqual({ added: ['Course/c.md'], updated: ['Course/b.md'], skipped: ['Course/a.md'], refused: [] })

    const third = await importFiles(store, [source('Course/a.md', 'aaaa', 1000)]) // same time, different size
    expect(third.updated).toEqual(['Course/a.md'])
    expect(await store.readText('Course/a.md')).toBe('aaaa')
    expect((await store.stat('Course/b.md'))?.lastModified).toBe(2000)
  })

  test('refuses reserved folders, invalid paths and folder collisions without writing', async () => {
    const store = createMemoryStore()
    await ensureReservedFolders(store)
    await store.write('Outputs/answer.md', 'from the agent')
    await store.mkdir('Course/dir')

    const result = await importFiles(store, [
      source('Outputs/answer.md', 'overwrite attempt'),
      source('outputs/x.md', 'x'),
      source('Agent notes/learner-profile.md', 'x'),
      source('Course/../Outputs/y.md', 'x'),
      source('Course/dir', 'x'),
      source('Course/ok.md', 'x'),
    ])

    expect(result.added).toEqual(['Course/ok.md'])
    expect(result.refused).toEqual([
      { path: 'Outputs/answer.md', reason: 'reserved' },
      { path: 'outputs/x.md', reason: 'reserved' },
      { path: 'Agent notes/learner-profile.md', reason: 'reserved' },
      { path: 'Course/../Outputs/y.md', reason: 'invalid_path' },
      { path: 'Course/dir', reason: 'conflict' },
    ])
    expect(await store.readText('Outputs/answer.md')).toBe('from the agent')
    expect((await store.list('Agent notes')).length).toBe(0)
  })

  test('ensureReservedFolders creates the empty reserved folders and keeps their contents', async () => {
    const store = createMemoryStore()
    await ensureReservedFolders(store)
    await store.write('Agent notes/n.md', 'n')
    await ensureReservedFolders(store)
    expect((await store.list()).map((e) => [e.kind, e.path])).toEqual([
      ['directory', 'Agent notes'],
      ['directory', 'Outputs'],
    ])
    expect(await store.readText('Agent notes/n.md')).toBe('n')
  })

  test('ignores OS clutter files', async () => {
    const store = createMemoryStore()
    const result = await importFiles(store, [source('Course/.DS_Store', 'x'), source('Course/a.md', 'a')])
    expect(result.added).toEqual(['Course/a.md'])
    expect(await store.stat('Course/.DS_Store')).toBeNull()
  })

  test('sync puts the picked folder into the target folder', async () => {
    const store = createMemoryStore()
    await importFiles(store, [source('Course/a.md', 'a')])
    const result = await importFiles(store, intoFolder([source('Course copy/a.md', 'a'), source('Course copy/sub/b.md', 'b')], 'Course'))
    expect(result).toEqual({ added: ['Course/sub/b.md'], updated: [], skipped: ['Course/a.md'], refused: [] })
  })

  test('sourcesFromFiles uses the file name when there is no relative path', () => {
    const file = new File(['x'], 'single.md')
    expect(sourcesFromFiles([file])).toEqual([{ path: 'single.md', file }])
  })
})
