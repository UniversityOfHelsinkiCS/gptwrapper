import { Writable } from 'node:stream'
import type { EmbeddedChunk } from './embedder.ts'
import { addChunk } from '../chunkDb.ts'
import RagIndex from '../../../db/models/ragIndex.ts'

export class RedisStorer extends Writable {
  private ragIndex: RagIndex

  constructor(ragIndex: RagIndex) {
    super({ objectMode: true })
    this.ragIndex = ragIndex
  }

  async _write(
    chunk: EmbeddedChunk,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    await addChunk(this.ragIndex, {
      id: chunk.id,
      metadata: chunk.metadata,
      content: chunk.content.join('\n'),
      embedding: chunk.embedding,
    })
    callback()
  }
}
