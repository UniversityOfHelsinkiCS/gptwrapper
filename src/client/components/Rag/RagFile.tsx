import { useQuery } from '@tanstack/react-query'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import apiClient from '../../util/apiClient'
import type { RagFileAttributes } from '../../../shared/types'
import { Button, Container, Link, Typography } from '@mui/material'
import { RagFileInfo } from './RagFileDetails'
import type { RagIndexAttributes } from '../../../server/db/models/ragIndex'
import { Chunk } from './Chunk'
import { useDeleteRagFileMutation } from './api'

type RagFile = RagFileAttributes & {
  fileContent: string
  ragIndex: RagIndexAttributes
}

export const RagFile: React.FC = () => {
  const { id, fileId } = useParams()
  const {
    data: ragFile,
    isSuccess,
    isError,
    error,
  } = useQuery({
    queryKey: ['ragFile', id],
    queryFn: async () => {
      const res = await apiClient.get<RagFile>(`/rag/indices/${id}/files/${fileId}`)
      return res.data
    },
  })
  const deleteMutation = useDeleteRagFileMutation()
  const navigate = useNavigate()

  if (isError) {
    return <div>Error: {error.message}</div>
  }

  if (!isSuccess) {
    return <div>Loading...</div>
  }

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Link component={RouterLink} to={`/rag/${id}`}>
        Back to RAG Index
      </Link>
      <Typography variant="body1">RAG file</Typography>
      <Typography variant="h3">
        {ragFile.ragIndex.metadata?.name} / {ragFile.filename}
      </Typography>
      <Button
        variant="text"
        color="error"
        sx={{ my: 2 }}
        onClick={async () => {
          if (window.confirm('Are you sure you want to delete this file?')) {
            await deleteMutation.mutateAsync({
              indexId: ragFile.ragIndex.id,
              fileId: ragFile.id,
            })
            navigate(`/rag/${ragFile.ragIndex.id}`)
          }
        }}
      >
        Delete File
      </Button>
      <RagFileInfo file={ragFile} />
      <Typography variant="h4">Content</Typography>
      {ragFile.fileContent.length === 0 ? (
        <Typography variant="body1">No content</Typography>
      ) : (
        <Chunk
          doc={{
            title: ragFile.filename,
            content: ragFile.fileContent,
            metadata: ragFile.metadata,
          }}
        />
      )}
    </Container>
  )
}
