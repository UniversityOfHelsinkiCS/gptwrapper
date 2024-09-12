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
  Tooltip,
} from '@mui/material'
import { OpenInNew, Edit } from '@mui/icons-material'
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
import Stats from './Stats'

import curTypes from '../../../locales/curTypes.json'

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
  const [mandatory, setMandatory] = useState(false)

  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)

  const { id } = useParams()
  const { t, i18n } = useTranslation()

  const { language } = i18n

  const createMutation = useCreatePromptMutation()
  const deleteMutation = useDeletePromptMutation()

  const getTypeLabel = (type: string) =>
    curTypes[type] && curTypes[type].name[language]

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
    setMandatory(false)
  }

  const { prompts, isLoading } = usePrompts(id as string)
  const { course, isLoading: courseLoading } = useCourse(id as string)

  const studentLink = `${window.location.origin}${PUBLIC_URL}/${course?.courseId}`

  if (isLoading || courseLoading || !course) return null

  const mandatoryPromptId = prompts.find((prompt) => prompt.mandatory)?.id

  const handleSave = () => {
    try {
      createMutation.mutate({
        chatInstanceId: course.id,
        name,
        systemMessage: system,
        messages,
        hidden,
        mandatory,
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

  const courseEnabled = course.usageLimit > 0

  const isCourseActive =
    courseEnabled &&
    Date.parse(course.activityPeriod.endDate) > Date.now() &&
    Date.parse(course.activityPeriod.startDate) <= Date.now()

  const left = {
    flex: '0 0 74%',
    boxSizing: 'borderBox',
    height: '40px',
  }

  const right = {
    flex: '0 0 26%',
    boxSizing: 'borderBox',
    height: '40px',
  }

  return (
    <Box
      sx={{
        margin: '0 auto',
        width: '90%',
        padding: '5%',
      }}
    >
      {!courseEnabled && (
        <Alert severity="warning">
          <Typography variant="h6">{t('course:curreNotOpen')}</Typography>
        </Alert>
      )}

      {isCourseActive && (
        <Alert severity="success">
          <Typography variant="h6">{t('course:curreOpen')}</Typography>
        </Alert>
      )}

      <Box display="flex">
        <Paper
          variant="outlined"
          sx={{
            padding: '2%',
            mt: 2,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ ...left, boxSizing: 'border-box', height: '50px' }}>
              <Typography variant="h5">{course.name[language]}</Typography>
            </div>
            <div style={{ ...right, boxSizing: 'border-box', height: '50px' }}>
              <Typography style={{ fontStyle: 'italic' }}>
                {getTypeLabel(course.courseUnitRealisationTypeUrn)}
              </Typography>
            </div>

            <div style={{ ...left, boxSizing: 'border-box' }}>
              <Typography>
                {t('active')} {formatDate(course.activityPeriod)}
              </Typography>
            </div>

            <div style={{ ...right, boxSizing: 'border-box' }}>
              <Link
                to={`https://studies.helsinki.fi/kurssit/toteutus/${course.courseId}`}
                target="_blank"
              >
                {t('course:coursePage')} <OpenInNew fontSize="small" />
              </Link>
            </div>

            {courseEnabled && (
              <div style={{ ...left, boxSizing: 'border-box' }}>
                <Typography>
                  {t('admin:model')}: {course.model}{' '}
                  <span style={{ marginRight: 20 }} />
                  {t('admin:usageLimit')}: {course.usageLimit}
                </Typography>
              </div>
            )}

            {courseEnabled && (
              <div style={{ ...right, boxSizing: 'border-box' }}>
                <Link to={studentLink}>
                  {t('common:toStudentView')} <OpenInNew fontSize="small" />
                </Link>
              </div>
            )}

            <div style={{ ...left, boxSizing: 'border-box' }}>
              {courseEnabled && (
                <Button
                  onClick={() => setActivityPeriodFormOpen(true)}
                  style={{ marginLeft: -8 }}
                >
                  {t('course:editCourse')} <Edit />
                </Button>
              )}
              {!courseEnabled && (
                <Typography style={{ fontStyle: 'italic' }}>
                  {t('course:howToActive')}
                </Typography>
              )}
            </div>

            <div style={{ ...right, boxSizing: 'border-box' }} />

            {courseEnabled && (
              <Tooltip title={t('copy')} placement="right">
                <Button sx={{ p: 0 }} color="inherit">
                  <Typography
                    style={{ textTransform: 'lowercase' }}
                    onClick={() => handleCopyLink(studentLink)}
                  >
                    {studentLink}
                  </Typography>
                </Button>
              </Tooltip>
            )}
          </div>
        </Paper>
      </Box>

      <Stats courseId={id} />

      <MaxTokenUsageStudents course={course} />

      {prompts.map((prompt) => (
        <Prompt
          key={prompt.id}
          prompt={prompt}
          handleDelete={handleDelete}
          mandatoryPromptId={mandatoryPromptId}
        />
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
          sx={{ mr: 2, mb: 2 }}
          placeholder={t('promptName') as string}
          value={name}
          onChange={({ target }) => setName(target.value)}
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

        <Box sx={{ paddingBottom: 2 }}>
          {!mandatoryPromptId ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={mandatory}
                  onChange={() => setMandatory((prev) => !prev)}
                />
              }
              label={t('course:editMandatoryPrompt')}
              sx={{ mr: 5 }}
            />
          ) : (
            <Tooltip title={t('course:oneMandatoryPrompt')}>
              <FormControlLabel
                control={<Checkbox checked={mandatory} disabled />}
                label={t('course:editMandatoryPrompt')}
                sx={{ mr: 5 }}
              />
            </Tooltip>
          )}
          <FormControlLabel
            control={
              <Checkbox
                value={hidden}
                onChange={() => setHidden((prev) => !prev)}
              />
            }
            label={t('hidePrompt')}
          />
        </Box>
        <Button variant="contained" onClick={handleSave} sx={{ mr: 2 }}>
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
