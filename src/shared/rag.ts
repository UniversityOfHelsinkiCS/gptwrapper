export type RagChunk = {
  id?: string
  content: string
  metadata: Record<string, any>
  score?: number
}
