import { Writable } from 'node:stream'
import type { EmbeddedChunk } from './embedder.ts'
import { addChunk } from '../chunkDb.ts'
import RagIndex from '../../../db/models/ragIndex.ts'
import { StageReporter } from './progressReporter.ts'

export class RedisStorer extends Writable {
  private ragIndex: RagIndex
  public progressReporter: StageReporter

  constructor(ragIndex: RagIndex) {
    super({ objectMode: true })
    this.ragIndex = ragIndex
  }

  async _write(chunk: EmbeddedChunk, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    await addChunk(this.ragIndex, {
      id: chunk.id,
      metadata: chunk.metadata,
      content: chunk.content.join('\n'),
      embedding: chunk.embedding,
    })
    this.progressReporter.reportProgress(chunk.metadata.filename)
    callback()
  }

  _final(callback: (error?: Error | null) => void) {
    this.progressReporter.reportDone()
    callback()
  }
}
