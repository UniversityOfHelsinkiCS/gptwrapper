import { RAG_LANGUAGES } from '@shared/lang'
import type { RagIndex } from '../../db/models'

import { PGVectorStore, DistanceStrategy } from "@langchain/pgvector";
import { PoolConfig } from "pg";
import { getEmbedder } from './embedder';
import { VECTORDB_DATABASE, VECTORDB_HOST, VECTORDB_PASSWORD, VECTORDB_PORT, VECTORDB_USER } from 'src/server/util/config';
import { Document } from "@langchain/core/documents";
import { randomUUID } from 'node:crypto';


const config = {
  postgresConnectionOptions: {
    host: VECTORDB_HOST,
    port: VECTORDB_PORT,
    user: VECTORDB_USER,
    password: VECTORDB_PASSWORD,
    database: VECTORDB_DATABASE,
  } as PoolConfig,
  tableName: "documents",
  columns: {
    idColumnName: "id",
    vectorColumnName: "vector",
    contentColumnName: "content",
    metadataColumnName: "metadata",
  },
  distanceStrategy: "cosine" as DistanceStrategy,
};

const ollamaEmbedder = getEmbedder()

// This also initializes the table, if it does not exist yet
const vectorStore = await PGVectorStore.initialize(ollamaEmbedder, config);

export const vectorPool = vectorStore.pool

// Make sure FTS exists
await vectorPool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS fts_index tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;`)

export const retriever = vectorStore.asRetriever({
  searchType: "mmr",
  k: 6,
});

export class CustomPGVectorStore {
  indexName: string
  store: PGVectorStore
  language: typeof RAG_LANGUAGES[number]

  constructor(indexName: string, language: typeof RAG_LANGUAGES[number]) {
    this.indexName = indexName
    this.language = language
    this.store = vectorStore
  }

  static fromRagIndex(ragIndex: RagIndex) {
    console.log("Asked for", ragIndex)
    return new CustomPGVectorStore(`ragIndex-${ragIndex.id}`, ragIndex.metadata.language ?? 'English')
  }

  async createIndex() {
    console.log("Called stubbed function createIndex")
  }

  async addDocuments(documents: Document[]) {
    console.log("Asked to add documents", this.indexName, documents)

    await this.store.addDocuments(documents, { ids: documents.map(_doc => randomUUID())})
  }


    async deleteAllDocuments() {
      console.log("Deleted all under", this.indexName)
      await this.store.delete({ filter: { ragIndex: this.indexName } });
  }

  async dropIndex() {
    await this.deleteAllDocuments()
    console.log("Dropped stub", this.indexName)
  }
}

export const RedisVectorStore = CustomPGVectorStore