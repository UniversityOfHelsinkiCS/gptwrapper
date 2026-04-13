import { Document } from '@langchain/core/documents'
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { RagFile, type RagIndex } from '../../db/models'
import { pdfQueueEvents, simplyParsePdf, submitAdvancedParsingJobs } from '../jobs/pdfParsing.job'
import { FileStore } from './fileStore'
import logger from 'src/server/util/logger'
import type { IngestionJobStatus, IngestionPipelineStageKey } from '@shared/ingestion'
import type { RagFileMetadata } from '@shared/types'
import { RedisVectorStore } from './vectorStore'
import { getEmbedder } from './embedder'

const defaultTextSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
})

const markdownTextSplitter = new MarkdownTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
})

const isMarkdown = (mimetype: string) => mimetype === 'text/markdown'

export const ingestRagFiles = async (ragIndex: RagIndex, ragFiles?: RagFile[]) => {
  if (!ragFiles) {
    ragFiles = await RagFile.findAll({ where: { ragIndexId: ragIndex.id } })
  }

  if (ragFiles.length === 0) {
    logger.warn('No rag files given to ingestRagFiles')
    return
  }

  for await (const rf of ragFiles) {
    try {
      await ingestRagFile(rf, ragIndex)
    } catch (error: any) {
      logger.error(`Ingestion failed for ${rf.filename}:`, error)
      await updateRagFileStatus(rf, { ragFileId: rf.id, progress: 100, eta: 0, message: 'Ingestion failed', pipelineStage: 'error', error: error.message })
    }
  }
}

export const ingestRagFile = async (ragFile: RagFile, ragIndex: RagIndex) => {
  const ingestionStartMs = Date.now()

  console.log("1")
  await ragFile.update({ error: null, pipelineStage: 'ingesting' })

  console.log("2")
  const vectorStore = RedisVectorStore.fromRagIndex(ragIndex)

  console.log("3")
  let progress = 2.5
  const update = {
    ragFileId: ragFile.id,
    error: undefined,
    pipelineStage: 'ingesting' as IngestionPipelineStageKey,
    progress,
    message: 'Scanning file',
    eta: undefined,
  }

  console.log("4")
  await updateRagFileStatus(ragFile, update)
  const needToParse = (await FileStore.readRagFileTextContent(ragFile)) === null
  const needToParseWithVlm = needToParse && ragFile.metadata?.advancedParsing
  progress = 5
  await updateRagFileStatus(ragFile, { ...update, message: needToParse ? 'Preparing to parse PDF' : 'Found cached text' })
  let finalText: string | null = null

  console.log("5")
  if (needToParseWithVlm) {
    // Advanced PDF parsing with job processing.
    const pages = await submitAdvancedParsingJobs(ragFile)

    console.log("6")
    try {
      const start = 5
      const end = 60
      const total = pages.length || 1
      let completed = 0

      await updateRagFileStatus(ragFile, {
        ...update,
        message: total > 1 ? `Parsing ${total} pages` : 'Parsing',
        eta: total * 10000,
      })

      console.log("7")
      const jobPromises = pages.map(async (p, index) => {
        try {
          const text = await p.job!.waitUntilFinished(pdfQueueEvents)
          console.log("8")
          return { index, text, success: true }

        } catch (error) {
          logger.error('Page job failed: ', p.job!.id, error)
          console.log("9")
          return { index, text: p.text, success: false }
        }
      })

      const transcriptions: Array<string> = new Array(total)

          console.log("10")
      for await (const result of jobPromises.map((p) => p.then((r) => r))) {
        transcriptions[result.index] = result.text
        completed += 1

          console.log("11")
        const fraction = completed / total

        const pct = Math.round(start + (end - start) * fraction)
        progress = pct

        await updateRagFileStatus(ragFile, {
          ...update,
          progress,
          message: `Parsing (${completed}/${total})`,
          eta: Math.round((total - completed) * 6000),
        })
      }

      finalText = transcriptions.join('\n\n')

      await FileStore.writeRagFileTextContent(ragFile, finalText)
          console.log("11")
    } catch (error: any) {
      logger.error('Error waiting for PDF parsing jobs to finish:', error)
      await ragFile.update({ error: 'PDF parsing failed', pipelineStage: 'error' })
          console.log("12")
      return
    }
  } else if (needToParse) {
    // Simple PDF parsing.
          console.log("13")
    const pages = await simplyParsePdf(ragFile)

    finalText = pages.map((p) => p.text).join('\n\n')

    await FileStore.writeRagFileTextContent(ragFile, finalText)
          console.log("14")
  } else {
    progress = 50
    finalText = await FileStore.readRagFileTextContent(ragFile)

    console.log("15")
    await updateRagFileStatus(ragFile, {
      ...update,
      progress,
      message: 'Using cached text content',
      eta: 7000,
    })
  }

  console.log("16")
  if (finalText === null) {
    logger.error('Error reading rag file text: file does not exist')
    await ragFile.update({ error: 'Error reading rag file text: file does not exist' })
    console.log("17")
    return
  }

  await updateRagFileStatus(ragFile, {
    ...update,
    message: 'Splitting into chunks',
    progress: Math.max(progress, 60),
    eta: 6000,
  })

  console.log("18")
  const document = new Document({
    pageContent: finalText,
  })

  const splitter = isMarkdown(ragFile.fileType) ? markdownTextSplitter : defaultTextSplitter

  const chunkDocuments = await splitter.splitDocuments([document])

  console.log("19")
  let idx = 0
  for (const chunkDocument of chunkDocuments) {
    chunkDocument.id = `${ragFile.filename}:${idx}`
    chunkDocument.metadata = {
      ...chunkDocument.metadata,
      ragFileName: ragFile.filename,
    }
    console.log("20")
    idx++
  }

          console.log("21")
  await updateRagFileStatus(ragFile, {
    ...update,
    message: `Embedding chunks`,
    progress: 70,
    eta: 5000,
  })

          console.log("22")
  const embedder = getEmbedder()
  const embeddings = await embedder.embedDocuments(chunkDocuments.map((d) => d.pageContent))

          console.log("23")
  await updateRagFileStatus(ragFile, {
    ...update,
    message: 'Saving vectors',
    progress: 95,
    eta: 1000,
  })

          console.log("24")
  await vectorStore.addDocuments(
    chunkDocuments.map((doc, i) => ({
      id: doc.id!,
      content: doc.pageContent,
      metadata: JSON.stringify(doc.metadata),
      content_vector: embeddings[i],
    })),
  )

          console.log("25")
  await updateRagFileStatus(ragFile, {
    ...update,
    pipelineStage: 'completed',
    message: undefined,
    progress: 100,
    eta: undefined,
  })

          console.log("26")
  const ingestionDurationMs = Date.now() - ingestionStartMs
  logger.info('RAG ingestion completed', { ragFileId: ragFile.id, durationMs: ingestionDurationMs })
  console.log("finale 27")
}

export const updateRagFileStatus = async (ragFile: RagFile, update: IngestionJobStatus) => {
  const payload: Partial<RagFile> = {}

  if (update.progress !== null) {
    payload.progress = Math.max(0, Math.min(100, update.progress))
  }

  if (update.pipelineStage !== undefined) {
    payload.pipelineStage = update.pipelineStage
  }

  if (update.error !== undefined) {
    payload.error = update.error
  }

  const currentMeta: RagFileMetadata = ragFile.metadata ? { ...ragFile.metadata } : {}
  if (update.eta !== null) currentMeta.eta = update.eta
  if (update.message !== null) currentMeta.message = update.message
  payload.metadata = currentMeta

  await ragFile.update(payload)
}
