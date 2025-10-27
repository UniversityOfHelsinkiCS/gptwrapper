import { RagChunk, SearchParams } from '../../../shared/rag'
import type { RagIndex } from '../../db/models'
import { getRedisVectorStore } from './vectorStore'
import { getAndFTSearchRetriever, getOrFTSearchRetriever, getPhraseFTSearchRetriever } from './retrievers'
import { EnsembleRetriever } from 'langchain/retrievers/ensemble'
import { BM25Retriever } from '@langchain/community/retrievers/bm25'
import type { BaseRetriever } from '@langchain/core/retrievers'

export const search = async (ragIndex: RagIndex, searchParams: SearchParams): Promise<{ results: RagChunk[]; timings: Record<string, number> }> => {
  const timings: Record<string, number> = {}

  const vectorStore = getRedisVectorStore(ragIndex.id)

  const vectorstoreRetriever = vectorStore.asRetriever(searchParams.vectorK)

  const retrievers: BaseRetriever[] = []
  const weights: number[] = []

  if (searchParams.vector) {
    retrievers.push(vectorstoreRetriever)
    weights.push(0.3)
  }

  if (searchParams.ft) {
    retrievers.push(
      ...[
        getPhraseFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language),
        getAndFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language),
        getOrFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language),
      ],
    )
    weights.push(...[0.7, 0.2, 0.1])
  }

  const retriever = new EnsembleRetriever({
    retrievers,
    weights,
  })

  timings.search = Date.now()
  let results = await retriever.invoke(searchParams.query)
  timings.search = Date.now() - timings.search

  if (searchParams.rerank) {
    timings.rerank = Date.now()
    const reranker = BM25Retriever.fromDocuments(results, { k: searchParams.rerankK })
    results = await reranker.invoke(searchParams.query)
    timings.rerank = Date.now() - timings.rerank
  }

  return {
    results: results.map((doc) => ({
      id: doc.id,
      content: doc.pageContent,
      metadata: parseMetadata(doc.metadata),
    })),
    timings,
  }
}

const parseMetadata = (metadata: Record<string, any> | string) => {
  if (typeof metadata === 'string') {
    const unescaped = metadata.replace(/\\/g, '')
    try {
      return JSON.parse(unescaped)
    } catch (error) {
      console.error('Error parsing metadata:', unescaped, error)
      return {}
    }
  }
  return metadata
}
