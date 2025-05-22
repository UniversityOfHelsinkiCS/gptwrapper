import React, { useState } from 'react'
import { TextField, Button, Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Paper, IconButton, Link } from '@mui/material'
import apiClient from '../../util/apiClient'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Settings } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Chunk } from './Chunk'

type RagResponse = {
  id: string
  value: {
    title: string
    content: string
    score: number
    metadata: Record<string, any>
  }
}

type RagIndexAttributes = {
  id: number
  createdAt: string
  updatedAt: string
  metadata: {
    name: string
    dim: number
  }
  ragFileCount: number
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

const Rag: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const { data: indices, refetch } = useRagIndices()
  const createIndexMutation = useCreateRagIndexMutation()
  const [indexName, setIndexName] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<RagIndexAttributes>(null)
  const [inputValue, setInputValue] = useState('')
  const [topK, setTopK] = useState(5)
  const [response, setResponse] = useState<RagResponse[] | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    console.log('Form submitted with value:', inputValue)
    const res = await apiClient.post('/rag/query', {
      query: inputValue,
      indexId: selectedIndex?.id,
      topK,
    })
    console.log('Response from server:', res.data)
    // Parse metadatas
    const parsedResponse = res.data.map((doc) => ({
      ...doc,
      value: {
        ...doc.value,
        metadata: JSON.parse(doc.value.metadata),
      },
    }))
    setResponse(parsedResponse)
    setInputValue('')
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
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
              const newIndex = await createIndexMutation.mutateAsync(indexName)
              setIndexName('')
              navigate(`/rag/${newIndex.id}`)
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
                  <TableCell>Vector Dimensions</TableCell>
                  <TableCell>Number of files</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{index.id}</TableCell>
                  <TableCell>{index.metadata?.name}</TableCell>
                  <TableCell>{index.metadata?.dim}</TableCell>
                  <TableCell>{index.ragFileCount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button disabled={selectedIndex?.id === index.id} onClick={() => setSelectedIndex(index)}>
                {selectedIndex?.id === index.id ? 'Selected' : 'Select'}
              </Button>
              <Link to={`/rag/${index.id}`} component={RouterLink} sx={{ ml: 'auto' }}>
                View details
              </Link>
            </Box>
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
              <Chunk key={doc.id} doc={doc.value} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default Rag
