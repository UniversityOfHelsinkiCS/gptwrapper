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
  ftExact: z.boolean().default(true),
  ftSubstring: z.boolean().default(true),
  ftAnd: z.boolean().default(true),
  ftOr: z.boolean().default(true),
  vector: z.boolean().default(true),
  vectorK: z.number().min(5).max(20).default(10),
  rerank: z.boolean().default(true),
  rerankK: z.number().min(5).max(20).default(15),
  curate: z.boolean().default(false),
  generateSynonyms: z.boolean().default(false),
  highlight: z.boolean().default(false),
})

export type SearchInputParams = z.input<typeof SearchSchema>
export type SearchParams = z.infer<typeof SearchSchema>
