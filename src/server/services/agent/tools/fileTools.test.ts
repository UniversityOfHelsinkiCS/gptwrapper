// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'
import type { ToolPart } from '@shared/agentChat'
import { FILE_TOOL_NAMES } from '@shared/fileTools'

vi.mock('../../rag/search', () => ({ search: vi.fn() }))
vi.mock('../../langchain/fileSearchResultsStore', () => ({ ToolResultStore: { saveResults: vi.fn() } }))
vi.mock('../../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { fileTools, fileToolsFor, parseAttachedFolders } from './fileTools'
import { listAddableTools, validatePromptTools } from './promptTools'
import { createTools, getToolModule, historyMessageToText, withToolInstructions } from './registry'
import { ToolError } from './types'

const part = (name: string, input: unknown, result: unknown, status: ToolPart['status'] = 'ok'): ToolPart => ({
  type: 'tool',
  callId: `call_${name}`,
  name,
  input,
  status,
  result,
})

const FILE_CONTENT = 'Entropy always increases. This sentence is far into the file and must never reach the history.'

describe('file tool modules', () => {
  test('are client-executed, experimental and in the registry', () => {
    expect(fileTools.map((m) => m.name)).toEqual([...FILE_TOOL_NAMES])
    for (const name of FILE_TOOL_NAMES) {
      expect(getToolModule(name)).toMatchObject({ executor: 'client', stage: 'experimental', kind: 'tool' })
    }
  })

  test('are not prompt options: not listed for the prompt editor, and refused on save', () => {
    const listed = listAddableTools({ isAdmin: true }).map((tool) => tool.name)
    for (const name of FILE_TOOL_NAMES) expect(listed).not.toContain(name)
    expect(() => validatePromptTools({ isAdmin: true }, [{ name: 'read_file' }])).toThrow('Unknown tool: read_file')
  })

  test('are enabled only with attached folders', () => {
    expect(fileToolsFor([])).toEqual([])
    expect(fileToolsFor(['Course notes'])).toEqual(FILE_TOOL_NAMES.map((name) => ({ name, config: { attachedFolders: ['Course notes'] } })))
  })

  test('instructions name the attached folders once, with Outputs and Agent notes', () => {
    const text = withToolInstructions('Be helpful.', fileToolsFor(['Course notes', 'Thesis']))
    expect(text.match(/## Tool: /g)).toHaveLength(1)
    expect(text).toContain('## Tool: ls')
    expect(text).toContain('- "Course notes": attached to this chat')
    expect(text).toContain('- "Thesis": attached to this chat')
    expect(text).toContain('- "Outputs"')
    expect(text).toContain('- "Agent notes"')
  })

  test('a tool calls the browser with its call id and returns content and artifact', async () => {
    const callClientTool = vi.fn(async () => ({ status: 'ok' as const, content: 'listing', artifact: { tool: 'ls', path: '', entries: [], total: 0 } }))
    const signal = new AbortController().signal
    const [ls] = createTools(fileToolsFor(['Course notes']).slice(0, 1), { user: {} as never, course: null, model: 'mock', signal, callClientTool })

    const message = await ls.invoke({ type: 'tool_call', id: 'call_9', name: 'ls', args: { path: 'Course notes' } })
    expect(callClientTool).toHaveBeenCalledWith({ callId: 'call_9', name: 'ls', input: { path: 'Course notes' } }, signal)
    expect(message).toMatchObject({ content: 'listing', artifact: { tool: 'ls' } })
  })

  test('a browser error is a ToolError the model reads, and the content never becomes the artifact', async () => {
    const results = [
      { status: 'error' as const, error: '"Secret" is outside the folders you can see.' },
      { status: 'ok' as const, content: FILE_CONTENT },
    ]
    const callClientTool = vi.fn(async () => results.shift()!)
    const [readFile] = createTools([{ name: 'read_file', config: { attachedFolders: ['A'] } }], {
      user: {} as never,
      course: null,
      model: 'mock',
      signal: new AbortController().signal,
      callClientTool,
    })
    const call = { type: 'tool_call' as const, id: 'call_1', name: 'read_file', args: { path: 'Secret/x.md' } }

    await expect(readFile.invoke(call)).rejects.toThrow(ToolError)
    const message = await readFile.invoke(call)
    expect(message).toMatchObject({ content: FILE_CONTENT, artifact: { tool: 'read_file' } })
  })

  test('without a browser to call, the tool fails with a ToolError', async () => {
    const [ls] = createTools(fileToolsFor(['A']).slice(0, 1), { user: {} as never, course: null, model: 'mock', signal: new AbortController().signal })
    await expect(ls.invoke({ type: 'tool_call', id: 'c', name: 'ls', args: { path: '' } })).rejects.toThrow('My files is not available')
  })
})

describe('file tool summarizeForHistory', () => {
  test('summarises each tool from its summary, with short excerpts and no file contents', () => {
    const text = historyMessageToText({
      role: 'assistant',
      parts: [
        part('ls', { path: 'Course notes' }, { tool: 'ls', path: 'Course notes', entries: ['syllabus.md', 'week1/'], total: 2 }),
        part('glob', { pattern: '**/*.md' }, { tool: 'glob', pattern: '**/*.md', matches: ['Course notes/syllabus.md'], total: 1 }),
        part(
          'grep',
          { pattern: 'entropy' },
          {
            tool: 'grep',
            pattern: 'entropy',
            path: '',
            matches: [{ path: 'Course notes/week1/lecture.md', line: 2, text: 'Entropy always increases.' }],
            total: 1,
          },
        ),
        part(
          'read_file',
          { path: 'Course notes/week1/lecture.md' },
          { tool: 'read_file', path: 'Course notes/week1/lecture.md', startLine: 1, endLine: 3, totalLines: 3, excerpt: 'Lecture 1 Entropy always…' },
        ),
        { type: 'text', text: 'Entropy increases (Course notes/week1/lecture.md, line 2).' },
      ],
    })
    expect(text).toBe(
      [
        '[Listed "Course notes" in My files (2 entries): "syllabus.md", "week1/".]',
        '[Found 1 files in My files matching "**/*.md": "Course notes/syllabus.md".]',
        '[Searched for "entropy" in "(all folders)" in My files: 1 matching lines, for example:\n- Course notes/week1/lecture.md:2: "Entropy always increases."\n]',
        '[Read "Course notes/week1/lecture.md" from My files, lines 1-3 of 3. It starts: "Lecture 1 Entropy always…". Read it again for the content.]',
        'Entropy increases (Course notes/week1/lecture.md, line 2).',
      ].join('\n\n'),
    )
  })

  test('says how many more entries there were and when nothing was found', () => {
    const ls = getToolModule('ls')!
    const glob = getToolModule('glob')!
    if (ls.kind !== 'tool' || glob.kind !== 'tool') throw new Error('not tools')
    expect(ls.summarizeForHistory(part('ls', { path: '' }, { tool: 'ls', path: '', entries: ['a/'], total: 4 }))).toBe(
      '[Listed "(My files)" in My files (4 entries): "a/", and 3 more.]',
    )
    expect(glob.summarizeForHistory(part('glob', { pattern: '*.x' }, { tool: 'glob', pattern: '*.x', matches: [], total: 0 }))).toBe(
      '[Found no files in My files matching "*.x".]',
    )
  })

  test('a failed call says what was tried and why it failed', () => {
    const readFile = getToolModule('read_file')!
    if (readFile.kind !== 'tool') throw new Error('not a tool')
    expect(readFile.summarizeForHistory(part('read_file', { path: 'Secret/x.md' }, 'Error: "Secret/x.md" is outside the folders you can see.', 'error'))).toBe(
      '[Tried to read "Secret/x.md" in My files, but it failed: Error: "Secret/x.md" is outside the folders you can see.]',
    )
  })

  test('a result that is not a summary (for example the content itself) is not repeated', () => {
    const readFile = getToolModule('read_file')!
    if (readFile.kind !== 'tool') throw new Error('not a tool')
    const summary = readFile.summarizeForHistory(part('read_file', { path: 'A/x.md' }, FILE_CONTENT))
    expect(summary).toBe('[Used read_file to read "A/x.md" in My files.]')
  })
})

describe('parseAttachedFolders', () => {
  test('keeps unique top-level folder names', () => {
    expect(parseAttachedFolders(['Course notes', 'Thesis', 'Course notes'])).toEqual(['Course notes', 'Thesis'])
  })

  test('drops paths, dots, reserved names in any case and non-strings', () => {
    expect(parseAttachedFolders(['a/b', '..', '.', '', 'x\\y', 'OUTPUTS', 'agent notes', 'Ok', 3, null, 'a\u0000b'])).toEqual(['Ok'])
    expect(parseAttachedFolders('Course notes')).toEqual([])
  })

  test('keeps at most 20', () => {
    expect(parseAttachedFolders(Array.from({ length: 30 }, (_, i) => `f${i}`))).toHaveLength(20)
  })
})
