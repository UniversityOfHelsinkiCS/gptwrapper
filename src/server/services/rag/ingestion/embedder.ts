import { Transform } from 'node:stream'
import type { Chunk } from './chunkingAlgorithms.ts'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { getEmbeddingVectorBatch } from '../embed'
import OpenAI from 'openai'
import { StageReporter } from './progressReporter.ts'

export type EmbeddedChunk = Chunk & {
  embedding: number[]
}

export class Embedder extends Transform {
  private cachePath: string
  private client: OpenAI
  private currentBatch: Chunk[] = []
  private batchSize: number // Number of chunks to embed at once
  public progressReporter: StageReporter

  constructor(client: OpenAI, cachePath: string, batchSize: number) {
    super({ objectMode: true })

    this.batchSize = batchSize
    this.client = client
    this.cachePath = cachePath + '/embeddings'

    // Make sure the cache path exists
    mkdirSync(this.cachePath, { recursive: true })
  }

  async _flush(callback: (error?: Error | null) => void) {
    await this.embedBatch(callback)
    this.progressReporter.reportDone()
  }

  async _transform(chunk: Chunk, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.currentBatch.push(chunk)

    if (this.currentBatch.length < this.batchSize) {
      // Batch not yet full, wait for more chunks
      callback()
      return
    }

    // Batch is full, process the batch
    await this.embedBatch(callback)
  }

  private async embedBatch(callback: (error?: Error | null) => void) {
    const currentBatchFilenames = this.currentBatch.map((chunk) => chunk.metadata.filename)
    try {
      const chunkContents = this.currentBatch.map((chunk) => chunk.content.join('\n'))
      const startedAt = Date.now()
      const result = await getEmbeddingVectorBatch(this.client, chunkContents)
      const elapsed = Date.now() - startedAt
      console.log(`Embedded ${chunkContents.length} chunks in ${elapsed}ms`)

      const embeddedChunks: EmbeddedChunk[] = this.currentBatch.map((chunk, index) => ({
        ...chunk,
        embedding: result[index].embedding,
      }))

      embeddedChunks.forEach(async (embeddedChunk) => {
        this.push(embeddedChunk)

        // Save embedded chunk to cache
        const path = `${this.cachePath}/${embeddedChunk.id}.json`
        await writeFile(path, JSON.stringify(embeddedChunk, null, 2), 'utf-8')
      })
      this.progressReporter.reportProgress(currentBatchFilenames)

      // Reset the current batch
      this.currentBatch = []

      callback()
    } catch (error) {
      console.error(`Embedding stage ${error}`)
      this.progressReporter.reportError('Embedding chunk failed', currentBatchFilenames)
      callback(error as Error)
    }
  }
}
