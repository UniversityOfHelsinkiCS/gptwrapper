import { createClient } from 'redis'
import { redisClient } from '../../util/redis'

const SCHEMA = {
  content: {
    type: 'TEXT',
  },
  metadata: {
    type: 'TEXT',
  },
  content_vector: {
    type: 'VECTOR',
    ALGORITHM: 'HNSW',
    TYPE: 'FLOAT32',
    DIM: 1024, // Check that this matches the embedder output dimension. For example if the model is changed, may need to change this.
    DISTANCE_METRIC: 'COSINE',
  },
} as const

export type RedisDocument = {
  id?: string
  content: string
  metadata: string
  content_vector: number[]
}

export class RedisVectorStore {
  client: ReturnType<typeof createClient>
  indexName: string

  constructor(indexName: string) {
    this.client = redisClient
    this.indexName = indexName
  }

  async createIndex() {
    try {
      await this.client.ft.create(this.indexName, SCHEMA, {
        ON: 'HASH',
        PREFIX: `doc:${this.indexName}:`,
      })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.message === 'Index already exists') {
        console.log('Index exists already, skipping creation.')
      } else {
        throw err
      }
    }
  }

  async addDocuments(documents: RedisDocument[]) {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
    const pipeline = this.client.multi()

    for (const doc of documents) {
      if (!doc.id) {
        throw new Error('Document must have an id')
      }
      const docId = `doc:${this.indexName}:${doc.id}`
      pipeline.hSet(docId, {
        content: doc.content,
        metadata: doc.metadata,
        content_vector: Buffer.from(new Float32Array(doc.content_vector).buffer),
      })
    }
    await pipeline.exec()
  }

  async deleteAllDocuments() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
    let cursor = '0'
    do {
      const reply = await this.client.scan(cursor, {
        MATCH: `doc:${this.indexName}:*`,
        COUNT: 100,
      })
      cursor = reply.cursor
      if (reply.keys.length > 0) {
        await this.client.del(reply.keys)
      }
    } while (cursor !== '0')
  }

  async dropIndex() {
    await this.deleteAllDocuments()
    try {
      await this.client.ft.dropIndex(this.indexName)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.message === 'Unknown Index name') {
        console.log('Index does not exist, skipping drop.')
      } else {
        throw err
      }
    }
  }
}
