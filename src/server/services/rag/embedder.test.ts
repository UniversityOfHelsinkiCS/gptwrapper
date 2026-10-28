import { describe, expect, it, vi } from 'vitest'
import { Embeddings } from '@langchain/core/embeddings'
import { PriorityEmbeddings } from './embedder'

vi.mock('../../util/config', () => ({
  LAAMA_API_TOKEN: 'token',
  LAAMA_API_URL: 'http://localhost',
  OLLAMA_EMBEDDER_MODEL: 'model',
}))

const tick = () => new Promise((r) => setTimeout(r, 0))

class ManualEmbeddings extends Embeddings {
  calls: string[][] = []
  pending: Array<{ resolve: () => void; reject: () => void }> = []

  constructor() {
    super({})
  }

  private run(texts: string[]) {
    this.calls.push(texts)
    return new Promise<number[][]>((resolve, reject) => {
      this.pending.push({ resolve: () => resolve(texts.map((t) => [t.length])), reject: () => reject(new Error('embedding server error')) })
    })
  }

  async embedDocuments(texts: string[]) {
    return this.run(texts)
  }

  async embedQuery(text: string) {
    return (await this.run([text]))[0]
  }

  async resolveNext() {
    await tick()
    this.pending.shift()!.resolve()
  }

  async rejectNext() {
    await tick()
    this.pending.shift()!.reject()
  }
}

describe('PriorityEmbeddings', () => {
  it('runs a query before the remaining ingestion batches', async () => {
    const inner = new ManualEmbeddings()
    const embedder = new PriorityEmbeddings(inner)

    const texts = Array.from({ length: 48 }, (_, i) => `doc${i}`)
    const docsPromise = embedder.embedDocuments(texts)
    await tick()
    const queryPromise = embedder.embedQuery('query')

    for (let i = 0; i < 4; i++) {
      await inner.resolveNext()
    }

    const [docs, query] = await Promise.all([docsPromise, queryPromise])

    expect(inner.calls.map((c) => c.length)).toEqual([16, 1, 16, 16])
    expect(inner.calls[1]).toEqual(['query'])
    expect(query).toEqual([5])
    expect(docs).toEqual(texts.map((t) => [t.length]))
  })

  it('runs a query while a failed batch waits to retry', async () => {
    const inner = new ManualEmbeddings()
    const embedder = new PriorityEmbeddings(inner)

    const docsPromise = embedder.embedDocuments(['doc0'])
    await inner.rejectNext()
    const queryPromise = embedder.embedQuery('query')
    await inner.resolveNext()

    expect(await queryPromise).toEqual([5])
    expect(inner.calls).toEqual([['doc0'], ['query']])

    await vi.waitFor(() => expect(inner.pending.length).toBe(1), { timeout: 5000 })
    await inner.resolveNext()

    expect(await docsPromise).toEqual([[4]])
    expect(inner.calls).toEqual([['doc0'], ['query'], ['doc0']])
  })
})
