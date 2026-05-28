import { tool } from '@langchain/core/tools'
import { z } from 'zod/v4'
import { SearchSchema } from '../../../shared/rag'
import type { RagIndex } from '../../db/models'
import logger from '../../util/logger'
import { search } from '../rag/search'

const schema = z.object({
  query: z.string().min(1).describe('The query to search for in the source materials'),
})

const TOOL_NAME = 'document_search'

export const getV4RagIndexSearchTool = (ragIndex: RagIndex) =>
  tool(
    async ({ query }: z.infer<typeof schema>) => {
      const startTime = Date.now()

      try {
        const { results: documents } = await search(ragIndex, SearchSchema.parse({ query, curate: true }))

        logger.info('ToolCall', {
          status: 'success',
          routeVersion: 'v4',
          name: TOOL_NAME,
          ragIndexId: ragIndex.id,
          query,
          executionTime: Date.now() - startTime,
        })

        return [documents.map((doc) => doc.content).join('\n\n'), documents]
      } catch (error) {
        logger.info('ToolCall', {
          status: 'error',
          routeVersion: 'v4',
          name: TOOL_NAME,
          ragIndexId: ragIndex.id,
          query,
          executionTime: Date.now() - startTime,
        })

        throw error
      }
    },
    {
      name: TOOL_NAME,
      description: `Search documents in the source materials (titled '${ragIndex.metadata.name}'). Prefer ${ragIndex.metadata.language}, which is the language used in the documents. If multiple queries are needed, call this tool multiple times, once for each query.`,
      schema,
      responseFormat: 'content_and_artifact',
    },
  )