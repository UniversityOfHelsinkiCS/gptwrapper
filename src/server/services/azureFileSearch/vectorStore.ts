import { getAzureOpenAIClient } from '../../util/azure/client'
import { redisClient } from '../../util/redis'

// Strategy: have one big vector store

export const getPrimaryVectorStoreId = async () => {
  const vectorStoreId = await redisClient.get('primaryVectorStoreId')
  if (vectorStoreId) {
    return vectorStoreId
  }

  const client = getAzureOpenAIClient()

  const vectorStores = (await client.vectorStores.list()).getPaginatedItems()

  let primaryVectorStore = vectorStores.find((store) => store.metadata?.primaryRagIndicesVectorStore === 'true')

  if (!primaryVectorStore) {
    // Create a new vector store if none exist
    primaryVectorStore = await client.vectorStores.create({
      name: 'CurreChat file search vector store',
      expires_after: {
        anchor: 'last_active_at',
        days: 60,
      },
      metadata: {
        // Identify this vector store as the primary one for RAG indices
        primaryRagIndicesVectorStore: 'true',
      },
    })
  }

  await redisClient.set('primaryVectorStoreId', primaryVectorStore.id)

  return primaryVectorStore.id
}
