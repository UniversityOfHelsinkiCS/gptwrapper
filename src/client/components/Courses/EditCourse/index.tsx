import React, { useState } from 'react'
import { Box, Paper, Typography, TextField, Button } from '@mui/material'
import { OpenInNew } from '@mui/icons-material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'

import { Set, Message as MessageType } from '../../../types'
import SystemMessage from '../../Chat/SystemMessage'
import Conversation from '../../Chat/Conversation'
import usePrompts from '../../../hooks/usePrompts'
import {
  useCreatePromptMutation,
  useDeletePromptMutation,
} from '../../../hooks/usePromptMutation'

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

  const { id } = useParams()
  const { t } = useTranslation()

  const createMutation = useCreatePromptMutation()
  const deleteMutation = useDeletePromptMutation()

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
      createMutation.mutate({
        serviceId: id as string,
        systemMessage: system,
        messages,
      })
      enqueueSnackbar('Prompt created', { variant: 'success' })
      handleReset()
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const handleDelete = (promptId: string) => {
    try {
      deleteMutation.mutate(promptId)
      enqueueSnackbar('Prompt deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const { prompts, isLoading } = usePrompts(id as string)

  if (isLoading) return null

  return (
    <Box
      sx={{
        margin: '0 auto',
        width: '90%',
        padding: '5%',
      }}
    >
      <Box mb={-2}>
        <Link to="/hy-opt-cur-2324-3a70433a-d793-46a4-a43e-a42968419133">
          {t('common:toStudentView')} <OpenInNew sx={{ mb: -1 }} />
        </Link>
      </Box>
      <Paper
        variant="outlined"
        sx={{
          padding: '5% 10%',
          mt: 5,
        }}
      >
        <Box mb={4}>
          <Typography variant="h5" display="inline">
            {t('common:newPrompt')}
          </Typography>
        </Box>
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

      {prompts.map((prompt) => (
        <Box key={prompt.id} pt="1%">
          <Paper
            variant="outlined"
            sx={{
              padding: '1%',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6" display="inline">
              {prompt.systemMessage}
            </Typography>
            <Button onClick={() => handleDelete(prompt.id)} color="error">
              {t('common:delete')}
            </Button>
          </Paper>
        </Box>
      ))}
    </Box>
  )
}

export default Course
