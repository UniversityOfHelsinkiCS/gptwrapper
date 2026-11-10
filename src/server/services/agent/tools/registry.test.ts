// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'
import type { ToolPart } from '@shared/agentChat'

vi.mock('../../rag/search', () => ({ search: vi.fn() }))
vi.mock('../../langchain/fileSearchResultsStore', () => ({ ToolResultStore: { saveResults: vi.fn() } }))
vi.mock('../../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { documentSearch, toDocumentSearchResult } from './documentSearch'
import { historyMessageToText, withToolInstructions } from './registry'

const searchPart = (overrides: Partial<ToolPart> = {}): ToolPart => ({
  type: 'tool',
  callId: 'call_1',
  name: 'document_search',
  input: { query: 'exam date' },
  status: 'ok',
  result: { files: [{ fileName: 'syllabus.pdf', score: 0.9, excerpt: 'The exam is on 12 December.' }, { fileName: 'slides.pdf' }] },
  ...overrides,
})

describe('document_search summarizeForHistory', () => {
  test('lists the files found with their excerpts', () => {
    expect(documentSearch.summarizeForHistory(searchPart())).toBe(
      ['[Searched the course materials for "exam date". Results (excerpts):', '- syllabus.pdf: "The exam is on 12 December."', '- slides.pdf', ']'].join('\n'),
    )
  })

  test('says when nothing was found', () => {
    expect(documentSearch.summarizeForHistory(searchPart({ result: { files: [] } }))).toBe('[Searched the course materials for "exam date": nothing found.]')
  })

  test('says when the search failed or was interrupted', () => {
    expect(documentSearch.summarizeForHistory(searchPart({ status: 'error', result: 'boom' }))).toBe(
      '[Searched the course materials for "exam date", but the search failed.]',
    )
    expect(documentSearch.summarizeForHistory(searchPart({ status: 'running', result: undefined }))).toBe(
      '[Searched the course materials for "exam date", but the search was interrupted.]',
    )
  })

  test('the result keeps a short, single-line excerpt of each chunk', () => {
    const long = `first line\n\n${'x'.repeat(300)}`
    const { files } = toDocumentSearchResult([{ content: long, metadata: { ragFileName: 'a.pdf' }, score: 0.5 }])

    expect(files[0].fileName).toBe('a.pdf')
    expect(files[0].score).toBe(0.5)
    expect(files[0].excerpt).toMatch(/^first line x+…$/)
    expect(files[0].excerpt!.length).toBe(201)
  })
})

describe('historyMessageToText', () => {
  test('keeps text parts and replaces tool parts with their summaries, in order', () => {
    const text = historyMessageToText({
      role: 'assistant',
      parts: [{ type: 'text', text: 'Let me check.' }, searchPart({ result: { files: [] } }), { type: 'text', text: 'Not in the materials.' }],
    })

    expect(text).toBe('Let me check.\n\n[Searched the course materials for "exam date": nothing found.]\n\nNot in the materials.')
  })

  test('summarises a tool that is no longer in the registry generically', () => {
    expect(historyMessageToText({ role: 'assistant', parts: [searchPart({ name: 'retired_tool' })] })).toBe('[Used the tool retired_tool.]')
  })
})

describe('withToolInstructions', () => {
  test('appends the instructions of enabled tools after the system message', () => {
    expect(withToolInstructions('You help with essays.', [{ name: 'document_search' }])).toBe(
      `You help with essays.\n\n## Tool: document_search\n\n${documentSearch.instructions}`,
    )
  })

  test('leaves the system message alone without tools', () => {
    expect(withToolInstructions('You help with essays.', [])).toBe('You help with essays.')
  })
})
