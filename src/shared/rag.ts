import z from 'zod/v4'

export type RagChunk = {
  id?: string
  content: string
  metadata: {
    ragFileName: string
    [key: string]: any
  }
  score?: number
}

export const SearchSchema = z.object({
  query: z.string().min(1).max(2000),
  /** Semantic search with embeddings. */
  vector: z.boolean().default(true),
  /** Keyword search: exact phrase, all words and any word. */
  fullText: z.boolean().default(true),
})

export type SearchInputParams = z.input<typeof SearchSchema>
export type SearchParams = z.infer<typeof SearchSchema>
