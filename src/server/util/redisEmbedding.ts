//@eslint-disable @typescript-eslint/no-explicit-any
// @ts-ignore
import { EmbedResponse } from 'ollama'
import { getEmbedding } from './ollama.js'
import { redisClient } from './redis'

export async function createIndex(): Promise<void> {
  /* try {
    await redisClient.ft.dropIndex('myIndex')

    // Also delete the data in the index
    const keys = await redisClient.keys('doc:*')
    if (keys.length > 0) {
      await redisClient.del(keys)
      console.log('Deleted keys:', keys)
    } else {
      console.log('No keys to delete.')
    }

    console.log('Index dropped')
  } catch (err: any) {
    // If the index doesn't exist, you might get an error; handle it gracefully.
    if (err.message.includes('Index not found')) {
      console.log('Index not found. Moving on ...')
    } else {
      console.error('Error dropping index:', err)
    }
  } */

  try {
    await redisClient.ft.create(
      'myIndex',
      {
        title: {
          type: 'TEXT',
        },
        content: {
          type: 'TEXT',
        },
        embedding: {
          type: 'VECTOR',
          TYPE: 'FLOAT32',
          ALGORITHM: 'HNSW',
          DIM: 1024,
          DISTANCE_METRIC: 'L2',
        },
      },
      {
        ON: 'HASH',
        PREFIX: 'doc:',
      }
    )
  } catch (err: any) {
    // If the index already exists, you might get an error; handle it gracefully.
    if (err.message.includes('Index already exists')) {
      console.log('Index already exists. Moving on ...')
    } else {
      console.error('Error creating index:', err)
    }
  }
}

const embedResponseToBuffer = (embeddingObject: EmbedResponse) => {
  const f32Arr = new Float32Array(embeddingObject.embeddings[0])
  const buffer = Buffer.from(f32Arr.buffer)
  return buffer
}

// 3. Insert a document (with a vector) into Redis.
export async function insertDocument(
  id: string,
  title: string,
  content: string
): Promise<void> {
  const key = `doc:${id}`

  const embeddingObject = await getEmbedding(content)
  const embedding = embedResponseToBuffer(embeddingObject)
  console.log('got the embedding, next is saving to redis:', embedding)
  await redisClient.hSet(key, {
    title,
    content,
    embedding,
  })
  console.log(`Inserted document ${id}`)
}

// Search for documents using a query embedding
export async function searchEmbedding(prompt: string): Promise<any> {
  const embeddingObject = await getEmbedding(prompt)
  const embedding = embedResponseToBuffer(embeddingObject)

  // console.log(embedding.length)
  if (embedding.length !== 4096) {
    console.error(
      `Query vector length ${embedding.length} does not match expected length 4096`
    )
    return null
  }

  const queryString = '(*)=>[KNN 5 @embedding $vec_param AS score]'

  const res = await redisClient.ft.search('myIndex', queryString, {
    PARAMS: {
      vec_param: embedding,
    },
    DIALECT: 2,
    RETURN: ['content', 'title', 'score'], // Specify the fields to return
  })

  // console.log(res)

  // console.log(res.documents?.length)

  // if (!res.documents) {
  //   console.log('No documents found.')
  //   return null
  // }

  // for (const doc of res.documents) {
  // console.log(`${doc.id}: ${doc.value.title} '${doc.value.content}', Score: ${doc.value.score}`)
  // }

  return res
}

export const existsDocument = async (id: string): Promise<boolean> => {
  const key = `doc:${id}`
  const exists = await redisClient.exists(key)
  return exists === 1
}
