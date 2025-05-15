import { EMBED_MODEL } from '../../../config'
import { RagIndex } from '../../db/models'
import { getAzureOpenAIClient } from '../../util/azure'
import { searchKChunks } from './chunkDb'
import { getEmbeddingVector } from './embed'

export const queryRagIndex = async (ragIndex: RagIndex, query: string, topK: number) => {
  const client = getAzureOpenAIClient(EMBED_MODEL)
  const queryEmbedding = await getEmbeddingVector(client, query)
  const queryResult = await searchKChunks(ragIndex, queryEmbedding, topK)
  return queryResult.documents
}
