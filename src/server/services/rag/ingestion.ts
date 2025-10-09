import { Document } from '@langchain/core/documents'
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { RagFile, type RagIndex } from '../../db/models'
import { pdfQueueEvents, submitPdfParsingJobs } from '../jobs/pdfParsing.job'
import { FileStore } from './fileStore'
import { getRedisVectorStore } from './vectorStore'
import { ingestionQueueEvents, submitIngestionJob } from '../jobs/ingestion.job'
import { Job } from 'bullmq'

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
    console.warn('No rag files given to ingestRagFiles')
    return
  }

  const vectorStore = getRedisVectorStore(ragIndex.id, ragIndex.metadata.language)
  await vectorStore.dropIndex()

  await Promise.all(
    ragFiles.map(async (rf) => {
      const job = await submitIngestionJob(rf)
      await job.waitUntilFinished(ingestionQueueEvents)
    }),
  )
}

export const ingestRagFile = async (ragFile: RagFile, ragIndex: RagIndex, job: Job) => {
  console.time(`Ingestion ${ragFile.filename}`)

  await ragFile.update({ error: null, pipelineStage: 'ingesting' })

  const vectorStore = getRedisVectorStore(ragFile.ragIndexId, ragIndex.metadata.language)

  const needToParse = (await FileStore.readRagFileTextContent(ragFile)) === null

  let progress = 2.5
  await job.updateProgress({ progress, message: 'Scanning file' })

  let finalText: string | null = null

  if (needToParse) {
    const pages = await submitPdfParsingJobs(ragFile)

    try {

      const start = 5
      const end = 97.5
      const total = pages.length || 1
      let completed = 0

      const transcriptions: Array<string> = []
      for (const p of pages) {
        let text = ''
        try {
          text = await p.job!.waitUntilFinished(pdfQueueEvents)
        } catch (error) {
          console.error('Page job failed: ', p.job!.id, error)
          text = p.text
        } finally {
          transcriptions.push(text)
          completed += 1
          const fraction = completed / total
          const pct = Math.round(start + (end - start) * fraction)
          await job.updateProgress({ progress: pct, message: 'Parsing' })
        }
      }

      finalText = transcriptions.join('\n\n')

      await FileStore.writeRagFileTextContent(ragFile, finalText)

    } catch (error: any) {
      console.error('Error waiting for PDF parsing jobs to finish:', error)
      await ragFile.update({ error: 'PDF parsing failed', pipelineStage: 'error' })
      return
    }
  } else {
    progress = 50
    finalText = await FileStore.readRagFileTextContent(ragFile)
  }
  await job.updateProgress({ progress, message: 'Embedding', eta: 2000 })

  if (finalText === null) {
    console.error('Error reading rag file text: file does not exist')
    await ragFile.update({ error: 'Error reading rag file text: file does not exist' })
    return
  }

  const document = new Document({
    pageContent: finalText,
  })

  const splitter = isMarkdown(ragFile.fileType) ? markdownTextSplitter : defaultTextSplitter

  const chunkDocuments = await splitter.splitDocuments([document])

  await job.updateProgress({ progress, message: 'Embedding', eta: chunkDocuments.length * 25 })

  let idx = 0
  for (const chunkDocument of chunkDocuments) {
    chunkDocument.id = `ragIndex-${ragFile.ragIndexId}-${ragFile.filename}-${idx}`
    chunkDocument.metadata = {
      ...chunkDocument.metadata,
      ragFileName: ragFile.filename,
    }
    idx++
  }

  const embeddings = await vectorStore.embeddings.embedDocuments(chunkDocuments.map((d) => d.pageContent))

  await vectorStore.addVectors(embeddings, chunkDocuments)

  await ragFile.update({ pipelineStage: 'completed' })

  console.timeEnd(`Ingestion ${ragFile.filename}`)
}
