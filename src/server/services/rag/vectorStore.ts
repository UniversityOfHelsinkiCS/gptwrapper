import { Chroma } from '@langchain/community/vectorstores/chroma'
import { RedisVectorStore } from '@langchain/redis'
import { getEmbedder } from './embedder'
import { CHROMADB_URL } from '../../util/config'
import { redisClient } from '../../util/redis'
import { ChromaClient, EmbeddingFunction } from 'chromadb'

// We specify ChromaClient ourself here instead of letting LC do it, so we can manage collections etc without LC bugs in our way.
export const chromaClient = new ChromaClient({ path: CHROMADB_URL })

export const ensureChromaCollection = async (name: string) => {
  const collection = await chromaClient.getOrCreateCollection({
    name,
    embeddingFunction: new DummyChromaEmbeddingFunction(),
    // Could specify configuration here if needed, see chroma docs.
    // configuration: {
    //   ...
    // }
  })
  return collection
}

export const getChromaVectorStore = (ragIndexId: number) => {
  return new Chroma(getEmbedder(), {
    collectionName: String(ragIndexId),
    index: chromaClient,
    url: CHROMADB_URL,
  })
}

export const getRedisVectorStore = (ragIndexId: number) => {
  return new RedisVectorStore(getEmbedder(), {
    // @ts-expect-error something wrong with typing, but it should actually match the signature.
    redisClient,
    indexName: `ragIndex-${String(ragIndexId)}`,
  })
}

class DummyChromaEmbeddingFunction implements EmbeddingFunction {
  public async generate(): Promise<number[][]> {
    return []
  }
}
