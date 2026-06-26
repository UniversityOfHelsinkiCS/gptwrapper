import { Document } from '@langchain/core/documents'
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { RagFile, type RagIndex } from '../../db/models'
import { pdfQueueEvents, simplyParsePdf, submitAdvancedParsingJobs } from '../jobs/pdfParsing.job'
import { FileStore, isBinaryFile, isImage } from './fileStore'
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

  await ragFile.update({ error: null, pipelineStage: 'ingesting' })

  const vectorStore = RedisVectorStore.fromRagIndex(ragIndex)

  let progress = 2.5
  const update = {
    ragFileId: ragFile.id,
    error: undefined,
    pipelineStage: 'ingesting' as IngestionPipelineStageKey,
    progress,
    message: 'Scanning file',
    eta: undefined,
  }

  await updateRagFileStatus(ragFile, update)
  const existingText = await FileStore.readRagFileTextContent(ragFile)
  const needToParse = existingText === null

  // Only binary files (PDF/image) require a text-extraction step; their extracted text is cached
  // separately. For plain text files the uploaded content IS the text, so missing content here is a
  // genuine read failure rather than a reason to run PDF parsing.
  if (needToParse && !isBinaryFile(ragFile)) {
    logger.error(`File content missing or unreadable for ${ragFile.filename} in S3`)
    await ragFile.update({ error: 'File content is missing or could not be read', pipelineStage: 'error' })
    return
  }

  // Images can only be read with VLM parsing, so always use it for them regardless of the upload flag.
  const needToParseWithVlm = needToParse && isBinaryFile(ragFile) && (isImage(ragFile) || ragFile.metadata?.advancedParsing)
  progress = 5
  await updateRagFileStatus(ragFile, { ...update, message: needToParse ? 'Extracting text' : 'Found cached text' })
  let finalText: string | null = existingText

  if (needToParseWithVlm) {
    // Advanced PDF parsing with job processing.
    const pages = await submitAdvancedParsingJobs(ragFile)

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

      const jobPromises = pages.map(async (p, index) => {
        try {
          const text = await p.job!.waitUntilFinished(pdfQueueEvents)
          return { index, text, success: true }
        } catch (error) {
          logger.error('Page job failed: ', p.job!.id, error)
          return { index, text: p.text, success: false }
        }
      })

      const transcriptions: Array<string> = new Array(total)

      for await (const result of jobPromises.map((p) => p.then((r) => r))) {
        transcriptions[result.index] = result.text
        completed += 1

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
    } catch (error: any) {
      logger.error('Error waiting for PDF parsing jobs to finish:', error)
      await ragFile.update({ error: 'PDF parsing failed', pipelineStage: 'error' })
      return
    }
  } else if (needToParse) {
    // Standard (non-VLM) PDF text extraction. Only reached by binary files thanks to the guard above.
    const pages = await simplyParsePdf(ragFile)

    finalText = pages.map((p) => p.text).join('\n\n')

    await FileStore.writeRagFileTextContent(ragFile, finalText)
  } else {
    // Text file content read directly, or previously-extracted text served from cache.
    progress = 50

    await updateRagFileStatus(ragFile, {
      ...update,
      progress,
      message: 'Using cached text content',
      eta: 7000,
    })
  }

  if (finalText === null) {
    logger.error('Error reading rag file text: file does not exist')
    await ragFile.update({ error: 'Error reading rag file text: file does not exist' })
    return
  }

  await updateRagFileStatus(ragFile, {
    ...update,
    message: 'Splitting into chunks',
    progress: Math.max(progress, 60),
    eta: 6000,
  })

  const document = new Document({
    pageContent: finalText,
  })

  const splitter = isMarkdown(ragFile.fileType) ? markdownTextSplitter : defaultTextSplitter

  const chunkDocuments = await splitter.splitDocuments([document])

  let idx = 0
  for (const chunkDocument of chunkDocuments) {
    chunkDocument.id = `${ragFile.filename}:${idx}`
    chunkDocument.metadata = {
      ...chunkDocument.metadata,
      ragFileName: ragFile.filename,
    }
    idx++
  }

  await updateRagFileStatus(ragFile, {
    ...update,
    message: `Embedding chunks`,
    progress: 70,
    eta: 5000,
  })

  const embedder = getEmbedder()
  const embeddings = await embedder.embedDocuments(chunkDocuments.map((d) => d.pageContent))

  await updateRagFileStatus(ragFile, {
    ...update,
    message: 'Saving vectors',
    progress: 95,
    eta: 1000,
  })

  await vectorStore.addDocuments(
    chunkDocuments.map((doc, i) => ({
      id: doc.id!,
      content: doc.pageContent,
      metadata: JSON.stringify(doc.metadata),
      content_vector: embeddings[i],
    })),
  )

  await updateRagFileStatus(ragFile, {
    ...update,
    pipelineStage: 'completed',
    message: undefined,
    progress: 100,
    eta: undefined,
  })

  const ingestionDurationMs = Date.now() - ingestionStartMs
  logger.info('RAG ingestion completed', { ragFileId: ragFile.id, durationMs: ingestionDurationMs })
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
