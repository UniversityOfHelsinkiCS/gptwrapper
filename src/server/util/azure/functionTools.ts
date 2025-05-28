import { AzureOpenAI } from 'openai'
import { FunctionTool } from 'openai/resources/responses/responses'

interface functionCallObject {
  definition: FunctionTool
  function: (client: AzureOpenAI, query: string) => Promise<any>
}

export const functionCallTest: functionCallObject = {
  definition: {
    type: 'function',
    name: 'test_knowledge_retrieval',
    description:
      'Test tool for knowledge retrieval. Always call this when user says TEST-RAG',
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
    client: AzureOpenAI,
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

export const ohtuRAGTest: functionCallObject = {
  // FUNCITON TOOL CALL FOR VECTOR DB /search ENDPOINT IS NOT CURRENTLY SUPPORTED BY OPENAI
  definition: {
    type: 'function',
    name: 'ohtu_retrieval',
    description:
      'Helsingin yliopiston ohjelmistotuotannon kurssimateriaalin haku funktio. Kutsu tätä kun käyttäjä haluaa tietoa kurssiin liittyen. Muuten älä kutsu tätä.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Käyttäjän kysymys kurssimateriaalista',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    strict: true, // or true, depending on your requirements
  },
  function: async (client: AzureOpenAI, query: string): Promise<any> => {
    // Simulate a tool function that returns a simple message

    // console.log('KUTSUTAAN RAG FUNKTIOTA')

    // const indexit = await client.vectorStores.list()
    // const vs = indexit.data.filter((index) => index.name === 'ohtu-test')[0]

    // console.log('INDEX', vs)

    // const results = await client.vectorStores.search(vs.id, {
    //   query,
    //   max_num_results: 10,
    //   rewrite_query: true,
    // })

    return null
  },
}
