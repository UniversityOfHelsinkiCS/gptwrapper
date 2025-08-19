import { Document } from '@langchain/core/documents'
import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from '@langchain/textsplitters'
import type { RagFile } from '../../db/models'
import { getRedisVectorStore } from './vectorStore'
import { FileStore } from './fileStore'

const defaultTextSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 200,
})

const markdownTextSplitter = new MarkdownTextSplitter({
  chunkSize: 800,
  chunkOverlap: 200,
})

const isMarkdown = (mimetype: string) => mimetype === 'text/markdown'

export const ingestRagFile = async (ragFile: RagFile, language: 'Finnish' | 'English' = 'English') => {
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

  console.log(language)
  const vectorStore = getRedisVectorStore(ragFile.ragIndexId, language)

  await vectorStore.addDocuments(chunkDocuments)
  console.timeEnd(`Ingestion ${ragFile.filename}`)
}
