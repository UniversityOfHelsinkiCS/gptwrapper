import type { RagIndex } from '../../db/models'

import { PGVectorStore, DistanceStrategy } from '@langchain/pgvector'
import { PoolConfig } from 'pg'
import { getEmbedder } from './embedder'
import { VECTORDB_DATABASE, VECTORDB_HOST, VECTORDB_PASSWORD, VECTORDB_PORT, VECTORDB_USER } from 'src/server/util/config'
import { Document } from '@langchain/core/documents'
import { randomUUID } from 'node:crypto'

const config = {
  postgresConnectionOptions: {
    host: VECTORDB_HOST,
    port: VECTORDB_PORT,
    user: VECTORDB_USER,
    password: VECTORDB_PASSWORD,
    database: VECTORDB_DATABASE,
  } as PoolConfig,
  tableName: 'documents',
  columns: {
    idColumnName: 'id',
    vectorColumnName: 'vector',
    contentColumnName: 'content',
    metadataColumnName: 'metadata',
  },
  distanceStrategy: 'cosine' as DistanceStrategy,
}

const ollamaEmbedder = getEmbedder()

// This also initializes the table, if it does not exist yet
const vectorStore = await PGVectorStore.initialize(ollamaEmbedder, config)

// Improve nn-search with HNSW index
await vectorStore.createHnswIndex({
  dimensions: 1024,
  m: 16,
  efConstruction: 64,
})

export const vectorPool = vectorStore.pool

// Make sure FTS exists
await vectorPool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS fts_index tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;`)

// Every search, delete and re-ingest filters the chunks by the RAG index they belong to (`metadata.ragIndex`).
await vectorPool.query(`CREATE INDEX IF NOT EXISTS documents_rag_index_idx ON documents ((metadata->>'ragIndex'));`)

/** Semantic search over the chunks of one RAG index (`ragIndex-<id>`). */
export const getRetriever = (indexName: string) =>
  vectorStore.asRetriever({
    searchType: 'mmr',
    k: 6,
    filter: {
      ragIndex: indexName,
    },
  })

/** The chunks of one RAG index in the shared `documents` table, told apart by `metadata.ragIndex`. */
export class RagVectorStore {
  constructor(private indexName: string) {}

  static fromRagIndex(ragIndex: RagIndex) {
    return new RagVectorStore(`ragIndex-${ragIndex.id}`)
  }

  async addDocuments(documents: Document[]) {
    await vectorStore.addDocuments(documents, { ids: documents.map(() => randomUUID()) })
  }

  async deleteAllDocuments() {
    await vectorStore.delete({ filter: { ragIndex: this.indexName } })
  }
}
