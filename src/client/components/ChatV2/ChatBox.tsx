import { Send } from '@mui/icons-material'
import StopIcon from '@mui/icons-material/Stop';
import { Box, IconButton, TextField, Typography } from '@mui/material'
import { useState, useRef } from 'react'
import useUserStatus from '../../hooks/useUserStatus'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const ChatBox = ({ disabled, onSubmit }: { disabled: boolean; onSubmit: (message: string) => void }) => {
  const { courseId } = useParams()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)
  const [message, setMessage] = useState<string>('')

  const textFieldRef = useRef<HTMLInputElement>(null)

  const { t, i18n } = useTranslation()
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // This is here to prevent the form from submitting but because disabling it in the component breaks re-focusing on the text field
    if (disabled) return


    if (message.trim()) {
      onSubmit(message)
      setMessage('')
      refetchStatus()
    }

    if (textFieldRef.current) {
      textFieldRef.current.focus()
    }
  }

  if (statusLoading) {
    return <p>loading</p>
  }
  return (
    <Box
      sx={{
        width: '60%',
        minWidth: 300,
        margin: 'auto',
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      >
        <Box sx={{ border: '1px solid rgba(0,0,0,0.4)', borderRadius: '0.2rem' }}>

          <TextField
            ref={textFieldRef}
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Kirjoita viestisi tähän..."
            fullWidth
            multiline
            maxRows={8}
            variant="standard"
            sx={{ padding: '0.5rem 1rem' }}
            slotProps={{
              input: {
                disableUnderline: true,
                endAdornment: disabled ? (
                  // TODO: finish the stop signal API
                  <IconButton disabled={!disabled}>
                    <StopIcon />
                  </IconButton>
                ) : (
                  <IconButton disabled={disabled} type="submit">
                    <Send />
                  </IconButton>
                ),
              },
            }}
          />
        </Box>

        <Box>
          <Typography variant="body1" style={{ padding: '0.5rem', fontSize: '0.875rem' }}>
            {userStatus.usage} / {userStatus.limit} {t('status:tokensUsed')}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
