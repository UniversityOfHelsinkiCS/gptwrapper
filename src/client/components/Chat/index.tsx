import React from 'react'
import { Box, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'

const SystemMessage = () => {
  const { t } = useTranslation()

  return (
    <Box mb={2}>
      <TextField
        fullWidth
        multiline
        minRows={2}
        placeholder={t('chat:exampleSystemMessage') as string}
      />
    </Box>
  )
}

const NewMessage = () => {
  const { t } = useTranslation()

  return (
    <TextField
      fullWidth
      multiline
      minRows={5}
      placeholder={t('chat:messagePlaceholder') as string}
    />
  )
}

const Chat = () => (
  <Box
    m={2}
    sx={{
      margin: 'auto',
      width: '80%',
      padding: '5%',
    }}
  >
    <SystemMessage />
    <NewMessage />
  </Box>
)

export default Chat
