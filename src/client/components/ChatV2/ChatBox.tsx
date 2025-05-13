import { Send } from '@mui/icons-material'
import { IconButton, TextField } from '@mui/material'
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
    <form onSubmit={handleSubmit}>
      <TextField
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message here..."
        fullWidth
        disabled={disabled}
        variant="outlined"
        size="small"
        sx={{ marginBottom: '1rem' }}
        slotProps={{
          input: {
            endAdornment: (
              <IconButton type="submit" disabled={disabled}>
                <Send />
              </IconButton>
            ),
          },
        }}
      />
    </form>
  )
}
