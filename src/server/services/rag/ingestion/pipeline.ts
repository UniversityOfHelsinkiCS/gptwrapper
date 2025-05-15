import { stat, mkdir, rm } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { FileLoader } from './loader.ts'
import { Chunker } from './chunker.ts'
import { Embedder } from './embedder.ts'
import { RedisStorer } from './storer.ts'
import type OpenAI from 'openai'
import RagIndex from '../../../db/models/ragIndex.ts'

// Pipeline debug cache in pipeline/
// Check if exists, if not create it.
// For now, also delete it if exists
const pipelineCachePath = 'pipeline'
const initPipelineCache = async () => {
  try {
    await stat(pipelineCachePath)
    await rm(pipelineCachePath, { recursive: true, force: true })
  } catch (error) {
    console.warn(
      `Pipeline cache not found, creating ${pipelineCachePath} --- `,
      error
    )
  }
  await mkdir(pipelineCachePath)
}

export const ingestionPipeline = async (
  client: OpenAI,
  loadpath: string,
  ragIndex: RagIndex
) => {
  await initPipelineCache()

  await pipeline([
    new FileLoader(loadpath),
    new Chunker(pipelineCachePath),
    new Embedder(client, pipelineCachePath),
    new RedisStorer(ragIndex),
  ])
}
