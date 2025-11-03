import { RagChunk, SearchParams } from '../../../shared/rag'
import type { RagIndex } from '../../db/models'
import { getAndFTSearchRetriever, getOrFTSearchRetriever, getExactFTSearchRetriever, getSubstringFTSearchRetriever, getVectorSearchRetriever, getMultiQueryEnsembleRetriever } from './retrievers'
import { EnsembleRetriever } from 'langchain/retrievers/ensemble'
import { BaseRetriever } from '@langchain/core/retrievers'
import { curateDocuments } from './curator'

export const search = async (ragIndex: RagIndex, searchParams: SearchParams): Promise<{ results: RagChunk[]; timings: Record<string, number> }> => {
  const timings: Record<string, number> = {}

  const retrievers: BaseRetriever[] = []
  const weights: number[] = []
  
  if (searchParams.vector) {
    retrievers.push(getVectorSearchRetriever(`ragIndex-${ragIndex.id}`, 15))
    weights.push(0.4)
  }
  if (searchParams.ftExact) {
    retrievers.push(getExactFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language, searchParams.highlight))
    weights.push(1.0)
  }
  if (searchParams.ftSubstring) {
    retrievers.push(getSubstringFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language, searchParams.highlight))
    weights.push(0.6)
  }
  if (searchParams.ftAnd) {
    retrievers.push(getAndFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language, searchParams.highlight))
    weights.push(0.5)
  }
  if (searchParams.ftOr) {
    retrievers.push(getOrFTSearchRetriever(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language, searchParams.highlight))
    weights.push(0.4)
  }

  const baseEnsembleRetriever = new EnsembleRetriever({
    retrievers,
    weights,
  })

  const multiQueryRetriever = getMultiQueryEnsembleRetriever(baseEnsembleRetriever, timings, { generateSynonyms: searchParams.generateSynonyms })

  let results = await multiQueryRetriever.invoke(searchParams.query)

  // Take top 15 results before curation
  results = results.slice(0, searchParams.rerankK)

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
