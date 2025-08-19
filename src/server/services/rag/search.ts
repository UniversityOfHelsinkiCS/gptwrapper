import { RagChunk } from '../../../shared/rag'
import type { RagIndex } from '../../db/models'
import { getRedisVectorStore } from './vectorStore'
import { FTSearchRetriever } from './retrievers'
import { EnsembleRetriever } from 'langchain/retrievers/ensemble'
import { BM25Retriever } from '@langchain/community/retrievers/bm25'

export const search = async (query: string, ragIndex: RagIndex): Promise<RagChunk[]> => {
  console.log('Searching', ragIndex.metadata.name, 'for query:', query)
  const vectorStore = getRedisVectorStore(ragIndex.id)

  const vectorstoreRetriever = vectorStore.asRetriever(8)
  const ftSearchRetriever = new FTSearchRetriever(vectorStore.indexName)

  const retriever = new EnsembleRetriever({
    retrievers: [vectorstoreRetriever, ftSearchRetriever],
    weights: [0.3, 0.7],
  })

  const results0 = await retriever.invoke(query)

  const reranker = BM25Retriever.fromDocuments(results0, { k: 5 })

  const results = await reranker.invoke(query)

  return results.map((doc) => ({
    id: doc.id,
    content: doc.pageContent,
    metadata: doc.metadata,
  }))
}
