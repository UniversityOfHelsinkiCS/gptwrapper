import { tool } from '@langchain/core/tools'
import { z } from 'zod/v4'
import type { RagIndex } from '../../db/models'
import { SearchSchema } from '../../../shared/rag'
import { Document } from '@langchain/core/documents'
import type { search } from './search'
import type { getRagIndexSearchTool } from './searchTool'

const mockDocuments = [
  new Document({ pageContent: 'This is the first mock document.', metadata: { ragFileName: 'mock_document1.pdf' } }),
  new Document({ pageContent: 'This is the second mock document.', metadata: { ragFileName: 'mock_document2.pdf' } }),
  new Document({ pageContent: 'This is the third mock document.', metadata: { ragFileName: 'mock_document3.pdf' } }),
]

const mockSearch: typeof search = async (_index: RagIndex, _params: { query: string }) => {
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

export const getMockRagIndexSearchTool: typeof getRagIndexSearchTool = (ragIndex: RagIndex) =>
  tool(
    async ({ query }: { query: string }) => {
      console.log('Mock search tool invoked with query:', query)
      const { results: documents } = await mockSearch(ragIndex, SearchSchema.parse({ query }))
      // With responseFormat: content_and_artifact, return content and artifact like this:
      return [documents.map((doc) => doc.content).join('\n\n'), documents]
    },
    {
      name: `mock_document_search`, // Gotcha: function name must match '^[a-zA-Z0-9_\.-]+$' at least in AzureOpenAI. This name must satisfy the name in ChatToolDef type
      description: `Search documents in the materials (titled '${ragIndex.metadata.name}'). Prefer ${ragIndex.metadata.language}, which is the language used in the documents.`,
      schema: z.object({
        query: z.string().describe('the query to search for'),
      }),
      responseFormat: 'content_and_artifact',
    },
  )
