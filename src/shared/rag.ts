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
  query: z.string().min(1).max(1000),
  ft: z.boolean().default(true),
  vector: z.boolean().default(true),
  vectorK: z.number().min(1).max(20).default(8),
  rerank: z.boolean().default(true),
  rerankK: z.number().min(1).max(20).default(5),
})

export type SearchInputParams = z.input<typeof SearchSchema>
export type SearchParams = z.infer<typeof SearchSchema>
