import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
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
import { Message as MessageType } from '../../../types'
import SystemMessage from '../../Chat/SystemMessage'
import Conversation from '../../Chat/Conversation'
import usePrompts from '../../../hooks/usePrompts'
import useCourse from '../../../hooks/useCourse'
import useCurrentUser from '../../../hooks/useCurrentUser'
import {
  useCreatePromptMutation,
  useDeletePromptMutation,
} from '../../../hooks/usePromptMutation'
import { formatDate, getCurTypeLabel } from '../util'
import Prompt from './Prompt'
import EditCourseForm from './EditCourseForm'
import MaxTokenUsageStudents from './MaxTokenUsageStudents'
import Stats from './Stats'

const Course = () => {
  const [name, setName] = useState('')
  const [system, setSystem] = useState('')
  const [messages, setMessages] = useState<MessageType[]>([])
  const [hidden, setHidden] = useState(false)
  const [mandatory, setMandatory] = useState(false)

  const [showTeachers, setShowTeachers] = useState(false)

  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)

  const { id } = useParams()
  const { t, i18n } = useTranslation()

  const { language } = i18n

  const createMutation = useCreatePromptMutation()
  const deleteMutation = useDeletePromptMutation()

  const handleReset = () => {
    setMessages([])
    setName('')
    setSystem('')
    setHidden(false)
    setMandatory(false)
  }

  const { prompts, isLoading } = usePrompts(id as string)
  const { course, isLoading: courseLoading } = useCourse(id as string)
  const { user, isLoading: isUserLoading } = useCurrentUser()

  const studentLink = `${window.location.origin}${PUBLIC_URL}/${course?.courseId}`

  if (isLoading || courseLoading || !course || isUserLoading || !user)
    return null

  const amongResponsibles = course.responsibilities
    ? course.responsibilities.some((r) => r.user.id === user.id)
    : false

  if (!user.isAdmin && !amongResponsibles) {
    return (
      <Box>
        <Typography variant="h5">{t('noAccess')}</Typography>
      </Box>
    )
  }

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

  const responsebilitues = course.responsibilities

  const isCourseActive =
    courseEnabled &&
    Date.parse(course.activityPeriod.endDate) > Date.now() &&
    Date.parse(course.activityPeriod.startDate) <= Date.now()

  const willBeEnabled =
    courseEnabled && Date.parse(course.activityPeriod.startDate) > Date.now()

  const wasEnabled =
    courseEnabled && Date.parse(course.activityPeriod.endDate) < Date.now()

  const getInfoSeverity = () => {
    if (!courseEnabled) return 'warning'
    if (isCourseActive) return 'success'
    return 'info'
  }

  const getInfoMessage = () => {
    if (!courseEnabled) return t('course:curreNotOpen')
    if (isCourseActive) return t('course:curreOpen')
    if (willBeEnabled)
      return `${t('course:curreWillBeOpen')} ${course.activityPeriod.startDate}`
    if (wasEnabled)
      return `${t('course:curreWasOpen')} ${course.activityPeriod.endDate}`
    return ''
  }

  const full = {
    flex: '0 0 100%',
    boxSizing: 'borderBox',
    height: '40px',
  }

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
      <Alert severity={getInfoSeverity()}>
        <Typography variant="h6">{getInfoMessage()}</Typography>
      </Alert>

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
            <div style={{ ...full, boxSizing: 'border-box', height: '50px' }}>
              <Typography variant="h5">{course.name[language]}</Typography>
            </div>

            <div style={{ ...left, boxSizing: 'border-box', height: '50px' }}>
              <Typography>
                {course.courseUnits.map((cu) => cu.code).join(', ')}
              </Typography>
            </div>
            <div style={{ ...right, boxSizing: 'border-box', height: '50px' }}>
              <Typography style={{ fontStyle: 'italic' }}>
                {getCurTypeLabel(course.courseUnitRealisationTypeUrn, language)}
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

          {user.isAdmin && (
            <>
              <Button
                onClick={() => setShowTeachers(!showTeachers)}
                style={{ marginTop: 10, marginLeft: -8 }}
              >
                {showTeachers
                  ? t('admin:hideTeachers')
                  : t('admin:showTeachers')}
              </Button>
              {showTeachers && (
                <ul>
                  {responsebilitues.map((responsibility) => (
                    <li>
                      {responsibility.user.last_name}{' '}
                      {responsibility.user.first_names}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Paper>
      </Box>

      <Stats courseId={id} />

      {courseEnabled && <MaxTokenUsageStudents course={course} />}

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

        <SystemMessage
          system={system}
          setSystem={setSystem}
          disabled={false}
          creation
        />

        <Conversation messages={messages} completion="" />

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
