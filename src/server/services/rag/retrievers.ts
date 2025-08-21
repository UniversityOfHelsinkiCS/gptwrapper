import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseRetriever } from '@langchain/core/retrievers'
import { SearchReply } from 'redis'
import { redisClient } from '../../util/redis'

export class FTSearchRetriever extends BaseRetriever {
  indexName: string
  language?: string

  constructor(indexName: string, language?: string) {
    super()
    this.indexName = indexName
    this.language = language
  }

  async _getRelevantDocuments(query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<DocumentInterface<Record<string, any>>[]> {
    const redisQuery = `@content:"${query}"`
    const ftSearchResults = await redisClient.ft.search(this.indexName, redisQuery, {
      RETURN: ['content', 'metadata'],
    })

    // Type narrowing
    if (!ftSearchResults || typeof ftSearchResults !== 'object' || !('documents' in ftSearchResults) || !Array.isArray(ftSearchResults.documents)) {
      console.warn('ft.search did not return documents for query:', query, 'index:', this.indexName)
      return []
    }

    const documents = (ftSearchResults as SearchReply).documents

    return documents.map(
      (doc) =>
        new Document({
          pageContent: doc.value.content as string,
          metadata: doc.value.metadata as Record<string, any>,
        }),
    )
  }

  lc_namespace: string[] = ['currechat', 'services', 'rag', 'retrievers']
}
