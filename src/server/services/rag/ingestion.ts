import { Document } from '@langchain/core/documents'
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { RagFile, RagIndex } from '../../db/models'
import { FileStore } from './fileStore'
import { getRedisVectorStore } from './vectorStore'
import { pdfQueueEvents, submitPdfParsingJob } from '../jobs/pdfParsing.job'

const defaultTextSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 200,
})

const markdownTextSplitter = new MarkdownTextSplitter({
  chunkSize: 800,
  chunkOverlap: 200,
})

const isMarkdown = (mimetype: string) => mimetype === 'text/markdown'

export const ingestRagFiles = async (ragIndex: RagIndex) => {
  const ragFiles = await RagFile.findAll({ where: { ragIndexId: ragIndex.id } })

  if (ragFiles.length === 0) {
    console.warn('No rag files given to ingestRagFiles')
    return
  }

  const vectorStore = getRedisVectorStore(ragFiles[0].ragIndexId, ragIndex.metadata.language)
  const allDocuments: Document[] = []
  const allEmbeddings: number[][] = []

  await Promise.all(
    ragFiles.map(async (ragFile) => {
      console.time(`Ingestion ${ragFile.filename}`)

      await ragFile.save()
      let needToParse = false

      try {
        await FileStore.readRagFileTextContent(ragFile)
      } catch (error) {
        needToParse = true
      }

      if (needToParse) {
        const job = await submitPdfParsingJob(ragFile)

        try {
          await job.waitUntilFinished(pdfQueueEvents)
        } catch (error: any) {
          console.error('Error waiting for PDF parsing job to finish:', error)
          ragFile.pipelineStage = 'error'
          ragFile.error = 'PDF parsing failed'
          await ragFile.save()
          return
        }
      }

      const text = await FileStore.readRagFileTextContent(ragFile)

      ragFile.pipelineStage = 'parsed'

      const document = new Document({
        pageContent: text,
      })

      const splitter = isMarkdown(ragFile.fileType) ? markdownTextSplitter : defaultTextSplitter

      const chunkDocuments = await splitter.splitDocuments([document])

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

      allDocuments.push(...chunkDocuments)
      allEmbeddings.push(...embeddings)

      console.timeEnd(`Ingestion ${ragFile.filename}`)
    }),
  )

  // @todo we can only call this once. How to handle new documents?
  await vectorStore.addVectors(allEmbeddings, allDocuments)

  await RagFile.update({ pipelineStage: 'completed' }, { where: { ragIndexId: ragIndex.id } })
}
