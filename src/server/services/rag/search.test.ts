// @vitest-environment node
import { Document } from '@langchain/core/documents'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { SearchSchema } from '@shared/rag'
import type { RagIndex } from '../../db/models'

const mocks = vi.hoisted(() => ({ query: vi.fn(), vectorInvoke: vi.fn() }))
vi.mock('./vectorStore', () => ({ vectorPool: { query: mocks.query }, getRetriever: () => ({ invoke: mocks.vectorInvoke }) }))
vi.mock('../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { search, SEARCH_RESULT_LIMIT } from './search'

const ragIndex = { id: 7, metadata: { name: 'Materials' } } as unknown as RagIndex

const row = (name: string) => ({ id: name, content: `content of ${name}`, metadata: { ragFileName: `${name}.pdf` } })

beforeEach(() => {
  mocks.query.mockReset().mockResolvedValue({ rows: [] })
  mocks.vectorInvoke.mockReset().mockResolvedValue([])
})

describe('search', () => {
  test('runs the vector search and the three full-text searches on the index', async () => {
    await search(ragIndex, SearchSchema.parse({ query: 'exam date' }))

    expect(mocks.vectorInvoke).toHaveBeenCalledTimes(1)
    expect(mocks.query.mock.calls.map(([, params]) => params.slice(0, 2))).toEqual([
      ['exam date', 'ragIndex-7'],
      ['exam date', 'ragIndex-7'],
      ['exam | date', 'ragIndex-7'],
    ])
  })

  test('a chunk found by several searches comes once, before chunks found by one', async () => {
    mocks.vectorInvoke.mockResolvedValue([new Document({ id: 'semantic', pageContent: 'content of semantic', metadata: { ragFileName: 'semantic.pdf' } })])
    mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('phraseto_tsquery') ? [row('exact')] : [row('loose'), row('exact')] }))

    const { results, timings } = await search(ragIndex, SearchSchema.parse({ query: 'exam date' }))

    expect(results.map((chunk) => chunk.metadata.ragFileName)).toEqual(['exact.pdf', 'loose.pdf', 'semantic.pdf'])
    expect(results[0]).toEqual({ id: 'exact', content: 'content of exact', metadata: { ragFileName: 'exact.pdf' } })
    expect(timings.search).toEqual(expect.any(Number))
  })

  test('returns at most SEARCH_RESULT_LIMIT chunks', async () => {
    mocks.query.mockResolvedValue({ rows: Array.from({ length: 10 }, (_, i) => row(`file${i}`)) })

    const { results } = await search(ragIndex, SearchSchema.parse({ query: 'exam' }))

    expect(results).toHaveLength(SEARCH_RESULT_LIMIT)
  })

  test('only the chosen kinds of search are run', async () => {
    await search(ragIndex, SearchSchema.parse({ query: 'exam', fullText: false }))
    expect(mocks.query).not.toHaveBeenCalled()
    expect(mocks.vectorInvoke).toHaveBeenCalledTimes(1)

    expect(await search(ragIndex, SearchSchema.parse({ query: 'exam', fullText: false, vector: false }))).toEqual({ results: [], timings: {} })
  })
})
