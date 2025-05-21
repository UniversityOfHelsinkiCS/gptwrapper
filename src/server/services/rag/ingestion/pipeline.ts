import { stat, mkdir, rm } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { FileLoader } from './loader.ts'
import { Chunker } from './chunker.ts'
import { Embedder } from './embedder.ts'
import { RedisStorer } from './storer.ts'
import type OpenAI from 'openai'
import RagIndex from '../../../db/models/ragIndex.ts'
import { TextExtractor } from './textExtractor.ts'
import { ProgressReporter } from './progressReporter.ts'
import { IngestionPipelineStageKeys } from '../../../../shared/constants.ts'

// Pipeline debug cache in pipeline/
// Check if exists, if not create it.
// For now, also delete it if exists
const pipelineCachePath = 'pipeline'
const initPipelineCache = async () => {
  try {
    await stat(pipelineCachePath)
    await rm(pipelineCachePath, { recursive: true, force: true })
  } catch (error) {
    console.warn(`Pipeline cache not found, creating ${pipelineCachePath} --- `, error)
  }
  await mkdir(pipelineCachePath)
}

export const ingestionPipeline = async (client: OpenAI, loadpath: string, ragIndex: RagIndex) => {
  await initPipelineCache()

  const progressReporter = new ProgressReporter()

  const stages = [
    new FileLoader(loadpath),
    new TextExtractor(pipelineCachePath),
    new Chunker(pipelineCachePath),
    new Embedder(client, pipelineCachePath, 10),
    new RedisStorer(ragIndex),
  ]

  stages.forEach((stage, idx) => {
    stage.progressReporter = progressReporter.getStageReporter(IngestionPipelineStageKeys[idx], idx)
  })

  pipeline(stages)
    .then(() => {
      console.log('Pipeline completed')
      progressReporter.emit('end')
    })
    .catch((error) => {
      console.error('Unhandled pipeline error:', error)
      progressReporter.reportError(error)
    })

  return progressReporter
}
