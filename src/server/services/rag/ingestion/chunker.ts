import { Transform } from 'node:stream'
import {
  createSplittedTitleChunks,
  createStaticChunks,
  createTitleChunks,
} from './chunkingAlgorithms.ts'
import type { FileData } from './loader.ts'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

export class Chunker extends Transform {
  private cachePath: string

  constructor(cachePath: string) {
    super({ objectMode: true })

    this.cachePath = cachePath + '/chunks'

    // Make sure the cache path exists
    mkdirSync(this.cachePath, { recursive: true })
  }

  _transform(
    data: FileData,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    const chunks = createSplittedTitleChunks(data)
    for (const chunk of chunks) {
      this.push(chunk)
    }

    // Save chunks to cache

    Promise.all(
      chunks.map((chunk) => {
        const chunkPath = `${this.cachePath}/${chunk.id}.json`
        return writeFile(chunkPath, JSON.stringify(chunk, null, 2), 'utf-8')
      })
    ).then(() => {
      callback()
    })
  }
}
