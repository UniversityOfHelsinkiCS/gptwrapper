//@eslint-disable @typescript-eslint/no-explicit-any
// @ts-ignore
import { getEmbedding } from './ollama.js'
import { redis } from './redis.ts'

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
    // The following creates an index named "myIndex" on hashes with keys prefixed by "doc:".
    // It defines three fields: title and content (as texts) and embedding (as a binary vector).
    await redis.call(
      'FT.CREATE',
      'myIndex', // index name
      'ON',
      'HASH', // data type: HASH
      'PREFIX',
      '1',
      'doc:', // key prefix for your documents
      'SCHEMA',
      'title',
      'TEXT',
      'content',
      'TEXT',
      'embedding',
      'VECTOR',
      'FLAT',
      '6',
      'TYPE',
      'FLOAT32',
      'DIM',
      '768',
      'DISTANCE_METRIC',
      'L2'
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
// Note: ioredis correctly handles Buffer objects when you pass them as a field value.
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

  await redis.hset(key, 'title', title, 'content', content, 'embedding', buffer)
  console.log(`Inserted document ${id}`)
}

// Search for documents using a query embedding
export async function searchByEmbedding(queryVec: Buffer): Promise<any> {
  // This query searches for the top 10 documents whose vector "embedding" field is most similar
  // to the binary query vector provided as $vec_param.
  const searchQuery = '*=>[KNN 1 @embedding $vec_param]'
  // Note the use of the "PARAMS" clause to pass in our binary vector.
  console.log('Query vector length:', queryVec.length) // Log the query vector
  const res = await redis.call(
    'FT.SEARCH',
    'myIndex',
    searchQuery,
    'PARAMS',
    '2',
    'vec_param',
    queryVec,
    'DIALECT',
    '2',
    'RETURN',
    '1', // Specify the number of fields to return
    'content' // Return only the title field
  )
  console.log('Search results:', res)
  return res
}
