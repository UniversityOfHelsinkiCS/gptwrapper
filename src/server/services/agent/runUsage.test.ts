// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'

vi.mock('../rag/search', () => ({ search: vi.fn() }))
vi.mock('../langchain/fileSearchResultsStore', () => ({ ToolResultStore: { saveResults: vi.fn() } }))
vi.mock('../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { PDF_READER_MODEL } from '@config'
import { READ_PDF } from '@shared/readPdf'
import { createRunUsage } from './runUsage'
import { MOCK_SUBAGENT } from './tools/mockSubagent'

const tokens = (input: number, cachedInput: number, cacheWrite: number, output: number) => ({ input, cachedInput, cacheWrite, output })

describe('createRunUsage', () => {
  test("charges main agent calls to the chat model and a subagent's calls to the subagent's own model", () => {
    const runUsage = createRunUsage('gpt-6-luna')
    runUsage.addMainCall(tokens(100, 50, 10, 20))
    runUsage.addSubagentCall(READ_PDF, tokens(1000, 0, 0, 200))
    runUsage.addSubagentCall(READ_PDF, tokens(500, 100, 0, 100))
    runUsage.addMainCall(tokens(300, 0, 0, 40))

    expect(PDF_READER_MODEL).not.toBe('gpt-6-luna')
    expect(runUsage.usage).toEqual({
      'gpt-6-luna': tokens(400, 50, 10, 60),
      [PDF_READER_MODEL]: tokens(1500, 100, 0, 300),
    })
  })

  test('a subagent in a chat with the mock model runs on the mock model', () => {
    const runUsage = createRunUsage('mock')
    runUsage.addSubagentCall(MOCK_SUBAGENT, tokens(1, 0, 0, 1))

    expect(runUsage.usage).toEqual({ mock: tokens(1, 0, 0, 1) })
  })

  test('calls of an unknown subagent are charged to the chat model', () => {
    const runUsage = createRunUsage('gpt-6-luna')
    runUsage.addSubagentCall(undefined, tokens(5, 0, 0, 5))
    runUsage.addSubagentCall('not_a_tool', tokens(5, 0, 0, 5))

    expect(runUsage.usage).toEqual({ 'gpt-6-luna': tokens(10, 0, 0, 10) })
  })

  test('is empty for a run without model calls', () => {
    expect(createRunUsage('gpt-6-luna').usage).toEqual({})
  })
})
