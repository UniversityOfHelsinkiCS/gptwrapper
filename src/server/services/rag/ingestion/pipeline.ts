import { stat, mkdir, rm } from 'node:fs/promises'
import { loadFiles } from './loader.ts'
import { createChunks } from './chunker.ts'
import { Embedder } from './embedder.ts'
import { storeChunk } from './storer.ts'
import type OpenAI from 'openai'
import RagIndex from '../../../db/models/ragIndex.ts'
import { extractTextFromFileData } from './textExtractor.ts'
import RagFile from '../../../db/models/ragFile.ts'
import { User } from '../../../types.ts'

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

export const ingestionPipeline = async (client: OpenAI, loadpath: string, ragIndex: RagIndex, user: User) => {
  await initPipelineCache()

  const existingRagFiles = await RagFile.findAll({
    where: { ragIndexId: ragIndex.id, pipelineStage: 'completed' },
  })

  const pendingRagFiles = await RagFile.findAll({
    where: { ragIndexId: ragIndex.id, pipelineStage: 'pending' },
  })

  loadFiles(loadpath, async (fileData) => {
    if (existingRagFiles.some((file) => file.filename === fileData.fileName)) {
      console.warn(`File ${fileData.fileName} already exists in the index, skipping...`)
      return
    }

    const ragFile = pendingRagFiles.find((file) => file.filename === fileData.fileName)
    if (!ragFile) {
      console.warn(`RagFile ${fileData.fileName} not found in DB`)
      return
    }

    await RagFile.update(
      {
        filename: fileData.fileName,
        fileType: fileData.type,
        fileSize: 0,
        userId: user.id,
        ragIndexId: ragIndex.id,
        pipelineStage: 'extractText',
      },
      {
        where: { id: ragFile.id },
      },
    )

    // Text extraction
    const textData = await extractTextFromFileData(fileData, pipelineCachePath).catch((error) => {
      throw error
    })

    await RagFile.update(
      {
        fileSize: textData.content.length,
        pipelineStage: 'chunk',
        metadata: {
          chunkingStrategy: textData.chunkingStrategy,
        },
      },
      {
        where: { id: ragFile.id },
      },
    )

    // Chunking
    const chunks = await createChunks(textData, pipelineCachePath).catch((error) => {
      throw error
    })

    await RagFile.update(
      {
        numChunks: chunks.length,
        pipelineStage: 'embed',
      },
      {
        where: { id: ragFile.id },
      },
    )

    const embedder = new Embedder(client, pipelineCachePath, 10)
    const embeddedChunks = []
    for await (const chunk of chunks) {
      const batchEmbeddedChunks = await embedder.addChunk(chunk).catch((error) => {
        throw error
      })

      if (batchEmbeddedChunks) {
        embeddedChunks.push(...batchEmbeddedChunks)
      }
    }

    const batchEmbeddedChunks = await embedder.flush().catch((error) => {
      throw error
    })
    embeddedChunks.push(...batchEmbeddedChunks)

    await RagFile.update(
      {
        pipelineStage: 'store',
      },
      {
        where: { id: ragFile.id },
        returning: true,
      },
    )

    // Storing
    for await (const chunk of batchEmbeddedChunks) {
      await storeChunk(ragIndex, ragFile, chunk).catch((error) => {
        throw error
      })
    }

    await RagFile.update(
      {
        pipelineStage: 'completed',
      },
      {
        where: { id: ragFile.id },
      },
    )
  })
}
