import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseRetriever } from '@langchain/core/retrievers'
import { RediSearchLanguage, SearchReply } from 'redis'
import { redisClient } from '../../util/redis'
import { Embeddings } from '@langchain/core/embeddings'
import { getEmbedder } from './embedder'
import { transformQuery, TransformQueryOptions } from './queryTransformer'
import { EnsembleRetriever } from 'langchain/retrievers/ensemble'

export const getExactFTSearchRetriever = (indexName: string, language?: RediSearchLanguage, highlight?: boolean) => new FTSearchRetriever(indexName, (q) => `@content_exact:"${q}"`, language, 'exact', highlight)
export const getSubstringFTSearchRetriever = (indexName: string, language?: RediSearchLanguage, highlight?: boolean) => new FTSearchRetriever(indexName, (q) => `*${q}*`, language, 'substring', highlight)
export const getAndFTSearchRetriever = (indexName: string, language?: RediSearchLanguage, highlight?: boolean) => new FTSearchRetriever(indexName, (q) => q, language, 'and', highlight)
export const getOrFTSearchRetriever = (indexName: string, language?: RediSearchLanguage, highlight?: boolean) => new FTSearchRetriever(indexName, (q) => q.split(' ').map(word => word.trim()).filter(word => word.length > 0).join(' | '), language, 'or', highlight)


const normalizeWhitespace = (str: string) => {
  return str.replace(/\s+/g, ' ').trim();
}

const TOKEN_RE = new RegExp(
  /[,.<>{}[\]"':;!@#$%^&*()\-+=~]/g
);

const removeIllegalCharacters = (str: string) => {
  return str.replace(TOKEN_RE, ' ');
}

class FTSearchRetriever extends BaseRetriever {
  name?: string
  indexName: string
  language?: RediSearchLanguage
  queryTransform: (query: string) => string
  highlight?: boolean

  constructor(indexName: string, queryTransform: (query: string) => string, language?: RediSearchLanguage, name?: string, highlight?: boolean) {
    super()
    this.indexName = indexName
    this.language = language
    this.queryTransform = queryTransform
    this.name = name
    this.highlight = highlight
  }

  async _getRelevantDocuments(query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<DocumentInterface<Record<string, any>>[]> {
    const documents = await this.redisQuery(
      this.queryTransform(removeIllegalCharacters(normalizeWhitespace(query)))
    )

    return documents.map(
      (doc) =>
        new Document({
          pageContent: doc.value.content as string,
          metadata: doc.value.metadata as Record<string, any>,
        }),
    )
  }

  async redisQuery(query: string): Promise<SearchReply['documents']> {
    try {
      const results = await redisClient.ft.search(this.indexName, query, {
        RETURN: ['content', 'metadata'],
        ...(this.highlight ? { HIGHLIGHT: {
          TAGS: {
            open: '**',
            close: '**',
          },
        }} : {}),
        DIALECT: 2,
        LIMIT: {
          from: 0,
          size: 16,
        },
        ...(this.language ? { LANGUAGE: this.language } : {}),
      })

      // Type narrowing
      if (!results || typeof results !== 'object' || !('documents' in results) || !Array.isArray(results.documents)) {
        console.warn('ft.search did not return documents for query:', query, 'index:', this.indexName)
        return []
      }

      console.log(`${query} ${this.name ? `(${this.name}) ` : ''}results:`, results.documents.length)

      return (results as SearchReply).documents
    } catch (error) {
      console.error(`Error during FT search (${this.name}, '${query}'):`, error)
      return []
    }
  }

  lc_namespace: string[] = ['currechat', 'services', 'rag', 'retrievers']
}

class VectorSearchRetriever extends BaseRetriever {
  indexName: string
  k: number
  embedder: Embeddings

  constructor(indexName: string, k = 6) {
    super()
    this.indexName = indexName
    this.k = k
    this.embedder = getEmbedder()
  }

  async _getRelevantDocuments(query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<DocumentInterface<Record<string, any>>[]> {
    const queryEmbedding = await this.embedder.embedQuery(query)

    const redisQuery = `* => [KNN ${this.k} @content_vector $vector AS vector_score]`

    try {
      const results = await redisClient.ft.search(this.indexName, redisQuery, {
        RETURN: ['content', 'metadata', 'vector_score'],
        SORTBY: `vector_score`,
        DIALECT: 2,
        PARAMS: {
          vector: Buffer.from(new Float32Array(queryEmbedding).buffer),
        },
        LIMIT: {
          from: 0,
          size: this.k,
        },
      })

      // Type narrowing
      if (!results || typeof results !== 'object' || !('documents' in results) || !Array.isArray(results.documents)) {
        console.warn('ft.search did not return documents for vector query:', query, 'index:', this.indexName)
        return []
      }

      // Make sure sorted correctly
      // console.log((results as SearchReply).documents.map((doc) => doc.value.vector_score))
      console.log('VectorSearchRetriever results:', results.documents.length)

      return (results as SearchReply).documents.map(
        (doc) =>
          new Document({
            pageContent: doc.value.content as string,
            metadata: doc.value.metadata as Record<string, any>,
          }),
      )
    } catch (error) {
      console.error('Error during vector search:', error)
      return []
    }
  }

  lc_namespace: string[] = ['currechat', 'services', 'rag', 'retrievers']
}

export const getVectorSearchRetriever = (indexName: string, k: number) => new VectorSearchRetriever(indexName, k)

export const retrieverFrom = (fn: (query: string) => Promise<DocumentInterface<Record<string, any>>[]>) => {
  return new FunctionRetriever(fn)
}

class FunctionRetriever extends BaseRetriever {
  fn: (query: string) => Promise<DocumentInterface<Record<string, any>>[]>

  constructor(fn: (query: string) => Promise<DocumentInterface<Record<string, any>>[]>) {
    super()
    this.fn = fn
  }

  async _getRelevantDocuments(query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<DocumentInterface<Record<string, any>>[]> {
    return this.fn(query)
  }

  lc_namespace: string[] = ['currechat', 'services', 'rag', 'retrievers']
}

export const getMultiQueryEnsembleRetriever = (baseRetriever: BaseRetriever, timings: Record<string, number>, transformQueryOptions: TransformQueryOptions = {}) => retrieverFrom(async (query: string) => {

  timings.transformQuery = Date.now()
  const queries = await transformQuery(query, transformQueryOptions)
  timings.transformQuery = Date.now() - timings.transformQuery

  const ensemble = new EnsembleRetriever({
    retrievers: queries.map((q) => retrieverFrom((_) => baseRetriever.invoke(q))),
    weights: queries.map(() => 1.0),
  })

  timings.search = Date.now()
  const result = ensemble.invoke('')
  timings.search = Date.now() - timings.search

  return result
})
