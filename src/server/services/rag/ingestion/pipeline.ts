import { stat, mkdir, rm } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { loadFiles } from './loader.ts'
import { createChunks } from './chunker.ts'
import { Embedder } from './embedder.ts'
import { storeChunk } from './storer.ts'
import type OpenAI from 'openai'
import RagIndex from '../../../db/models/ragIndex.ts'
import { extractTextFromFileData } from './textExtractor.ts'
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

  ;(async () => {
    for await (const fileData of loadFiles(loadpath)) {
      if (ragIndex.filenames.includes(fileData.fileName)) {
        progressReporter.reportError('readFiles', [fileData.fileName], 'File already exists in index')
        continue
      }

      progressReporter.reportProgress('readFiles', [fileData.fileName])

      // Text extraction
      const textData = await extractTextFromFileData(fileData, pipelineCachePath).catch((error) => {
        progressReporter.reportError('extractText', [fileData.fileName], 'Error extracting text')
        throw error
      })
      progressReporter.reportProgress('extractText', [fileData.fileName])

      // Chunking
      const chunks = await createChunks(textData, pipelineCachePath).catch((error) => {
        progressReporter.reportError('chunk', [fileData.fileName], 'Error creating chunks')
        throw error
      })
      progressReporter.reportProgress('chunk', [fileData.fileName])

      const embedder = new Embedder(client, pipelineCachePath, 10)
      const embeddedChunks = []
      for await (const chunk of chunks) {
        const batchEmbeddedChunks = await embedder.addChunk(chunk).catch((error) => {
          progressReporter.reportError('embed', [fileData.fileName], 'Error embedding chunk')
          throw error
        })

        if (batchEmbeddedChunks) {
          embeddedChunks.push(...batchEmbeddedChunks)
        }
      }

      const batchEmbeddedChunks = await embedder.flush().catch((error) => {
        progressReporter.reportError('embed', [fileData.fileName], 'Error embedding chunk')
        throw error
      })
      embeddedChunks.push(...batchEmbeddedChunks)
      progressReporter.reportProgress('embed', [fileData.fileName])

      // Storing
      for await (const chunk of batchEmbeddedChunks) {
        await storeChunk(ragIndex, chunk).catch((error) => {
          progressReporter.reportError('store', [fileData.fileName], 'Error storing chunk')
          throw error
        })
      }

      // Update RagIndex
      ragIndex.metadata.numOfChunks += batchEmbeddedChunks.length
      ragIndex.filenames.push(fileData.fileName)
      ragIndex.changed('metadata', true)
      ragIndex.changed('filenames', true)

      await ragIndex.save().catch((error) => {
        progressReporter.reportError('store', [fileData.fileName], 'Error updating index')
        throw error
      })

      progressReporter.reportProgress('store', [fileData.fileName])
    }
  })()

  return progressReporter
}
