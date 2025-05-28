import { Send } from '@mui/icons-material'
import { Box, Container, IconButton, Paper, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import useUserStatus from '../../hooks/useUserStatus'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const ChatBox = ({ disabled, onSubmit }: { disabled: boolean; onSubmit: (message: string) => void }) => {
  const { courseId } = useParams()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)
  const [message, setMessage] = useState<string>('')

  const { t, i18n } = useTranslation()
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSubmit(message)
      setMessage('')
      refetchStatus()
    }
  }
  useEffect(() => {
    console.log('userStatus', userStatus)
  })

  if (statusLoading) {
    return <p>loading</p>
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

        <Box>
          <Typography variant="body1" style={{ padding: '0.5rem', fontSize: '0.875rem' }}>
            {userStatus.usage} / {userStatus.limit} {t('status:tokensUsed')}
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}
