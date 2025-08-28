import { RedisVectorStore } from '@langchain/redis'
import { redisClient } from '../../util/redis'
import { getEmbedder } from './embedder'

export const getRedisVectorStore = (ragIndexId: number, language?: string) => {
  return new RedisVectorStore(getEmbedder(), {
    // @ts-expect-error something wrong with typing, but it should actually match the signature.
    redisClient,
    indexName: `ragIndex-${String(ragIndexId)}`,
    createIndexOptions: {
      LANGUAGE: language as 'Finnish' | 'English' | undefined,
      LANGUAGE_FIELD: '@content',
    },
  })
}
