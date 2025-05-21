import React, { useState } from 'react'
import { TextField, Button, Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Paper, IconButton, Dialog, DialogTitle, styled } from '@mui/material'
import apiClient from '../util/apiClient'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CloudUpload, Settings } from '@mui/icons-material'
import Markdown from './Banner/Markdown'
import { useSnackbar } from 'notistack'

type RagResponse = {
  id: string
  value: {
    title: string
    content: string
    score: number
  }
}

type RagIndexAttributes = {
  id: number
  metadata: {
    name: string
    dim: number
  }
  numOfChunks: number
}

const useRagIndices = () => {
  const { data, ...rest } = useQuery<RagIndexAttributes[]>({
    queryKey: ['ragIndices'],
    queryFn: async () => {
      const response = await apiClient.get('/rag/indices')
      return response.data
    },
  })

  return { data, ...rest }
}

const useCreateRagIndexMutation = () => {
  const mutation = useMutation({
    mutationFn: async (indexName: string) => {
      const response = await apiClient.post('/rag/indices', { name: indexName })
      return response.data
    },
  })
  return mutation
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

      const response = await apiClient.put(`/rag/indices/${index.id}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
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

const Rag: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const { data: indices, refetch } = useRagIndices()
  const createIndexMutation = useCreateRagIndexMutation()
  const deleteIndexMutation = useDeleteRagIndexMutation()
  const [indexName, setIndexName] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<RagIndexAttributes>(null)
  const [inputValue, setInputValue] = useState('')
  const [topK, setTopK] = useState(5)
  const [response, setResponse] = useState<RagResponse[] | null>(null)
  const uploadMutation = useUploadMutation(selectedIndex)
  const [modalOpen, setModalOpen] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    console.log('Form submitted with value:', inputValue)
    const res = await apiClient.post('/rag/query', {
      query: inputValue,
      indexId: selectedIndex?.id,
      topK,
    })
    console.log('Response from server:', res.data)
    setResponse(res.data)
    setInputValue('')
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Dialog open={!!selectedIndex && modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>Edit {selectedIndex?.metadata?.name}</DialogTitle>
        <Box sx={{ padding: 2, display: 'flex', gap: 2 }}>
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
                  setModalOpen(false)
                  enqueueSnackbar('Files uploaded successfully', {
                    variant: 'success',
                  })
                }
              }}
              multiple
            />
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={async () => {
              if (selectedIndex && window.confirm(`Are you sure you want to delete index ${selectedIndex.metadata.name}?`)) {
                await deleteIndexMutation.mutateAsync(selectedIndex.id)
                setSelectedIndex(null)
                refetch()
              }
            }}
          >
            Delete Index
          </Button>
        </Box>
      </Dialog>
      <Box>
        <Typography variant="h4" mb="1rem">
          RAG Indices
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
          <TextField label="Index Name" variant="outlined" value={indexName} onChange={(e) => setIndexName(e.target.value)} fullWidth />
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              await createIndexMutation.mutateAsync(indexName)
              setIndexName('')
              refetch()
            }}
          >
            Create Index
          </Button>
        </Box>
        {indices?.map((index) => (
          <Paper
            key={index.id}
            sx={{
              mb: 2,
              p: 1,
              outline: selectedIndex?.id === index.id ? '2px solid blue' : 'none',
            }}
            elevation={selectedIndex?.id === index.id ? 4 : 2}
          >
            <Table sx={{ mb: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Dim</TableCell>
                  <TableCell>Num chunks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{index.id}</TableCell>
                  <TableCell>{index.metadata.name}</TableCell>
                  <TableCell>{index.metadata.dim}</TableCell>
                  <TableCell>{index.numOfChunks}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Button disabled={selectedIndex?.id === index.id} onClick={() => setSelectedIndex(index)}>
              {selectedIndex?.id === index.id ? 'Selected' : 'Select'}
            </Button>
            <IconButton
              onClick={() => {
                setSelectedIndex(index)
                setModalOpen(true)
              }}
            >
              <Settings />
            </IconButton>
          </Paper>
        ))}
      </Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          margin: '0 auto',
        }}
      >
        <TextField label="Enter text" variant="outlined" value={inputValue} onChange={(e) => setInputValue(e.target.value)} fullWidth />
        <TextField label="top k" variant="outlined" type="number" value={topK} onChange={(e) => setTopK(parseInt(e.target.value, 10))} fullWidth />
        <Button type="submit" variant="contained" color="primary" disabled={!inputValue || !selectedIndex}>
          Search
        </Button>
        {response && (
          <Box mt={2}>
            <Typography variant="h6">Response:</Typography>
            {response.map((doc) => (
              <Paper key={doc.id} sx={{ marginBottom: 2, p: 1 }} elevation={2}>
                <Typography variant="caption">Score: {doc.value.score}</Typography>
                <Markdown>{doc.value.content}</Markdown>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default Rag
