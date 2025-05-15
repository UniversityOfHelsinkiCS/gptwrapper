import { RagIndex } from '../../db/models'
import { redisClient } from '../../util/redis'

export const createChunkIndex = async (ragIndex: RagIndex) => {
  try {
    await redisClient.ft.create(
      ragIndex.metadata.name,
      {
        metadata: {
          type: 'TEXT',
        },
        content: {
          type: 'TEXT',
        },
        embedding: {
          type: 'VECTOR',
          TYPE: 'FLOAT32',
          ALGORITHM: 'HNSW',
          DIM: ragIndex.metadata.dim,
          DISTANCE_METRIC: 'L2',
        },
      },
      {
        ON: 'HASH',
        PREFIX: `idx:${ragIndex.metadata.name}`,
      },
    )

    console.log(`Index ${ragIndex.metadata.name} created`)
  } catch (err: any) {
    if (err.message.includes('Index already exists')) {
      console.log(`Index ${ragIndex.metadata.name} already exists`)
    } else {
      console.error('Error creating index', err)
    }
  }
}

export const deleteChunkIndex = async (ragIndex: RagIndex) => {
  try {
    await redisClient.ft.dropIndex(ragIndex.metadata.name)
    console.log(`Index ${ragIndex.metadata.name} deleted`)
  } catch (err: any) {
    if (err.message.includes('Index not found')) {
      console.log(`Index ${ragIndex.metadata.name} not found`)
    } else {
      console.error('Error deleting index', err)
    }
  }
}

export const addChunk = async (
  ragIndex: RagIndex,
  {
    id,
    metadata,
    content,
    embedding,
  }: {
    id: string
    metadata?: { [key: string]: any }
    content: string
    embedding: number[]
  },
) => {
  const embeddingBuffer = Buffer.copyBytesFrom(new Float32Array(embedding))

  // Check if the embedding length is correct
  if (embeddingBuffer.length !== 4 * ragIndex.metadata.dim) {
    throw new Error(`Embedding length is incorrect, got ${embeddingBuffer.length} bytes`)
  }

  await redisClient.hSet(`idx:${ragIndex.metadata.name}:${id}`, {
    metadata: JSON.stringify(metadata || {}),
    content,
    embedding: embeddingBuffer,
  })

  console.log(`Document ${id} added to index ${ragIndex.metadata.name}`)
}

export const searchKChunks = async (ragIndex: RagIndex, embedding: number[], k: number) => {
  const embeddingBuffer = Buffer.copyBytesFrom(new Float32Array(embedding))

  if (embeddingBuffer.length !== 4 * ragIndex.metadata.dim) {
    throw new Error(`Embedding length is incorrect, got ${embeddingBuffer.length} bytes`)
  }

  const queryString = `(*)=>[KNN ${k} @embedding $vec_param AS score]`

  const results = await redisClient.ft.search(ragIndex.metadata.name, queryString, {
    PARAMS: {
      vec_param: embeddingBuffer,
    },
    DIALECT: 2,
    RETURN: ['content', 'title', 'score'], // Specify the fields to return
  })

  return results as {
    total: number
    documents: {
      id: string
      value: {
        content: string
        title: string
        score: number
        metadata: string
      }
    }[]
  }
}
