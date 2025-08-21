import { AzureOpenAIEmbeddings } from '@langchain/openai'
import { OllamaEmbeddings } from '@langchain/ollama'
import {
  AZURE_API_KEY,
  AZURE_OPENAI_EMBEDDER_DEPLOYMENT,
  AZURE_OPENAI_EMBEDDER_MODEL,
  AZURE_RESOURCE,
  LAAMA_API_TOKEN,
  LAAMA_API_URL,
  OLLAMA_EMBEDDER_MODEL,
  // OLLAMA_URL,
} from '../../util/config'

const _azureOpenAIEmbedder = new AzureOpenAIEmbeddings({
  model: AZURE_OPENAI_EMBEDDER_MODEL,
  azureOpenAIApiKey: AZURE_API_KEY,
  azureOpenAIApiVersion: '2023-05-15',
  azureOpenAIApiDeploymentName: AZURE_OPENAI_EMBEDDER_DEPLOYMENT,
  azureOpenAIApiInstanceName: AZURE_RESOURCE,
})

const _ollamaEmbedder = new OllamaEmbeddings({
  model: OLLAMA_EMBEDDER_MODEL,
  baseUrl: LAAMA_API_URL,
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        token: LAAMA_API_TOKEN,
      },
    })
  },
})

export const getEmbedder = (embedderType = 'ollama') => {
  if (embedderType === 'azure') {
    return _azureOpenAIEmbedder
  }
  return _ollamaEmbedder
}
