import { tool, type ToolRunnableConfig } from '@langchain/core/tools'
import { z } from 'zod/v4'
import { isMockModel } from '@config'
import type { ToolCallResult } from '@shared/chat'
import type { RagChunk } from '@shared/rag'
import { SearchSchema } from '@shared/rag'
import type { RagIndex } from '../../../db/models'
import logger from '../../../util/logger'
import { ToolResultStore } from '../../langchain/fileSearchResultsStore'
import { mockSearch } from '../../rag/mockSearchTool'
import { search } from '../../rag/search'
import type { PlainToolModule } from './types'

export const DOCUMENT_SEARCH = 'document_search'

/** Length of the excerpt of each result kept in the tool part, so later turns know what was found. */
const EXCERPT_LENGTH = 200

export type DocumentSearchConfig = { ragIndex: RagIndex }

/** The `result` of a `document_search` tool part: the files the Sources panel lists, with short excerpts. */
export type DocumentSearchResult = ToolCallResult

const excerpt = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH)}…` : flat
}

export const toDocumentSearchResult = (documents: RagChunk[]): DocumentSearchResult => ({
  files: documents.map((doc) => ({ fileName: doc.metadata.ragFileName, score: doc.score, excerpt: excerpt(doc.content) })),
})

const schema = z.object({
  query: z.string().describe('the query to search for'),
})

/**
 * RAG search over the prompt's source material. The full chunks go to the model and to `ToolResultStore`
 * (read by the Sources details view); the client gets file names, scores and short excerpts as the artifact.
 */
export const documentSearch: PlainToolModule<DocumentSearchConfig> = {
  name: DOCUMENT_SEARCH,
  kind: 'tool',
  executor: 'server',
  stage: 'stable',
  instructions:
    'Use document_search to look up the course source material when the question may be answered by it. ' +
    'Base your answer on the search results, and say so when they do not cover the question instead of guessing.',

  create: ({ user, model, config: { ragIndex } }) =>
    tool(
      async ({ query }: { query: string }, runtime: ToolRunnableConfig) => {
        const startTime = Date.now()
        const logResult = (status: 'success' | 'error') =>
          logger.info('ToolCall', { status, name: DOCUMENT_SEARCH, ragIndexId: ragIndex.id, query, executionTime: Date.now() - startTime })

        try {
          const { results: documents } = isMockModel(model)
            ? await mockSearch(ragIndex, SearchSchema.parse({ query }))
            : await search(ragIndex, SearchSchema.parse({ query, curate: true }))

          const callId = runtime.toolCall?.id
          if (callId) {
            await ToolResultStore.saveResults(callId, documents, user)
          }
          logResult('success')

          return [documents.map((doc) => doc.content).join('\n\n'), toDocumentSearchResult(documents)]
        } catch (error) {
          logResult('error')
          throw error
        }
      },
      {
        name: DOCUMENT_SEARCH, // Must match '^[a-zA-Z0-9_\.-]+$' (Azure OpenAI)
        description: `Search documents in the materials (titled '${ragIndex.metadata.name}'). Prefer ${ragIndex.metadata.language}, which is the language used in the documents. If multiple queries are needed, call this tool multiple times, once for each query.`,
        schema,
        responseFormat: 'content_and_artifact',
      },
    ),

  summarizeForHistory: (part) => {
    const query = (part.input as { query?: unknown } | undefined)?.query
    const searched = `[Searched the course materials for "${typeof query === 'string' ? query : ''}"`
    if (part.status === 'error') return `${searched}, but the search failed.]`
    if (part.status === 'running') return `${searched}, but the search was interrupted.]`

    const files = (part.result as Partial<DocumentSearchResult> | undefined)?.files ?? []
    if (files.length === 0) return `${searched}: nothing found.]`

    const lines = files.map((file) => `- ${file.fileName}${file.excerpt ? `: "${file.excerpt}"` : ''}`)
    return [`${searched}. Results (excerpts):`, ...lines, ']'].join('\n')
  },
}
