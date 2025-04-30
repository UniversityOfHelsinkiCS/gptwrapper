//@eslint-disable @typescript-eslint/no-explicit-any
// @ts-ignore
import {redis} from './redis.ts';

const runEmbeddingCode = async () => {
  await createIndex();
  const embedding1 = getDummyEmbedding();
  await insertDocument('1', 'Document 1', 'This is the content of document 1.', embedding1);
  const result = await searchByEmbedding(embedding1);
  console.log('Search results:', result);
  return result;
}



// 1. Create a vector index for your documents
async function createIndex(): Promise<void> {
  try {
    // The following creates an index named "myIndex" on hashes with keys prefixed by "doc:".
    // It defines three fields: title and content (as texts) and embedding (as a binary vector).
    const res = await redis.call(
      'FT.CREATE',
      'myIndex',                    // index name
      'ON', 'HASH',                 // data type: HASH
      'PREFIX', '1', 'doc:',        // key prefix for your documents
      'SCHEMA',
      'title', 'TEXT',
      'content', 'TEXT',
      'embedding', 'VECTOR', 'FLAT', '6', 
      'TYPE', 'FLOAT32', 
      'DIM', '1536', 
      'DISTANCE_METRIC', 'COSINE'
    );
    //console.log('Index created:', res);
  } catch (err: any) {
    // If the index already exists, you might get an error; handle it gracefully.
    if (err.message.includes('Index already exists')) {
      console.log('Index already exists. Moving on ...');
    } else {
      console.error('Error creating index:', err);
    }
  }
}

// 2. Create a dummy embedding. In production, replace this with your actual embedding model.
function getDummyEmbedding(dim: number = 1536): Buffer {
  const arr = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    arr[i] = Math.random();
  }
  // Convert the Float32Array to a Buffer.
  return Buffer.from(arr.buffer);
}

// 3. Insert a document (with a vector) into Redis.
// Note: ioredis correctly handles Buffer objects when you pass them as a field value.
async function insertDocument(id: string, title: string, content: string, embedding: Buffer): Promise<void> {
  const key = `doc:${id}`;
  await redis.hset(key, 'title', title, 'content', content, 'embedding', embedding);
  console.log(`Inserted document ${id}`);
}

// 4. Search for documents using a query embedding
async function searchByEmbedding(queryVec: Buffer): Promise<any> {
  // This query searches for the top 10 documents whose vector "embedding" field is most similar
  // to the binary query vector provided as $vec_param.
  const searchQuery = '*=>[KNN 10 @embedding $vec_param]';
  // Note the use of the "PARAMS" clause to pass in our binary vector.
  const res = await redis.call(
    'FT.SEARCH',
    'myIndex', 
    searchQuery,
    'PARAMS', '2', 'vec_param', queryVec,
    'DIALECT', '2'
  );
  console.log('Search results:', res);
  return res;
}

// Main execution to demonstrate the pipeline
(async () => {
  // 1. Create the index (if not already created)
  await createIndex();

  // 2. Insert a couple of sample documents with dummy embeddings.
  const embedding1 = getDummyEmbedding();
  const embedding2 = getDummyEmbedding();

  await insertDocument('1', 'Document 1', 'This is the content of document 1.', embedding1);
  await insertDocument('2', 'Document 2', 'Content for document 2 goes here.', embedding2);

  // 3. Generate a dummy query vector.
  const queryVec = getDummyEmbedding();

  // 4. Retrieve the top 10 closest documents using vector search.
  const results = await searchByEmbedding(queryVec);

  // The search results will include the matching documents. In a full RAG pipeline you would then:
  // - Extract relevant document excerpts from the results.
  // - Augment your original query with this contextual data.
  // - Call your Large Language Model (e.g., via an API) with the augmented prompt.
})();

export default runEmbeddingCode;