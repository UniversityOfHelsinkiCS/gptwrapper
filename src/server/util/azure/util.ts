import { FileSearchTool } from 'openai/resources/responses/responses'
import { ComparisonFilter, CompoundFilter } from 'openai/resources/shared'

/**
 * Creates a file search tool configuration for Azure OpenAI for a specific vector store.
 *
 * @param vectorStoreId - The ID of the vector store to search.
 * @param maxResults - The maximum number of results to return. Default is 5.
 * @param filters - Optional filters to apply to the search results. Check types for `ComparisonFilter` and `CompoundFilter` from OpenAI resources.
 * @param rankingOptions - Optional ranking options to apply to the search results. Check `FileSearchTool.RankingOptions` from OpenAI resources.
 *
 * @returns An object representing the file search tool configuration.
 */
export const createFileSearchTool = ({
  vectorStoreId,
  maxResults = 5,
  filters,
  rankingOptions,
}: {
  vectorStoreId: string
  maxResults?: number
  filters?: ComparisonFilter | CompoundFilter
  rankingOptions?: FileSearchTool.RankingOptions
}): FileSearchTool => {
  return {
    type: 'file_search',
    vector_store_ids: [vectorStoreId],
    max_num_results: maxResults,
    filters,
    ranking_options: rankingOptions,
  }
}
