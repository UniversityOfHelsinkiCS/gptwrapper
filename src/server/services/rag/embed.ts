import { EMBED_DIM, EMBED_MODEL } from '../../../config'
import type OpenAI from 'openai'

export const getEmbeddingVector = async (client: OpenAI, query: string) => {
  const response = await client.embeddings.create({
    model: EMBED_MODEL,
    input: query,
    encoding_format: 'float',
    dimensions: EMBED_DIM,
  })

  return response.data[0].embedding
}

export const getEmbeddingVectorBatch = async (client: OpenAI, queries: string[]) => {
  const response = await client.embeddings.create({
    model: EMBED_MODEL,
    input: queries,
    encoding_format: 'float',
    dimensions: EMBED_DIM,
  })

  return response.data
}
