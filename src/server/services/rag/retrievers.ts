import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseRetriever } from '@langchain/core/retrievers'
import { SearchReply } from 'redis'
import { redisClient } from '../../util/redis'

export const getPhraseFTSearchRetriever = (indexName: string, language?: string) => new FTSearchRetriever(indexName, (q) => `"${q}"`, language)
export const getAndFTSearchRetriever = (indexName: string, language?: string) => new FTSearchRetriever(indexName, (q) => q, language)
export const getOrFTSearchRetriever = (indexName: string, language?: string) => new FTSearchRetriever(indexName, (q) => q.split(' ').join(' | '), language)

class FTSearchRetriever extends BaseRetriever {
  indexName: string
  language?: string
  queryTransform: (query: string) => string

  constructor(indexName: string, queryTransform: (query: string) => string, language?: string) {
    super()
    this.indexName = indexName
    this.language = language
    this.queryTransform = queryTransform
  }

  async _getRelevantDocuments(query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<DocumentInterface<Record<string, any>>[]> {
    const documents = await this.redisQuery(this.queryTransform(query))

    return documents.map(
      (doc) =>
        new Document({
          pageContent: doc.value.content as string,
          metadata: doc.value.metadata as Record<string, any>,
        }),
    )
  }

  async redisQuery(query: string): Promise<SearchReply['documents']> {
    const results = await redisClient.ft.search(this.indexName, query, {
      RETURN: ['content', 'metadata'],
    })

    // Type narrowing
    if (!results || typeof results !== 'object' || !('documents' in results) || !Array.isArray(results.documents)) {
      console.warn('ft.search did not return documents for query:', query, 'index:', this.indexName)
      return []
    }

    return (results as SearchReply).documents
  }

  lc_namespace: string[] = ['currechat', 'services', 'rag', 'retrievers']
}
