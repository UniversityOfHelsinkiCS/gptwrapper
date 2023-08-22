import React, { useState } from 'react'
import { Box, Paper, Typography, TextField, Button } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

import { Set, Message as MessageType } from '../../../types'
import SystemMessage from '../../Chat/SystemMessage'
import Conversation from '../../Chat/Conversation'
import { useCreatePromptMutation } from '../../../hooks/usePromptMutation'

const Message = ({
  message,
  setMessage,
  handleAdd,
  handleReset,
  resetDisabled,
}: {
  message: string
  setMessage: Set<string>
  handleAdd: () => void
  handleReset: () => void
  resetDisabled: boolean
}) => {
  const { t } = useTranslation()

  return (
    <Box mb={2}>
      <Box mb={1}>
        <Typography variant="h6">{t('common:message')}</Typography>
      </Box>
      <Box mb={2}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Box>

      <Button onClick={handleAdd}>{t('common:addMessage')}</Button>
      <Button sx={{ ml: 2 }} onClick={handleReset} disabled={resetDisabled}>
        {t('reset')}
      </Button>
    </Box>
  )
}

const getRole = (messages: MessageType[]) => {
  if (messages.length === 0) return 'user'
  const lastMessage = messages[messages.length - 1]

  return lastMessage.role === 'user' ? 'assistant' : 'user'
}

const Course = () => {
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<MessageType[]>([])

  const { t } = useTranslation()

  const mutation = useCreatePromptMutation()

  const handleAdd = () => {
    setMessages([...messages, { content: message, role: getRole(messages) }])
    setMessage('')
  }

  const handleReset = () => {
    setMessages([])
    setSystem('')
    setMessage('')
  }

  const handleSave = () => {
    try {
      mutation.mutate({ serviceId: 'test', systemMessage: system, messages })
      enqueueSnackbar('Prompt created', { variant: 'success' })
      handleReset()
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box
      sx={{
        margin: '0 auto',
        width: '90%',
        padding: '5%',
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          padding: '5% 10%',
          mt: 5,
        }}
      >
        <SystemMessage system={system} setSystem={setSystem} disabled={false} />
        <Conversation messages={messages} completion="" />
        <Message
          message={message}
          setMessage={setMessage}
          handleAdd={handleAdd}
          handleReset={handleReset}
          resetDisabled={false}
        />
        <Button variant="contained" onClick={handleSave}>
          {t('common:save')}
        </Button>
      </Paper>
    </Box>
  )
}

export default Course
