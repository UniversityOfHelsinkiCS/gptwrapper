import React from 'react'
import { Button, Box, Typography, styled, LinearProgress, Link, Container } from '@mui/material'
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import apiClient from '../../util/apiClient'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CloudUpload } from '@mui/icons-material'
import type { RagFileAttributes } from '../../../server/db/models/ragFile'
import { orderBy } from 'lodash'
import { RagIndexAttributes } from '../../../server/db/models/ragIndex'
import { RagFileInfo } from './RagFileDetails'

type RagIndexDetails = Omit<RagIndexAttributes, 'ragFileCount'> & {
  ragFiles: RagFileAttributes[]
}

const useRagIndexDetails = (indexId: number | null) => {
  const { data, ...rest } = useQuery<RagIndexDetails>({
    queryKey: ['ragIndex', indexId],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices/${indexId}`)
      return response.data
    },
    enabled: !!indexId,
  })

  return { data, ...rest }
}

const useDeleteRagIndexMutation = () => {
  const mutation = useMutation({
    mutationFn: async (indexId: number) => {
      const response = await apiClient.delete(`/rag/indices/${indexId}`)
      return response.data
    },
  })
  return mutation
}

const useUploadMutation = (index: RagIndexAttributes | null) => {
  const mutation = useMutation({
    mutationFn: async (files: FileList) => {
      if (!index) {
        throw new Error('Index is required')
      }
      const formData = new FormData()
      // Append each file individually
      Array.from(files).forEach((file) => {
        formData.append('files', file)
      })

      const res = await apiClient.post(`/rag/indices/${index.id}/upload`, formData)

      return res.data
    },
  })
  return mutation
}

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
})

export const RagIndex: React.FC = () => {
  const { id: strId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const id = parseInt(strId, 10)
  const deleteIndexMutation = useDeleteRagIndexMutation()
  const { data: ragDetails, isLoading, refetch } = useRagIndexDetails(id)
  const uploadMutation = useUploadMutation(ragDetails)

  if (isLoading) {
    return <LinearProgress />
  }

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Link component={RouterLink} to="/rag">
        <Typography variant="body1">Back to RAG Indices</Typography>
      </Link>
      <Typography variant="body1">RAG index</Typography>
      <Typography variant="h3">{ragDetails?.metadata?.name}</Typography>
      <Box py={2}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button component="label" role={undefined} variant="contained" tabIndex={-1} startIcon={<CloudUpload />} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
            <VisuallyHiddenInput
              type="file"
              onChange={async (event) => {
                const files = event.target.files
                console.log('Files selected:', files)
                if (files && files.length > 0) {
                  await uploadMutation.mutateAsync(files)
                  refetch()
                }
              }}
              multiple
            />
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={async () => {
              if (window.confirm(`Are you sure you want to delete index ${ragDetails.metadata?.name}?`)) {
                await deleteIndexMutation.mutateAsync(id)
                navigate('/rag')
              }
            }}
          >
            Delete Index
          </Button>
        </Box>
        <Box mt={2}>
          <Typography variant="h6">Files:</Typography>
          {orderBy(ragDetails?.ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (
            <RagFileInfo key={file.id} file={file} link />
          ))}
        </Box>
      </Box>
    </ Container>
  )
}
