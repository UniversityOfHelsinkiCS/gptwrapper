import type { EmbeddedChunk } from './embedder.ts'
import { addChunk } from '../chunkDb.ts'
import RagIndex from '../../../db/models/ragIndex.ts'

export const storeChunk = async (ragIndex: RagIndex, chunk: EmbeddedChunk) => {
  await addChunk(ragIndex, {
    id: chunk.id,
    metadata: chunk.metadata,
    content: chunk.content.join('\n'),
    embedding: chunk.embedding,
  })
}
