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

  for (const ragFile of ragFiles) {
    console.time(`Ingestion ${ragFile.filename}`)

    const text = await FileStore.readRagFileTextContent(ragFile)

    const document = new Document({
      pageContent: text,
    })

    const splitter = isMarkdown(ragFile.fileType) ? markdownTextSplitter : defaultTextSplitter

    const chunkDocuments = await splitter.splitDocuments([document])

    chunkDocuments.forEach((chunkDocument, idx) => {
      chunkDocument.id = `ragIndex-${ragFile.ragIndexId}-${ragFile.filename}-${idx}`
    })

    // console.log(await redisClient.ft.info(vectorStore.indexName))
    allDocuments.push(...chunkDocuments)

    console.timeEnd(`Ingestion ${ragFile.filename}`)
    // console.log(await redisClient.ft.info(vectorStore.indexName))
    //
    ragFile.pipelineStage = 'completed'
    await ragFile.save()
  }

  // @todo we can only call this once. How to handle new documents?
  await vectorStore.addDocuments(allDocuments)
}
