import type { RagIndex } from '../../db/models'
import { Document } from '@langchain/core/documents'
import type { search } from './search'

const mockDocuments = [
  new Document({ pageContent: 'This is the first mock document.', metadata: { ragFileName: 'mock_document1.pdf' } }),
  new Document({ pageContent: 'This is the second mock document.', metadata: { ragFileName: 'mock_document2.pdf' } }),
  new Document({ pageContent: 'This is the third mock document.', metadata: { ragFileName: 'mock_document3.pdf' } }),
]

export const mockSearch: typeof search = async (_index: RagIndex, _params: { query: string }) => {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return {
    results: mockDocuments.map((doc) => ({
      id: doc.id,
      content: doc.pageContent,
      metadata: doc.metadata,
    })),
    timings: { search: 1000 },
  }
}
