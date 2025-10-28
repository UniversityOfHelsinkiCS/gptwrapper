import { RagChunk, SearchParams } from '../../../shared/rag'
import type { RagIndex } from '../../db/models'
import { getAndFTSearchRetriever, getOrFTSearchRetriever, getExactFTSearchRetriever, getSubstringFTSearchRetriever, getVectorSearchRetriever } from './retrievers'
import { EnsembleRetriever } from 'langchain/retrievers/ensemble'
import type { BaseRetriever } from '@langchain/core/retrievers'
import { curateDocuments } from './curator'

export const search = async (ragIndex: RagIndex, searchParams: SearchParams): Promise<{ results: RagChunk[]; timings: Record<string, number> }> => {
  const timings: Record<string, number> = {}

  const vectorstoreRetriever = getVectorSearchRetriever(`ragIndex-${ragIndex.id}`, 13)

  const retrievers: BaseRetriever[] = []
  const weights: number[] = []

  if (searchParams.vector) {
    retrievers.push(vectorstoreRetriever)
    weights.push(0.4)
  }

  if (searchParams.ft) {
    retrievers.push(
      ...[
        getExactFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language),
        getSubstringFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language),
        getAndFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language),
        getOrFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language),
      ],
    )
    // weights.push(0.4)
    weights.push(...[1.0, 0.4, 0.4, 0.4])
  }

  const retriever = new EnsembleRetriever({
    retrievers,
    weights,
  })

  timings.search = Date.now()
  let results = await retriever.invoke(searchParams.query)
  console.log('Search found results:', results.length)
  timings.search = Date.now() - timings.search

  // Take top 9 results before curation
  results = results.slice(0, 9)

  if (searchParams.curate) {
    timings.curation = Date.now()
    results = await curateDocuments(results, searchParams.query)
    timings.curation = Date.now() - timings.curation
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
