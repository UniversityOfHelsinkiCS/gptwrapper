import React from 'react'
import { Button, Box, Typography, styled, LinearProgress, Link, Container } from '@mui/material'
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import { CloudUpload } from '@mui/icons-material'
import { orderBy } from 'lodash'
import { RagFileInfo } from './RagFileDetails'
import { useDeleteRagIndexMutation, useRagIndexDetails, useUploadMutation } from './api'

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
    </Container>
  )
}
