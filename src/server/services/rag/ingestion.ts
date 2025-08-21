import { Document } from '@langchain/core/documents'
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { RagFile, RagIndex } from '../../db/models'
import { FileStore } from './fileStore'
import { getRedisVectorStore } from './vectorStore'

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

  for (const ragFile of ragFiles) {
    console.time(`Ingestion ${ragFile.filename}`)

    const text = await FileStore.readRagFileTextContent(ragFile)

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

    ragFile.pipelineStage = 'completed'
    await ragFile.save()
  }

  // @todo we can only call this once. How to handle new documents?
  await vectorStore.addVectors(allEmbeddings, allDocuments)
}
