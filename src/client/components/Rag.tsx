import React, { useState } from 'react'
import { TextField, Button, Box, Typography } from '@mui/material'
import apiClient from '../util/apiClient'

type RagResponse = {
  total: number
  documents: Array<{
    id: string
    value: {
      title: string
      content: string
      score: number
    }
  }>
}

const Rag: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  const [response, setResponse] = useState<RagResponse | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    console.log('Form submitted with value:', inputValue)
    const res = await apiClient.post('/rag', {
      prompt: inputValue,
    })
    console.log('Response from server:', res.data)
    setResponse(res.data)
    setInputValue('')
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '300px',
        margin: '0 auto',
      }}
    >
      <TextField
        label="Enter text"
        variant="outlined"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        fullWidth
      />
      <Button type="submit" variant="contained" color="primary">
        Submit
      </Button>
      {response && (
        <Box
          sx={{
            marginTop: 2,
            padding: 2,
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          <Typography variant="h6">Response:</Typography>
          <Typography variant="body1">Total: {response.total}</Typography>
          {response.documents.map((doc) => (
            <Box key={doc.id} sx={{ marginBottom: 1 }}>
              <Typography variant="subtitle1">{doc.value.title}</Typography>
              <Typography variant="body2">{doc.value.content}</Typography>
              <Typography variant="caption">
                Score: {doc.value.score}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      ss
    </Box>
  )
}

export default Rag
