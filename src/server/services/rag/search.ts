import { EnsembleRetriever } from '@langchain/classic/retrievers/ensemble'
import type { BaseRetriever } from '@langchain/core/retrievers'
import type { RagChunk, SearchParams } from '../../../shared/rag'
import type { RagIndex } from '../../db/models'
import { getFTSearchRetriever, getVectorSearchRetriever } from './retrievers'

/** Most chunks a search returns. They all go into the context of the chat model, which judges their relevance itself. */
export const SEARCH_RESULT_LIMIT = 8

/**
 * Hybrid search over the chunks of a RAG index: semantic (vector) search and three full-text searches, merged with
 * weighted reciprocal rank fusion. An exact phrase match weighs the most.
 */
export const search = async (ragIndex: RagIndex, searchParams: SearchParams): Promise<{ results: RagChunk[]; timings: Record<string, number> }> => {
  const indexName = `ragIndex-${ragIndex.id}`
  const weighted: [BaseRetriever, number][] = []

  if (searchParams.vector) {
    weighted.push([getVectorSearchRetriever(indexName), 0.4])
  }
  if (searchParams.fullText) {
    weighted.push([getFTSearchRetriever(indexName, 'phrase'), 1.0], [getFTSearchRetriever(indexName, 'and'), 0.5], [getFTSearchRetriever(indexName, 'or'), 0.4])
  }
  if (weighted.length === 0) return { results: [], timings: {} }

  const ensemble = new EnsembleRetriever({
    retrievers: weighted.map(([retriever]) => retriever),
    weights: weighted.map(([, weight]) => weight),
  })

  const start = Date.now()
  const documents = await ensemble.invoke(searchParams.query)
  const timings = { search: Date.now() - start }

  return {
    results: documents.slice(0, SEARCH_RESULT_LIMIT).map((doc) => ({
      id: doc.id,
      content: doc.pageContent,
      metadata: doc.metadata as RagChunk['metadata'],
    })),
    timings,
  }
}
