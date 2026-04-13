import { OllamaEmbeddings } from '@langchain/ollama'
import {
  LAAMA_API_TOKEN,
  LAAMA_API_URL,
  OLLAMA_EMBEDDER_MODEL,
  // OLLAMA_URL,
} from '../../util/config'

const _ollamaEmbedder = new OllamaEmbeddings({
  model: OLLAMA_EMBEDDER_MODEL,
  baseUrl: LAAMA_API_URL,
  keepAlive: '30m',
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      signal: undefined,
      headers: {
        ...init?.headers,
        token: LAAMA_API_TOKEN,
      },
    })
  },
})

export const getEmbedder = () => _ollamaEmbedder
