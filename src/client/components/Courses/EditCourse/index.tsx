import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Modal,
  Checkbox,
  FormControlLabel,
  Input,
  Alert,
} from '@mui/material'
import { OpenInNew, Edit, FileCopyOutlined } from '@mui/icons-material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'

import { PUBLIC_URL } from '../../../../config'
import { SetState, Message as MessageType } from '../../../types'
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
import EditCourseForm from './EditCourseForm'
import MaxTokenUsageStudents from './MaxTokenUsageStudents'

const Message = ({
  message,
  setMessage,
  handleAdd,
  handleReset,
  resetDisabled,
}: {
  message: string
  setMessage: SetState<string>
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
  const [name, setName] = useState('')
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<MessageType[]>([])
  const [hidden, setHidden] = useState(false)

  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)

  const { id } = useParams()
  const { t, i18n } = useTranslation()

  const { language } = i18n

  const createMutation = useCreatePromptMutation()
  const deleteMutation = useDeletePromptMutation()

  const handleAdd = () => {
    setMessages([...messages, { content: message, role: getRole(messages) }])
    setMessage('')
  }

  const handleReset = () => {
    setMessages([])
    setName('')
    setSystem('')
    setMessage('')
    setHidden(false)
  }

  const { prompts, isLoading } = usePrompts(id as string)
  const { course, isLoading: courseLoading } = useCourse(id as string)

  const studentLink = `${window.location.origin}${PUBLIC_URL}/${course?.courseId}`

  if (isLoading || courseLoading || !course) return null

  const handleSave = () => {
    try {
      createMutation.mutate({
        chatInstanceId: course.id,
        name,
        systemMessage: system,
        messages,
        hidden,
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

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    enqueueSnackbar(t('linkCopied'), { variant: 'info' })
  }

  const isCourseActive =
    course.usageLimit > 0 &&
    Date.parse(course.activityPeriod.endDate) > Date.now()

  return (
    <Box
      sx={{
        margin: '0 auto',
        width: '90%',
        padding: '5%',
      }}
    >
      {!isCourseActive && (
        <Alert severity="warning">
          <Typography variant="h6">{t('course:curreNotOpen')}</Typography>
        </Alert>
      )}
      <Box display="flex">
        <Paper
          variant="outlined"
          sx={{
            padding: '2%',
            mt: 2,
          }}
        >
          <Typography variant="h5">{course.name[language]}</Typography>
          <Typography>
            {t('active')}
            {formatDate(course.activityPeriod)}
          </Typography>

          <Button
            startIcon={<Edit />}
            onClick={() => setActivityPeriodFormOpen(true)}
          >
            {t('course:editCourse')}
          </Button>

          <Button endIcon={<OpenInNew />}>
            <Link to={studentLink}>{t('common:toStudentView')}</Link>
          </Button>

          <Box fontStyle="italic">
            <Typography>{studentLink}</Typography>
          </Box>
          <Box mr={2} />
          <Box>
            <Button
              startIcon={<FileCopyOutlined />}
              color="primary"
              onClick={() => handleCopyLink(studentLink)}
            >
              {t('copyStudentLink')}
            </Button>
          </Box>
        </Paper>
      </Box>

      <MaxTokenUsageStudents courseId={id as string} />

      {prompts.map((prompt) => (
        <Prompt key={prompt.id} prompt={prompt} handleDelete={handleDelete} />
      ))}

      <Paper
        variant="outlined"
        sx={{
          padding: '5% 10%',
          mt: 2,
        }}
      >
        <Box mb={2}>
          <Typography variant="h5" display="inline">
            {t('common:newPrompt')}
          </Typography>
        </Box>

        <Input
          sx={{ mr: 2 }}
          placeholder={t('promptName') as string}
          value={name}
          onChange={({ target }) => setName(target.value)}
        />

        <FormControlLabel
          control={
            <Checkbox
              value={hidden}
              onChange={() => setHidden((prev) => !prev)}
            />
          }
          label={t('hidePrompt')}
        />

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
        <EditCourseForm course={course} setOpen={setActivityPeriodFormOpen} />
      </Modal>
    </Box>
  )
}

export default Course
