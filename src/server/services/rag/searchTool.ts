import { tool } from '@langchain/core/tools'
import { z } from 'zod/v4'
import type { RagIndex } from '../../db/models'
import { search } from './search'
import { SearchSchema } from '../../../shared/rag'
import logger from '../../util/logger'

const schema = z.object({
  query: z.string().describe('the query to search for'),
})

const TOOL_NAME = 'document_search'

export const getRagIndexSearchTool = (ragIndex: RagIndex) =>
  tool(
    async ({ query }: { query: string }) => {
      const startTime = Date.now()

      try {
        const { results: documents } = await search(ragIndex, SearchSchema.parse({ query, curate: true }))
        // With responseFormat: content_and_artifact, return content and artifact like this:
        //
        logger.info('ToolCall', {
          status: 'success',
          name: TOOL_NAME,
          ragIndexId: ragIndex.id,
          query,
          executionTime: Date.now() - startTime,
        })

        return [documents.map((doc) => doc.content).join('\n\n'), documents]
      } catch (error) {
        logger.info('ToolCall', {
          status: 'error',
          name: TOOL_NAME,
          ragIndexId: ragIndex.id,
          query,
          executionTime: Date.now() - startTime,
        })

        throw error
      }
    },
    {
      name: TOOL_NAME, // Gotcha: function name must match '^[a-zA-Z0-9_\.-]+$' at least in AzureOpenAI. This name must satisfy the name in ChatToolDef type
      description: `Search documents in the materials (titled '${ragIndex.metadata.name}'). Prefer ${ragIndex.metadata.language}, which is the language used in the documents.`,
      schema,
      responseFormat: 'content_and_artifact',
    },
  )
