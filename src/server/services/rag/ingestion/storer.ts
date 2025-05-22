import type { EmbeddedChunk } from './embedder.ts'
import { addChunk } from '../chunkDb.ts'
import RagIndex from '../../../db/models/ragIndex.ts'
import RagFile from '../../../db/models/ragFile.ts'

export const storeChunk = async (ragIndex: RagIndex, ragFile: RagFile, chunk: EmbeddedChunk) => {
  await addChunk(ragIndex, ragFile, {
    id: chunk.id,
    metadata: chunk.metadata,
    content: chunk.content.join('\n'),
    embedding: chunk.embedding,
  })
}
