import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import { BaseRetriever } from '@langchain/core/retrievers'
import logger from '../../util/logger'
import { getRetriever, vectorPool } from './vectorStore'

/** Most chunks one full-text retriever returns, best first. */
export const FT_SEARCH_LIMIT = 10

/**
 * How the words of the query must occur in a chunk: next to each other in the same order, all of them anywhere,
 * or at least one of them.
 */
export type FTSearchMode = 'phrase' | 'and' | 'or'

/**
 * The Postgres function that turns the query text into a tsquery. `phraseto_tsquery` and `plainto_tsquery` take any
 * text and read no operators from it; `to_tsquery` gets the syntax built by `toOrQuery`.
 */
const TSQUERY_FUNCTIONS: Record<FTSearchMode, string> = {
  phrase: 'phraseto_tsquery',
  and: 'plainto_tsquery',
  or: 'to_tsquery',
}

/** The words of a query: runs of letters and digits in any language. Punctuation only separates them. */
export const queryWords = (query: string): string[] => query.match(/[\p{L}\p{N}]+/gu) ?? []

/** `to_tsquery` text matching any word of the query. The words have no punctuation, so they cannot be read as operators. */
export const toOrQuery = (query: string): string => queryWords(query).join(' | ')

const normalizeWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim()

/** The text given to the mode's tsquery function, '' when the query has nothing to search for. */
export const toFTQueryText = (mode: FTSearchMode, query: string): string => {
  if (queryWords(query).length === 0) return ''
  return mode === 'or' ? toOrQuery(query) : normalizeWhitespace(query)
}

/**
 * Full-text search over the chunks of one RAG index, ranked by `ts_rank_cd`. The text search configuration is
 * `simple` (no stemming or stop words), so that collections can be in any language or several.
 */
export const ftSearchSql = (mode: FTSearchMode) => `
  SELECT d.id, d.content, d.metadata
  FROM documents d, ${TSQUERY_FUNCTIONS[mode]}('simple', $1::text) query
  WHERE d.metadata->>'ragIndex' = $2 AND d.fts_index @@ query
  ORDER BY ts_rank_cd(d.fts_index, query) DESC, d.id
  LIMIT $3`

class FTSearchRetriever extends BaseRetriever {
  lc_namespace: string[] = ['currechat', 'services', 'rag', 'retrievers']

  constructor(
    private indexName: string,
    private mode: FTSearchMode,
  ) {
    super()
  }

  async _getRelevantDocuments(query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<Document[]> {
    const queryText = toFTQueryText(this.mode, query)
    if (!queryText) return []

    try {
      const { rows } = await vectorPool.query(ftSearchSql(this.mode), [queryText, this.indexName, FT_SEARCH_LIMIT])
      return rows.map((row) => new Document({ id: row.id, pageContent: row.content, metadata: row.metadata }))
    } catch (error) {
      logger.error('Full-text search failed', { mode: this.mode, indexName: this.indexName, query, error })
      return []
    }
  }
}

export const getFTSearchRetriever = (indexName: string, mode: FTSearchMode) => new FTSearchRetriever(indexName, mode)

class VectorSearchRetriever extends BaseRetriever {
  lc_namespace: string[] = ['currechat', 'services', 'rag', 'retrievers']

  constructor(private indexName: string) {
    super()
  }

  async _getRelevantDocuments(query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<Document[]> {
    try {
      const docs = await getRetriever(this.indexName).invoke(query)
      return docs.map((doc) => new Document({ id: doc.id, pageContent: doc.pageContent, metadata: doc.metadata }))
    } catch (error) {
      logger.error('Vector search failed', { indexName: this.indexName, query, error })
      return []
    }
  }
}

export const getVectorSearchRetriever = (indexName: string) => new VectorSearchRetriever(indexName)
