import { beforeEach, describe, expect, test } from 'vitest'
import type { ClientToolResult } from '../../../shared/chatSocket'
import { FILE_TOOL_LIMITS } from '../../../shared/fileTools'
import { executeFileTool, FileToolError, globToRegExp, resolveAgentPath, visibleFolders } from './agentTools'
import { createMemoryStore } from './memoryStore'
import type { MyFilesStore } from './store'

const FOLDERS = visibleFolders(['Course notes'])

const okContent = (result: ClientToolResult) => {
  if (result.status !== 'ok') throw new Error(`Expected ok, got: ${result.error}`)
  return result.content
}

const errorOf = (result: ClientToolResult) => {
  if (result.status !== 'error') throw new Error(`Expected an error, got: ${result.content}`)
  return result.error
}

describe('visibleFolders', () => {
  test('are the attached folders, then Outputs and Agent notes', () => {
    expect(visibleFolders(['Course notes', 'Thesis'])).toEqual(['Course notes', 'Thesis', 'Outputs', 'Agent notes'])
  })

  test('drop reserved names in any case, nested paths, dots and duplicates', () => {
    expect(visibleFolders(['outputs', 'AGENT NOTES', 'a/b', '..', '.', '', 'x\\y', '/abs', 'Ok', 'Ok'])).toEqual(['Ok', 'Outputs', 'Agent notes'])
  })
})

describe('resolveAgentPath', () => {
  test.each([
    ['Course notes', 'Course notes'],
    ['Course notes/week1/lecture.md', 'Course notes/week1/lecture.md'],
    ['Course notes/./week1//lecture.md/', 'Course notes/week1/lecture.md'],
    ['./Course notes/syllabus.md', 'Course notes/syllabus.md'],
    ['Outputs/summary.md', 'Outputs/summary.md'],
    ['Agent notes/learner-profile.md', 'Agent notes/learner-profile.md'],
    ['', ''],
    ['.', ''],
  ])('resolves %j to %j', (path, expected) => {
    expect(resolveAgentPath(path, FOLDERS)).toBe(expected)
  })

  test.each([
    // '..' in any position, also ones that would end up back inside
    '..',
    '../Course notes',
    'Course notes/..',
    'Course notes/../Secret/file.md',
    'Course notes/week1/../../Secret',
    'Outputs/../Secret',
    // absolute paths
    '/Course notes/syllabus.md',
    '/',
    '\\Course notes',
    'C:/Course notes',
    'c:\\Users',
    '~/Course notes',
    // backslashes and control characters
    'Course notes\\..\\Secret',
    'Course notes/a\u0000b',
    // folders that are not attached, and case tricks against attached and reserved folders
    'Secret/file.md',
    'course notes/syllabus.md',
    'COURSE NOTES',
    'outputs/x.md',
    'OUTPUTS',
    'agent notes/x.md',
    'Agent Notes/x.md',
    'Course notes2/x.md',
    'Course',
  ])('refuses %j', (path) => {
    expect(() => resolveAgentPath(path, FOLDERS)).toThrow(FileToolError)
  })

  test('refuses non-strings', () => {
    expect(() => resolveAgentPath(undefined, FOLDERS)).toThrow(FileToolError)
    expect(() => resolveAgentPath(['Course notes'], FOLDERS)).toThrow(FileToolError)
  })
})

describe('globToRegExp', () => {
  test.each([
    ['**/*.md', 'Course notes/week1/lecture.md', true],
    ['**/*.md', 'Course notes/syllabus.md', true],
    ['Course notes/*.md', 'Course notes/syllabus.md', true],
    ['Course notes/*.md', 'Course notes/week1/lecture.md', false],
    ['Course notes/**', 'Course notes/week1/lecture.md', true],
    ['**/week?/*', 'Course notes/week1/lecture.md', true],
    ['**/*.{md,txt}', 'Course notes/a.txt', true],
    ['**/*.{md,txt}', 'Course notes/a.pdf', false],
    ['**/a.md', 'Course notes/xa.md', false],
    ['**/(a).md', 'X/(a).md', true],
  ])('%j matching %j is %s', (pattern, path, expected) => {
    expect(globToRegExp(pattern).test(path)).toBe(expected)
  })
})

