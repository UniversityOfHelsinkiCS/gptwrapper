// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.hoisted(() => vi.fn())
vi.mock('./vectorStore', () => ({ vectorPool: { query }, getRetriever: vi.fn() }))
vi.mock('../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { FT_SEARCH_LIMIT, ftSearchSql, getFTSearchRetriever, queryWords, toFTQueryText, toOrQuery } from './retrievers'

beforeEach(() => {
  query.mockReset()
})

describe('full-text query text', () => {
  test('the words of a query are its runs of letters and digits, in any language', () => {
    expect(queryWords('Milloin tentti pidetään? (kevät 2026)')).toEqual(['Milloin', 'tentti', 'pidetään', 'kevät', '2026'])
    expect(queryWords('x-ray "diffraction" | !NMR')).toEqual(['x', 'ray', 'diffraction', 'NMR'])
    expect(queryWords(' ?! ')).toEqual([])
  })

  test('the or query matches any word and has no operators from the query itself', () => {
    expect(toOrQuery('exam & date | -hall:*')).toBe('exam | date | hall')
  })

  test('phrase and and queries keep the text, or queries join the words', () => {
    expect(toFTQueryText('phrase', '  exam \n date ')).toBe('exam date')
    expect(toFTQueryText('and', 'exam date')).toBe('exam date')
    expect(toFTQueryText('or', 'exam date')).toBe('exam | date')
  })

  test('a query without words searches for nothing', () => {
    expect(toFTQueryText('phrase', '?!')).toBe('')
    expect(toFTQueryText('or', '')).toBe('')
  })
})

describe('full-text retriever', () => {
  test('each mode uses its own tsquery function, ranks the matches and limits them', () => {
    expect(ftSearchSql('phrase')).toContain("phraseto_tsquery('simple', $1::text)")
    expect(ftSearchSql('and')).toContain("plainto_tsquery('simple', $1::text)")
    expect(ftSearchSql('or')).toContain("to_tsquery('simple', $1::text)")
    for (const mode of ['phrase', 'and', 'or'] as const) {
      expect(ftSearchSql(mode)).toContain("d.metadata->>'ragIndex' = $2")
      expect(ftSearchSql(mode)).toMatch(/ORDER BY ts_rank_cd\(d\.fts_index, query\) DESC, d\.id\s+LIMIT \$3/)
    }
  })

  test('searches the chunks of its index and returns them as documents with their ids', async () => {
    query.mockResolvedValue({ rows: [{ id: 'chunk-1', content: 'The exam is on 12 December.', metadata: { ragFileName: 'syllabus.pdf' } }] })

    const documents = await getFTSearchRetriever('ragIndex-7', 'or').invoke('exam date?')

    expect(query).toHaveBeenCalledWith(ftSearchSql('or'), ['exam | date', 'ragIndex-7', FT_SEARCH_LIMIT])
    expect(documents).toEqual([
      expect.objectContaining({ id: 'chunk-1', pageContent: 'The exam is on 12 December.', metadata: { ragFileName: 'syllabus.pdf' } }),
    ])
  })

  test('does not query the database for a query without words', async () => {
    expect(await getFTSearchRetriever('ragIndex-7', 'and').invoke('?!')).toEqual([])
    expect(query).not.toHaveBeenCalled()
  })

  test('a failed query gives no results instead of failing the whole search', async () => {
    query.mockRejectedValue(new Error('connection lost'))
    expect(await getFTSearchRetriever('ragIndex-7', 'phrase').invoke('exam date')).toEqual([])
  })
})
