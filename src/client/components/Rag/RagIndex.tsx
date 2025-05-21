import React from 'react'
import { Button, Box, Typography, Paper, styled, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../../util/apiClient'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CloudUpload } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import type { RagFileAttributes } from '../../../server/db/models/ragFile'
import { orderBy } from 'lodash'
import { IngestionPipelineStageKeys, IngestionPipelineStages } from '../../../shared/constants'
import { RagIndexAttributes } from '../../../server/db/models/ragIndex'

type RagIndexDetails = Omit<RagIndexAttributes, 'ragFileCount'> & {
  ragFiles: RagFileAttributes[]
}

const useRagIndexDetails = (indexId: number | null, refetchInterval: number) => {
  const { data, ...rest } = useQuery<RagIndexDetails>({
    queryKey: ['ragIndex', indexId],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices/${indexId}`)
      return response.data
    },
    enabled: !!indexId,
    refetchInterval,
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

const RagFile: React.FC<{ file: RagFileAttributes }> = ({ file }) => {
  const inProgress = file.pipelineStage !== 'completed' && file.pipelineStage !== 'pending'
  const progressIdx = IngestionPipelineStageKeys.findIndex((stage) => stage === file.pipelineStage)
  const progressNextIdx = inProgress ? progressIdx + 1 : progressIdx

  return (
    <Paper sx={{ padding: 2, marginBottom: 2 }} elevation={3}>
      <Box display={'flex'} width="100%">
        <Typography variant="subtitle1">{file.filename}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ marginLeft: 'auto' }}>
          Added {new Date(file.createdAt).toLocaleString()}
        </Typography>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Size (characters)</TableCell>
            <TableCell>Chunks</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{file.fileType}</TableCell>
            <TableCell>{file.fileSize}</TableCell>
            <TableCell>{file.numChunks}</TableCell>
            <TableCell>{file.pipelineStage}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {file.pipelineStage !== 'completed' && file.pipelineStage !== 'pending' && (
        <LinearProgress
          variant="buffer"
          value={(progressIdx * 100) / (IngestionPipelineStageKeys.length - 1)}
          valueBuffer={(progressNextIdx * 100) / (IngestionPipelineStageKeys.length - 1)}
        />
      )}
      {file.error && (
        <Typography variant="body2" color="error">
          Error: {JSON.stringify(file.error)}
        </Typography>
      )}
    </Paper>
  )
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
  const { enqueueSnackbar } = useSnackbar()
  const deleteIndexMutation = useDeleteRagIndexMutation()
  const { data: ragDetails, isLoading } = useRagIndexDetails(id, 1000)
  const uploadMutation = useUploadMutation(ragDetails)

  if (isLoading) {
    return <LinearProgress />
  }

  return (
    <>
      <Typography variant='body1'>RAG index</Typography>
      <Typography variant='h3'>{ragDetails?.metadata?.name}</Typography>
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
            <RagFile key={file.id} file={file} />
          ))}
        </Box>
      </Box>
    </>
  )
}
