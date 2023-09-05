import React, { useState } from 'react'
import { Box, Paper, Typography, TextField, Button, Modal } from '@mui/material'
import { OpenInNew, Edit } from '@mui/icons-material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'

import { Set, Message as MessageType } from '../../../types'
import EditActivityPeriod from './EditActivityPeriod'
import SystemMessage from '../../Chat/SystemMessage'
import Conversation from '../../Chat/Conversation'
import usePrompts from '../../../hooks/usePrompts'
import useCourse from '../../../hooks/useCourse'
import {
  useCreatePromptMutation,
  useDeletePromptMutation,
} from '../../../hooks/usePromptMutation'
import { formatDate } from '../util'
import Prompt from './Prompt'

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

  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)

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

  const { prompts, isLoading } = usePrompts(id as string)
  const { course, isLoading: courseLoading } = useCourse(id as string)

  if (isLoading || courseLoading || !course) return null

  const handleSave = () => {
    try {
      createMutation.mutate({
        serviceId: course.id,
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
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('confirmDeletePrompt') as string)) return

    try {
      deleteMutation.mutate(promptId)
      enqueueSnackbar('Prompt deleted', { variant: 'success' })
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
      <Box display="flex">
        <Paper
          variant="outlined"
          sx={{
            padding: '2%',
            mt: 2,
          }}
        >
          <Typography variant="h5">{course.name}</Typography>
          <Typography>
            Käynnissä: {formatDate(course.activityPeriod)}
          </Typography>

          <Button
            startIcon={<Edit />}
            onClick={() => setActivityPeriodFormOpen(true)}
          >
            {t('editActivityPeriod')}
          </Button>

          <Button endIcon={<OpenInNew />}>
            <Link to={`/${course?.courseId}`}>{t('common:toStudentView')}</Link>
          </Button>
        </Paper>
      </Box>

      {prompts.map((prompt) => (
        <Prompt prompt={prompt} handleDelete={handleDelete} />
      ))}

      <Paper
        variant="outlined"
        sx={{
          padding: '5% 10%',
          mt: 2,
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

      <Modal
        open={activityPeriodFormOpen}
        onClose={() => setActivityPeriodFormOpen(false)}
      >
        <EditActivityPeriod
          course={course}
          setOpen={setActivityPeriodFormOpen}
        />
      </Modal>
    </Box>
  )
}

export default Course