describe('executeFileTool', () => {
  let store: MyFilesStore
  const run = (name: string, input: unknown, attached = ['Course notes']) => executeFileTool(store, attached, name, input)

  beforeEach(async () => {
    store = createMemoryStore()
    await store.write('Course notes/syllabus.md', '# Syllabus\nThe exam is on Friday.\n')
    await store.write('Course notes/week1/lecture.md', 'Lecture 1\nEntropy always increases.\nThe end.')
    await store.write('Course notes/slides.pdf', '%PDF-1.4')
    await store.write('Course notes/image.png', new Uint8Array([0x89, 0x50, 0, 0, 1]))
    await store.write('Secret/diary.md', 'The exam answers are 42.')
    await store.write('Outputs/summary.md', 'A summary for you.')
    await store.mkdir('Agent notes')
  })

  test('refuses unknown tools, invalid input and a missing store', async () => {
    expect(errorOf(await run('write_file', { path: 'Outputs/x.md' }))).toContain('Unknown tool')
    expect(errorOf(await run('read_file', { path: 1 }))).toContain('Invalid input for read_file')
    expect(errorOf(await executeFileTool(null, ['Course notes'], 'ls', { path: '' }))).toContain('cannot store My files')
  })

  describe('ls', () => {
    test('of the root lists the visible folders that exist', async () => {
      const result = await run('ls', { path: '' })
      expect(okContent(result).split('\n').slice(1)).toEqual(['Course notes/', 'Outputs/', 'Agent notes/'])
      expect(result).toMatchObject({ artifact: { tool: 'ls', path: '', total: 3 } })
      expect(okContent(result)).not.toContain('Secret')
    })

    test('lists a folder with full paths and sizes', async () => {
      const result = await run('ls', { path: 'Course notes' })
      expect(okContent(result)).toBe(
        [
          '"Course notes" contains 4 entries:',
          'Course notes/image.png (5 bytes)',
          'Course notes/slides.pdf (8 bytes)',
          'Course notes/syllabus.md (34 bytes)',
          'Course notes/week1/',
        ].join('\n'),
      )
      expect(result).toMatchObject({ artifact: { entries: ['image.png', 'slides.pdf', 'syllabus.md', 'week1/'], total: 4 } })
    })

    test('refuses folders outside the visible ones, and ".."', async () => {
      expect(errorOf(await run('ls', { path: 'Secret' }))).toContain('outside the folders you can see')
      expect(errorOf(await run('ls', { path: 'Course notes/../Secret' }))).toContain('".." and backslashes are not allowed')
      expect(errorOf(await run('ls', { path: '/' }))).toContain('absolute path')
    })

    test('reports a missing folder and a file', async () => {
      expect(errorOf(await run('ls', { path: 'Course notes/week2' }))).toBe('"Course notes/week2" was not found in My files.')
      expect(errorOf(await run('ls', { path: 'Course notes/syllabus.md' }))).toContain('is a file')
    })

    test('an attached folder that is no longer in My files is not listed', async () => {
      const result = await run('ls', { path: '' }, ['Course notes', 'Removed'])
      expect(okContent(result)).not.toContain('Removed')
    })
  })

  describe('read_file', () => {
    test('reads a text file with line numbers', async () => {
      const result = await run('read_file', { path: 'Course notes/week1/lecture.md' })
      expect(okContent(result)).toBe(
        ['"Course notes/week1/lecture.md", lines 1-3 of 3:', '1\tLecture 1', '2\tEntropy always increases.', '3\tThe end.'].join('\n'),
      )
      expect(result).toMatchObject({
        artifact: {
          tool: 'read_file',
          path: 'Course notes/week1/lecture.md',
          startLine: 1,
          endLine: 3,
          totalLines: 3,
          excerpt: 'Lecture 1 Entropy always increases. The end.',
        },
      })
    })

    test('reads a line range and says how to read further', async () => {
      const content = okContent(await run('read_file', { path: 'Course notes/week1/lecture.md', offset: 2, limit: 1 }))
      expect(content).toBe(
        ['"Course notes/week1/lecture.md", lines 2-2 of 3:', '2\tEntropy always increases.', '[Showing lines 2-2 of 3. Use offset 3 to read further.]'].join(
          '\n',
        ),
      )
      expect(errorOf(await run('read_file', { path: 'Course notes/week1/lecture.md', offset: 9 }))).toContain('has only 3 lines')
    })

    test('caps the result size and cuts long lines', async () => {
      const longLine = 'x'.repeat(FILE_TOOL_LIMITS.lineChars + 50)
      await store.write('Course notes/big.txt', Array.from({ length: 200 }, (_, i) => `${i + 1} ${longLine}`).join('\n'))
      const result = await run('read_file', { path: 'Course notes/big.txt' })
      const content = okContent(result)
      expect(content.length).toBeLessThanOrEqual(FILE_TOOL_LIMITS.readChars + 200)
      expect(content).toContain('… [line cut]')
      expect(content).toMatch(/Use offset \d+ to read further/)
      expect(result).toMatchObject({ artifact: { startLine: 1, totalLines: 200 } })
      if (result.status === 'ok') expect(JSON.stringify(result.artifact).length).toBeLessThan(500)
    })

    test('refuses PDFs, binary files, folders and too large files', async () => {
      expect(errorOf(await run('read_file', { path: 'Course notes/slides.pdf' }))).toContain('PDF files cannot be read yet')
      expect(errorOf(await run('read_file', { path: 'Course notes/image.png' }))).toContain('binary file')
      expect(errorOf(await run('read_file', { path: 'Course notes/week1' }))).toContain('is a folder')
      await store.write('Course notes/huge.txt', new Uint8Array(FILE_TOOL_LIMITS.fileBytes + 1).fill(65))
      expect(errorOf(await run('read_file', { path: 'Course notes/huge.txt' }))).toContain('too large')
    })

    test('reads Outputs and Agent notes, but nothing else outside the attached folders', async () => {
      expect(okContent(await run('read_file', { path: 'Outputs/summary.md' }))).toContain('A summary for you.')
      expect(errorOf(await run('read_file', { path: 'Secret/diary.md' }))).toContain('outside the folders you can see')
      expect(errorOf(await run('read_file', { path: 'Course notes/../Secret/diary.md' }))).toContain('not a valid path')
      expect(errorOf(await run('read_file', { path: '/Secret/diary.md' }))).toContain('absolute path')
      // My files is case-sensitive: an attached "secret" is not the folder "Secret"
      expect(errorOf(await run('read_file', { path: 'secret/diary.md' }, ['secret']))).toBe('"secret/diary.md" was not found in My files.')
    })

    test('an empty file', async () => {
      await store.write('Course notes/empty.md', '')
      expect(okContent(await run('read_file', { path: 'Course notes/empty.md' }))).toBe('"Course notes/empty.md" is empty.')
    })
  })

  describe('glob', () => {
    test('matches files in the visible folders only', async () => {
      const result = await run('glob', { pattern: '**/*.md' })
      expect(okContent(result).split('\n')).toEqual([
        '3 files match "**/*.md":',
        'Course notes/syllabus.md',
        'Course notes/week1/lecture.md',
        'Outputs/summary.md',
      ])
      expect(result).toMatchObject({ artifact: { tool: 'glob', pattern: '**/*.md', total: 3 } })
    })

    test('a pattern naming a hidden folder finds nothing', async () => {
      expect(okContent(await run('glob', { pattern: 'Secret/**' }))).toContain('No files match')
    })

    test('refuses absolute patterns and ".."', async () => {
      expect(errorOf(await run('glob', { pattern: '/**/*.md' }))).toContain('absolute')
      expect(errorOf(await run('glob', { pattern: 'Course notes/../Secret/*' }))).toContain('".."')
      expect(errorOf(await run('glob', { pattern: '{a,b' }))).toContain('unclosed')
    })
  })

  describe('grep', () => {
    test('finds matching lines with file and line number', async () => {
      const result = await run('grep', { pattern: 'exam' })
      expect(okContent(result)).toBe(
        [
          'Lines matching "exam" in the folders you can see:',
          'Course notes/syllabus.md:2: The exam is on Friday.',
          '[Not searched (PDF, binary or too large): Course notes/image.png, Course notes/slides.pdf]',
        ].join('\n'),
      )
      expect(okContent(result)).not.toContain('42')
      expect(result).toMatchObject({ artifact: { tool: 'grep', total: 1, matches: [{ path: 'Course notes/syllabus.md', line: 2 }] } })
    })

    test('searches one folder or file, case-insensitively if asked', async () => {
      expect(okContent(await run('grep', { pattern: 'ENTROPY', path: 'Course notes/week1', ignore_case: true }))).toContain('Course notes/week1/lecture.md:2:')
      expect(okContent(await run('grep', { pattern: 'ENTROPY', path: 'Course notes/week1' }))).toContain('No lines match')
      expect(okContent(await run('grep', { pattern: 'Friday', path: 'Course notes/syllabus.md' }))).toContain('syllabus.md:2:')
    })

    test('caps the matches', async () => {
      await store.write('Course notes/many.txt', Array.from({ length: FILE_TOOL_LIMITS.grepMatches + 20 }, () => 'match').join('\n'))
      const result = await run('grep', { pattern: 'match', path: 'Course notes/many.txt' })
      expect(okContent(result)).toContain(`Only the first ${FILE_TOOL_LIMITS.grepMatches} matches are shown`)
      if (result.status === 'ok') expect((result.artifact as { matches: unknown[] }).matches).toHaveLength(10)
    })

    test('refuses paths outside the visible folders and invalid patterns', async () => {
      expect(errorOf(await run('grep', { pattern: 'exam', path: 'Secret' }))).toContain('outside the folders')
      expect(errorOf(await run('grep', { pattern: 'exam', path: '../Secret' }))).toContain('not a valid path')
      expect(errorOf(await run('grep', { pattern: '(' }))).toContain('not a valid JavaScript regular expression')
    })
  })
})
