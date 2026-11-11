import { strToU8, zipSync, type Zippable } from 'fflate'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryStore } from './memoryStore'
import { exportAgentNotes, importAgentNotes, NOTES_ZIP_LIMITS, NotesZipError, notesEntryPath, readAgentNotesZip } from './notesZip'
import type { MyFilesStore } from './store'

const zipOf = (files: Zippable) => zipSync(files)

const textFiles = async (store: MyFilesStore, dir: string) => {
  const entries = await store.list(dir, { recursive: true })
  return Object.fromEntries(await Promise.all(entries.filter((e) => e.kind === 'file').map(async (e) => [e.path, await store.readText(e.path)])))
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    if (error instanceof NotesZipError) return error.code
    throw error
  }
  throw new Error('Expected a NotesZipError')
}

describe('notesEntryPath', () => {
  test.each([
    ['Agent notes/', null],
    ['Agent notes/learner-profile.md', 'Agent notes/learner-profile.md'],
    ['Agent notes/topics/week1.md', 'Agent notes/topics/week1.md'],
    ['./Agent notes/a.md', 'Agent notes/a.md'],
  ])('%j is %j', (name, expected) => {
    expect(notesEntryPath(name)).toBe(expected)
  })

  test.each([
    '../evil.md',
    'Agent notes/../evil.md',
    'Agent notes/../../etc/passwd',
    '/Agent notes/a.md',
    '/etc/passwd',
    'C:/Agent notes/a.md',
    'Agent notes\\a.md',
    '..\\evil.md',
    'Outputs/a.md',
    'agent notes/a.md',
    'a.md',
  ])('%j is refused', (name) => {
    expect(() => notesEntryPath(name)).toThrow(NotesZipError)
  })
})

describe('Agent notes zip', () => {
  let store: MyFilesStore

  beforeEach(async () => {
    store = createMemoryStore()
    await store.write('Course notes/syllabus.md', 'Not a note.')
    await store.write('Outputs/plan.md', 'Not a note either.')
    await store.write('Agent notes/learner-profile.md', 'Goal: pass the exam.\n')
    await store.write('Agent notes/topics/entropy.md', 'Understands the second law.')
    await store.write('Agent notes/learning-graph.json', '{"concepts":[]}')
    await store.write('Agent notes/bytes.bin', new Uint8Array([0, 1, 2, 255]))
  })

  test('export and import round-trip, and import replaces the folder', async () => {
    const before = await textFiles(store, 'Agent notes')
    const zip = await exportAgentNotes(store)
    expect(zip.type).toBe('application/zip')

    await store.write('Agent notes/written-later.md', 'Gone after the import.')
    await store.delete('Agent notes/topics')

    expect(await importAgentNotes(store, zip)).toEqual({ files: 4 })
    expect(await textFiles(store, 'Agent notes')).toEqual(before)
    expect([...(await store.readBytes('Agent notes/bytes.bin'))]).toEqual([0, 1, 2, 255])
    // Nothing outside Agent notes was exported or changed.
    expect(await store.readText('Course notes/syllabus.md')).toBe('Not a note.')
    expect(await store.readText('Outputs/plan.md')).toBe('Not a note either.')

    const exported = await readAgentNotesZip(zip)
    expect(exported.map((file) => file.path)).not.toContain('Outputs/plan.md')
  })

  test('the zip of an empty folder imports as an error, not as deleting the notes', async () => {
    const empty = createMemoryStore()
    await empty.mkdir('Agent notes')
    expect(await codeOf(importAgentNotes(store, await exportAgentNotes(empty)))).toBe('empty')
    expect(await store.readText('Agent notes/learner-profile.md')).toBe('Goal: pass the exam.\n')
  })

  test.each([['../evil.md'], ['Agent notes/../../evil.md'], ['/evil.md'], ['Agent notes\\..\\evil.md'], ['Outputs/fake.md'], ['Course notes/syllabus.md']])(
    'a zip with %j is refused as a whole and nothing is written',
    async (name) => {
      const zip = zipOf({ 'Agent notes/fine.md': strToU8('fine'), [name]: strToU8('evil') })
      const before = await textFiles(store, '')
      const error = await importAgentNotes(store, zip).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(NotesZipError)
      expect((error as NotesZipError).code).toBe('invalid_path')
      expect((error as NotesZipError).path).toBe(name)
      expect(await textFiles(store, '')).toEqual(before)
    },
  )

  test('folder entries and macOS clutter are skipped', async () => {
    const zip = zipOf({
      'Agent notes/': new Uint8Array(0),
      'Agent notes/a.md': strToU8('a'),
      'Agent notes/.DS_Store': strToU8('x'),
      '__MACOSX/Agent notes/._a.md': strToU8('x'),
    })
    expect((await readAgentNotesZip(zip)).map((file) => file.path)).toEqual(['Agent notes/a.md'])
  })

  test('caps the number of files and the total size', async () => {
    const limits = { ...NOTES_ZIP_LIMITS, files: 2, totalBytes: 1000 }
    const many = zipOf({ 'Agent notes/a.md': strToU8('a'), 'Agent notes/b.md': strToU8('b'), 'Agent notes/c.md': strToU8('c') })
    expect(await codeOf(readAgentNotesZip(many, limits))).toBe('too_many_files')

    // Compresses to almost nothing: the uncompressed size is what counts.
    const large = zipOf({ 'Agent notes/a.md': strToU8('x'.repeat(10_000)) })
    expect(large.byteLength).toBeLessThan(1000)
    expect(await codeOf(readAgentNotesZip(large, limits))).toBe('too_large')

    const zipTooLarge = zipOf({ 'Agent notes/a.md': strToU8('a') })
    expect(await codeOf(readAgentNotesZip(zipTooLarge, { ...limits, zipBytes: 10 }))).toBe('too_large')
  })

  test('a zip whose declared size lies is still capped', async () => {
    const zip = zipOf({ 'Agent notes/a.md': [strToU8('x'.repeat(1000)), { level: 0 }] })
    // Rewrite the declared uncompressed size (central directory and local header) to 1 byte.
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
    for (let i = 0; i < zip.length - 4; i++) {
      const signature = view.getUint32(i, true)
      if (signature === 0x04034b50) view.setUint32(i + 22, 1, true)
      if (signature === 0x02014b50) view.setUint32(i + 24, 1, true)
    }
    const result = await readAgentNotesZip(zip, { ...NOTES_ZIP_LIMITS, totalBytes: 100 }).then(
      (files) => files.reduce((sum, file) => sum + file.bytes.byteLength, 0),
      (error: unknown) => (error as NotesZipError).code,
    )
    // Either refused, or cut to the declared size: never 1000 bytes written.
    expect(result === 'too_large' || result === 'invalid_zip' || (typeof result === 'number' && result <= 100)).toBe(true)
  })

  test('a file that is also a folder in the zip is refused', async () => {
    const zip = zipOf({ 'Agent notes/a': strToU8('file'), 'Agent notes/a/b.md': strToU8('inside') })
    expect(await codeOf(readAgentNotesZip(zip))).toBe('invalid_path')
  })

  test('a file that is not a zip is refused', async () => {
    expect(await codeOf(importAgentNotes(store, strToU8('not a zip')))).toBe('invalid_zip')
    expect(await store.readText('Agent notes/learner-profile.md')).toBe('Goal: pass the exam.\n')
  })
})
