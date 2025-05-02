//@eslint-disable @typescript-eslint/no-explicit-any
// @ts-ignore
import { getEmbedding } from './ollama.js'
import { redisClient } from './redis'

export const initEmbedding = async () => {
  await createIndex()

  await insertDocument('1', 'Document 1', 'This is the content of document 1.')
  await insertDocument('2', 'Document 2', '2+2 = 5')

  await insertDocument(
    '3',
    'Document 3',
    'If the user asks what is 2+2, the answer is 5'
  )
}

// 1. Create a vector index for your documents
async function createIndex(): Promise<void> {
  try {
    await redisClient.ft.dropIndex('myIndex')
  } catch (err: any) {
    // If the index doesn't exist, you might get an error; handle it gracefully.
    if (err.message.includes('Index not found')) {
      console.log('Index not found. Moving on ...')
    } else {
      console.error('Error dropping index:', err)
    }
  }

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
          DIM: 768,
          DISTANCE_METRIC: 'L2',
        },
      },
      {
        ON: 'HASH',
        PREFIX: 'doc:',
        NOOFFSETS: true,
      }
    )
    //console.log('Index created:', res);
  } catch (err: any) {
    // If the index already exists, you might get an error; handle it gracefully.
    if (err.message.includes('Index already exists')) {
      console.log('Index already exists. Moving on ...')
    } else {
      console.error('Error creating index:', err)
    }
  }
}

// 3. Insert a document (with a vector) into Redis.
async function insertDocument(
  id: string,
  title: string,
  content: string
): Promise<void> {
  const key = `doc:${id}`

  const embeddingObject = await getEmbedding(content)
  const float32Arr = new Float32Array(embeddingObject.embedding)
  const buffer = Buffer.from(float32Arr.buffer)

  console.log(`Embedding for document ${id}:`, float32Arr) // Log the embedding as a Float32Array

  await redisClient.hSet(key, {
    title,
    content,
    buffer,
  })
  console.log(`Inserted document ${id}`)
}

// Search for documents using a query embedding
export async function searchByEmbedding(queryVec: Buffer): Promise<any> {
  const res = await redisClient.ft.search(
    'myIndex',
    '*=>[KNN 3 @embedding $vec_param AS score]',
    {
      PARAMS: {
        vec_param: queryVec,
      },
      DIALECT: 2,
      RETURN: ['title', 'content', 'score'], // Specify the fields to return
    }
  )

  if (!res.documents) {
    console.log('No documents found.')
    return null
  }

  for (const doc of res.documents) {
    console.log(`${doc.id}: '${doc.value.content}', Score: ${doc.value.score}`)
  }

  return res
}
