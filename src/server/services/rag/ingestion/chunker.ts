import { Transform } from 'node:stream'
import { chunkingAlgorithms } from './chunkingAlgorithms.ts'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { TextData } from './textExtractor.ts'

export class Chunker extends Transform {
  private cachePath: string

  constructor(cachePath: string) {
    super({ objectMode: true })

    this.cachePath = cachePath + '/chunks'

    // Make sure the cache path exists
    mkdirSync(this.cachePath, { recursive: true })
  }

  _transform(data: TextData, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    const chunkingAlgorithm = chunkingAlgorithms[data.chunkingStrategy]

    const chunks = chunkingAlgorithm(data)
    for (const chunk of chunks) {
      this.push(chunk)
    }

    // Save chunks to cache

    Promise.all(
      chunks.map((chunk) => {
        const chunkPath = `${this.cachePath}/${chunk.id}.json`
        return writeFile(chunkPath, JSON.stringify(chunk, null, 2), 'utf-8')
      }),
    ).then(() => {
      callback()
    })
  }
}
