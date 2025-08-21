import { tool } from '@langchain/core/tools'
import { z } from 'zod/v4'
import { RagIndex } from '../../db/models'
import { search } from './search'
import { SearchSchema } from '../../../shared/rag'

export const getRagIndexSearchTool = (ragIndex: RagIndex) =>
  tool(
    async ({ query }: { query: string }) => {
      console.log('Search tool invoked with query:', query)
      const { results: documents } = await search(ragIndex, SearchSchema.parse({ query }))
      // With responseFormat: content_and_artifact, return content and artifact like this:
      return [documents.map((doc) => doc.content).join('\n\n'), documents]
    },
    {
      name: `document_search`, // Gotcha: function name must match '^[a-zA-Z0-9_\.-]+$' at least in AzureOpenAI. This name must satisfy the name in ChatToolDef type
      description: `Search documents in the materials (titled '${ragIndex.metadata.name}'). Prefer ${ragIndex.metadata.language}, which is the language used in the documents.`,
      schema: z.object({
        query: z.string().describe('the query to search for'),
      }),
      responseFormat: 'content_and_artifact',
    },
  )
