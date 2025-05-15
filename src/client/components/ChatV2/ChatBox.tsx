import { Send } from '@mui/icons-material'
import { Container, IconButton, Paper, TextField } from '@mui/material'
import { useState } from 'react'

export const ChatBox = ({
  disabled,
  onSubmit,
}: {
  disabled: boolean
  onSubmit: (message: string) => void
}) => {
  const [message, setMessage] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSubmit(message)
      setMessage('')
    }
  }

  return (
    <Container
      disableGutters
      sx={{
        position: 'fixed',
        bottom: '8rem',
        // width: '100%',
      }}
    >
      <Paper
        sx={{
          marginBottom: '1rem',
        }}
        elevation={3}
        component="form"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      >
        <TextField
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          fullWidth
          multiline
          disabled={disabled}
          variant="standard"
          sx={{ padding: '0.5rem' }}
          slotProps={{
            input: {
              sx: {
                padding: '0.5rem',
                fontSize: '1.5rem',
                // lineHeight: '1.5rem',
              },
              endAdornment: (
                <IconButton disabled={disabled} type="submit">
                  <Send />
                </IconButton>
              ),
            },
          }}
        />
      </Paper>
    </Container>
  )
}
