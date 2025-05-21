import { chunkingAlgorithms } from './chunkingAlgorithms.ts'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { TextData } from './textExtractor.ts'

export async function createChunks(data: TextData, cachePath: string) {
  const chunksDir = `${cachePath}/chunks`
  mkdirSync(chunksDir, { recursive: true })

  const chunkingAlgorithm = chunkingAlgorithms[data.chunkingStrategy]
  const chunks = chunkingAlgorithm(data)

  await Promise.all(
    chunks.map((chunk) => {
      const chunkPath = `${chunksDir}/${chunk.id}.json`
      return writeFile(chunkPath, JSON.stringify(chunk, null, 2), 'utf-8')
    }),
  )

  return chunks
}
