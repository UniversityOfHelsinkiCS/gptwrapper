import { useQuery } from '@tanstack/react-query'
import { useParams, Link as RouterLink } from 'react-router-dom'
import apiClient from '../../util/apiClient'
import type { RagFileAttributes } from '../../../server/db/models/ragFile'
import { Link, Typography } from '@mui/material'
import { RagFileInfo } from './RagFileDetails'
import type { RagIndexAttributes } from '../../../server/db/models/ragIndex'
import { Chunk } from './Chunk'

type RagFile = RagFileAttributes & {
  chunks: {
    id: string
    content: string
    title: string
    metadata: Record<string, unknown>
  }[]
  ragIndex: RagIndexAttributes
}

export const RagFile: React.FC = () => {
  const { id, fileId } = useParams()
  const { data: ragFile, isLoading } = useQuery<RagFile>({
    queryKey: ['ragFile', id],
    queryFn: async () => {
      const res = await apiClient.get(`/rag/indices/${id}/files/${fileId}`)
      return res.data
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Link component={RouterLink} to={`/rag/${id}`}>
        Back to RAG Index
      </Link>
      <Typography variant="body1">RAG file</Typography>
      <Typography variant="h3">
        {ragFile.ragIndex.metadata.name} / {ragFile.filename}
      </Typography>
      <RagFileInfo file={ragFile} />
      <Typography variant="h4">Chunks</Typography>
      {ragFile.chunks.length === 0 ? (
        <Typography variant="body1">No chunks found</Typography>
      ) : (
        ragFile.chunks.map((chunk) => (
          <Chunk
            key={chunk.id}
            doc={{
              title: chunk.title,
              content: chunk.content,
              metadata: chunk.metadata,
            }}
          />
        ))
      )}
    </>
  )
}
