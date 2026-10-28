import { OllamaEmbeddings } from '@langchain/ollama'
import { Embeddings } from '@langchain/core/embeddings'
import PQueue from 'p-queue'
import _ from 'lodash'
import {
  LAAMA_API_TOKEN,
  LAAMA_API_URL,
  OLLAMA_EMBEDDER_MODEL,
  // OLLAMA_URL,
} from '../../util/config'

const EMBED_BATCH_SIZE = 16
const QUERY_PRIORITY = 10

export class PriorityEmbeddings extends Embeddings {
  private queue = new PQueue({ concurrency: 1 })

  constructor(private inner: Embeddings) {
    super({})
  }

  private run<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return this.caller.call(() => this.queue.add(fn, { priority }))
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.run(() => this.inner.embedQuery(text), QUERY_PRIORITY)
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = []
    for (const batch of _.chunk(texts, EMBED_BATCH_SIZE)) {
      vectors.push(...(await this.run(() => this.inner.embedDocuments(batch))))
    }
    return vectors
  }
}

const _ollamaEmbedder = new OllamaEmbeddings({
  model: OLLAMA_EMBEDDER_MODEL,
  dimensions: 1024,
  baseUrl: LAAMA_API_URL,
  maxRetries: 0,
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

const _priorityEmbedder = new PriorityEmbeddings(_ollamaEmbedder)

export const getEmbedder = () => _priorityEmbedder
