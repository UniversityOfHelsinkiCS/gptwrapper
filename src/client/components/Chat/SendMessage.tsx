import React from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Set } from '../../types'

const SendMessage = ({
  message,
  setMessage,
  handleSend,
  handleReset,
  disabled,
  resetDisabled,
}: {
  message: string
  setMessage: Set<string>
  handleSend: () => void
  handleReset: () => void
  disabled: boolean
  resetDisabled: boolean
}) => {
  const { t } = useTranslation()

  return (
    <Box mb={2}>
      <Box mb={1}>
        <Typography variant="h6">
          {t('chat:message')}
        </Typography>
      </Box>
      <Box mb={2}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('chat:messagePlaceholder') as string}
        />
      </Box>
      
      <Button
        variant="contained"
        onClick={handleSend}
        disabled={disabled}
      >
        {t('send')}
      </Button>
      <Button
        sx={{ ml: 2 }}
        onClick={handleReset}
        disabled={resetDisabled}  
      >
        {t('reset')}
      </Button>
    </Box>
  )
}

export default SendMessage
