import React, { useState } from 'react'
import { TextField, Button, Box } from '@mui/material'
import apiClient from '../util/apiClient'

const Rag: React.FC = () => {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    console.log('Form submitted with value:', inputValue)
    await apiClient.post('/ai/embed', {
      prompt: inputValue,
    })
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
    </Box>
  )
}

export default Rag
