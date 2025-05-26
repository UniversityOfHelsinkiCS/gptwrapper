import { FunctionTool } from 'openai/resources/responses/responses'

interface ToolObject {
  definition: FunctionTool
  function: (query: string) => Promise<any>
}

export const testTool: ToolObject = {
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
      additionalProperties: false,
    },
    strict: true, // or true, depending on your requirements
  },
  function: async (
    query: string
  ): Promise<{ query: string; result: string }> => {
    // Simulate a tool function that returns a simple message
    return {
      query,
      result:
        'This is a test result from the test tool. The secret is: Chili kastike',
    }
  },
}
