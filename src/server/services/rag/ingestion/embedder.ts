import type { Chunk } from './chunkingAlgorithms.ts'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { getEmbeddingVectorBatch, getOllamaEmbeddingVectorBatch } from '../embed'
import OpenAI from 'openai'

export type EmbeddedChunk = Chunk & {
  embedding: number[]
}

export class Embedder {
  private cachePath: string
  private client: OpenAI
  private currentBatch: Chunk[] = []
  private batchSize: number // Number of chunks to embed at once

  constructor(client: OpenAI, cachePath: string, batchSize: number) {
    this.batchSize = batchSize
    this.client = client
    this.cachePath = cachePath + '/embeddings'

    // Make sure the cache path exists
    mkdirSync(this.cachePath, { recursive: true })
  }

  async flush() {
    return await this.embedBatch()
  }

  async addChunk(chunk: Chunk): Promise<EmbeddedChunk[] | undefined> {
    this.currentBatch.push(chunk)

    if (this.currentBatch.length < this.batchSize) {
      // Batch not yet full, wait for more chunks
      return
    }

    // Batch is full, process the batch
    return await this.embedBatch()
  }

  private async embedBatch() {
    const chunkContents = this.currentBatch.map((chunk) => chunk.content.join('\n'))
    const startedAt = Date.now()
    const result = await getOllamaEmbeddingVectorBatch(chunkContents)
    const elapsed = Date.now() - startedAt
    console.log(`Embedded ${chunkContents.length} chunks in ${elapsed}ms`)

    const embeddedChunks: EmbeddedChunk[] = this.currentBatch.map((chunk, index) => ({
      ...chunk,
      embedding: result[index],
    }))

    await Promise.all(
      embeddedChunks.map(async (embeddedChunk) => {
        // Save embedded chunk to cache
        const path = `${this.cachePath}/${embeddedChunk.id}.json`
        await writeFile(path, JSON.stringify(embeddedChunk, null, 2), 'utf-8')
      }),
    )

    // Reset the current batch
    this.currentBatch = []

    return embeddedChunks
  }
}
