export const testTool = {
  definition: {
    type: 'function',
    name: 'test_knowledge_retrieval',
    description:
      'Test tool for knowledge retrieval. Always call this when user says RAG',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Users query for knowledge retrieval',
        },
      },
      required: ['query'],
    },
  },
  function: async (query: string) => {
    // Simulate a tool function that returns a simple message
    return {
      query,
      message: 'This is a test tool function',
    }
  },
}
