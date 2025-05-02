//@eslint-disable @typescript-eslint/no-explicit-any
// @ts-ignore
import { getEmbedding } from './ollama.js'
import { redisClient } from './redis'
import { readFile, readdir } from 'fs/promises'

/**
 * Reads all markdown documents from directory ./data, splits them into chunks,
 * and inserts them into Redis with embeddings.
 */
export const initEmbedding = async () => {
  // 1. Create a vector index for your documents
  await createIndex()
  await insertDocument('asd', 'asd', 'asd') // Test document to check if the index is created correctly
  return

  // 2. Read all markdown documents from the directory
  const files = await readdir('./data')
  console.log('Files:', files)

  // Limit to first file
  const filesDev = files.slice(0, 1)

  for (const file of filesDev) {
    const filePath = `./data/${file}`
    const content = await readFile(filePath, 'utf-8')

    // Split by paragraphs
    const paragraphs = content.split('\n\n')
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim()
      // Cleanup: if the paragraph starts with { or <, skip it
      if (paragraph.startsWith('{') || paragraph.startsWith('<')) {
        console.log(`Skipping paragraph ${i} in file ${file}:`, paragraph)
        continue
      }

      if (paragraph.length > 0) {
        // Insert each paragraph as a separate document
        const id = `${file}-${i}`
        await insertDocument(id, id, paragraph)
      }
    }
  }
}

// 1. Create a vector index for your documents
async function createIndex(): Promise<void> {
  try {
    // await redisClient.ft.dropIndex('myIndex')
    console.log('Index dropped')
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
          ALGORITHM: 'FLAT',
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

  // console.log(`Embedding for document ${id}:`, float32Arr) // Log the embedding as a Float32Array

  await redisClient.hSet(key, {
    title,
    content,
    buffer,
  })
  console.log(`Inserted document ${id}`)
}

// Search for documents using a query embedding
export async function searchByEmbedding(queryVec: Buffer): Promise<any> {
  const res = await redisClient.ft.search('myIndex', '*', {
    PARAMS: {
      vec_param: queryVec,
    },
    DIALECT: 2,
    RETURN: ['content', 'title'], // Specify the fields to return
  })

  console.log(res)

  console.log(res.documents?.length)

  if (!res.documents) {
    console.log('No documents found.')
    return null
  }

  for (const doc of res.documents) {
    console.log(
      `${doc.id}: ${doc.value.title} '${doc.value.content}', Score: ${doc.value.score}`
    )
  }

  return res
}
