import { FileSearchTool } from 'openai/resources/responses/responses'

interface FileSearchObject {
  definition: FileSearchTool
}

export const fileSearchTest: FileSearchObject = {
  definition: {
    type: 'file_search',
    vector_store_ids: ['vs_Lsyd0uMbgeT8lS9pnxZQEl3c'], // vector store ID for ohtu-test
    max_num_results: 5,
    // filters: "",
    // ranking_options: ""
  },
}
