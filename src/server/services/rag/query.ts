import { EMBED_MODEL } from '../../../config'
import { RagIndex } from '../../db/models'
import { getAzureOpenAIClient } from '../../util/azure'
import { fullTextSearchChunks, vectorSearchKChunks } from './chunkDb'
import { getEmbeddingVector } from './embed'

const vectorSearch = async (ragIndex: RagIndex, query: string, topK: number) => {
  const client = getAzureOpenAIClient(EMBED_MODEL)
  console.time('getEmbedding')
  const queryEmbedding = await getEmbeddingVector(client, query)
  console.timeEnd('getEmbedding')
  console.time('vectorSearch')
  const queryResult = await vectorSearchKChunks(ragIndex, queryEmbedding, topK)
  console.timeEnd('vectorSearch')
  return queryResult.documents
}

const fullTextSearch = async (ragIndex: RagIndex, query: string) => {
  console.time('fullTextSearch')
  const queryResult = await fullTextSearchChunks(ragIndex, query)
  console.timeEnd('fullTextSearch')
  return queryResult.documents
}

export const queryRagIndex = async (ragIndex: RagIndex, query: string, topK: number) => {
  // Hybrid search
  const [vectorSearchResult, fullTextSearchResult] = await Promise.all([vectorSearch(ragIndex, query, topK), fullTextSearch(ragIndex, query)])

  // Combine results
  const combinedResults = vectorSearchResult

  fullTextSearchResult.forEach((doc) => {
    const existingDoc = combinedResults.find((d) => d.id === doc.id)
    if (!existingDoc) {
      const newDoc = doc as (typeof vectorSearchResult)[0]
      newDoc.value.score = 1.0
      combinedResults.push(newDoc)
    } else {
      existingDoc.value.score -= 0.1 // Decrease score for duplicates
    }
  })

  // Rerank here

  // Sort by score (ASC)
  combinedResults.sort((a, b) => a.value.score - b.value.score)

  return combinedResults
}
