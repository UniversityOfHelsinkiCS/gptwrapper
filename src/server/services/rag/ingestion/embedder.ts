import { Transform } from 'node:stream'
import type { Chunk } from './chunkingAlgorithms.ts'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { getEmbeddingVector } from '../embed'
import OpenAI from 'openai'

export type EmbeddedChunk = Chunk & {
  embedding: number[]
}

export class Embedder extends Transform {
  private cachePath: string
  private client: OpenAI

  constructor(client: OpenAI, cachePath: string) {
    super({ objectMode: true })

    this.client = client
    this.cachePath = cachePath + '/embeddings'

    // Make sure the cache path exists
    mkdirSync(this.cachePath, { recursive: true })
  }

  async _transform(chunk: Chunk, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    try {
      const embedding = await getEmbeddingVector(this.client, chunk.content.join('\n'))
      const embeddedChunk: EmbeddedChunk = {
        ...chunk,
        embedding,
      }

      this.push(embeddedChunk)

      // Save embedded chunk to cache
      const path = `${this.cachePath}/${chunk.id}.json`
      await writeFile(path, JSON.stringify(embeddedChunk, null, 2), 'utf-8')

      callback()
    } catch (error) {
      console.error(`Error saving chunk to cache: ${error}`)
      callback(error as Error)
    }
  }
}
