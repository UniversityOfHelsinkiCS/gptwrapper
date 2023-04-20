import React from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Set } from '../../types'

const SendMessage = ({
  message,
  setMessage,
  handleSend,
}: {
  message: string
  setMessage: Set<string>
  handleSend: () => void
}) => {
  const { t } = useTranslation()

  return (
    <Box mb={2}>
      <Typography variant="h6">
        {t('chat:message')}
      </Typography>
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
        disabled={!message}>
        {t('send')}
      </Button>
    </Box>
  )
}

export default SendMessage