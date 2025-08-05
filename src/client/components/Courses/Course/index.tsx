import { Edit, OpenInNew } from '@mui/icons-material'
import { Alert, Box, Button, Checkbox, Container, FormControlLabel, Input, Modal, Paper, Skeleton, Tab, TextField, Tooltip, Typography } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Link, Route, Routes, useParams } from 'react-router-dom'

import { PUBLIC_URL } from '../../../../config'
import useCourse from '../../../hooks/useCourse'
import useCurrentUser from '../../../hooks/useCurrentUser'
import { useCreatePromptMutation, useDeletePromptMutation } from '../../../hooks/usePromptMutation'
import usePrompts from '../../../hooks/usePrompts'
import type { Message as MessageType } from '../../../types'
import Conversation from '../../Chat/Conversation'
import SystemMessage from '../../Chat/SystemMessage'
import Rag from '../../Rag/Rag'
import { formatDate, getCurTypeLabel } from '../util'
import EditCourseForm from './EditCourseForm'
import Prompt from './Prompt'
import Stats from './Stats'
import { RouterTabs } from '../../common/RouterTabs'
import Discussion from './Discussions'
import { ApiErrorView } from '../../common/ApiErrorView'
import apiClient from '../../../util/apiClient'

const Course = () => {
  const [showTeachers, setShowTeachers] = useState(false)

  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)

  const { id } = useParams() as { id: string }
  const { t, i18n } = useTranslation()

  const { language } = i18n

  const { user, isLoading: userLoading } = useCurrentUser()

  const { data: course, isSuccess: isCourseSuccess, error } = useCourse(id)
  if (error) {
    return <ApiErrorView error={error} />
  }

  if (userLoading || !user || !isCourseSuccess) return null

  const studentLink = `${window.location.origin}${PUBLIC_URL}/${course.courseId}`

  const amongResponsibles = course.responsibilities ? course.responsibilities.some((r) => r.user.id === user.id) : false

  if (!user.isAdmin && !amongResponsibles) {
    return (
      <Box>
        <Typography variant="h5">{t('noAccess')}</Typography>
      </Box>
    )
  }

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    enqueueSnackbar(t('linkCopied'), { variant: 'info' })
  }

  const courseEnabled = course.usageLimit > 0

  const isCourseActive = courseEnabled && Date.parse(course.activityPeriod.endDate) > Date.now() && Date.parse(course.activityPeriod.startDate) <= Date.now()

  const willBeEnabled = courseEnabled && Date.parse(course.activityPeriod.startDate) > Date.now()

  const wasEnabled = courseEnabled && Date.parse(course.activityPeriod.endDate) < Date.now()

  const getInfoSeverity = () => {
    if (!courseEnabled) return 'warning'
    if (isCourseActive) return 'success'
    return 'info'
  }

  const getInfoMessage = () => {
    if (!courseEnabled) return t('course:curreNotOpen')
    if (isCourseActive) return t('course:curreOpen')
    if (willBeEnabled) return `${t('course:curreWillBeOpen')} ${course.activityPeriod.startDate}`
    if (wasEnabled) return `${t('course:curreWasOpen')} ${course.activityPeriod.endDate}`
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
  const handleAddResponsible = async (e) => {
    e.preventDefault()
    const username = e.target.username.value
    apiClient.post(`/courses/${course.id}/responsibilities/assign`, { username: username })
  }
  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
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
              <Typography>{course.courseUnits.map((cu) => cu.code).join(', ')}</Typography>
            </div>
            <div style={{ ...right, boxSizing: 'border-box', height: '50px' }}>
              <Typography style={{ fontStyle: 'italic' }}>{getCurTypeLabel(course.courseUnitRealisationTypeUrn ?? '', language)}</Typography>
            </div>

            <div style={{ ...left, boxSizing: 'border-box' }}>
              <Typography>
                {t('active')} {formatDate(course.activityPeriod)}
              </Typography>
            </div>

            <div style={{ ...right, boxSizing: 'border-box' }}>
              <Link to={`https://studies.helsinki.fi/kurssit/toteutus/${course.courseId}`} target="_blank">
                {t('course:coursePage')} <OpenInNew fontSize="small" />
              </Link>
            </div>

            {courseEnabled && (
              <div style={{ ...left, boxSizing: 'border-box' }}>
                <Typography>
                  {t('admin:model')}: {course.model} <span style={{ marginRight: 20 }} />
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
                <Button onClick={() => setActivityPeriodFormOpen(true)} style={{ marginLeft: -8 }}>
                  {t('course:editCourse')} <Edit />
                </Button>
              )}
              {!courseEnabled && <Typography style={{ fontStyle: 'italic' }}>{t('course:howToActive')}</Typography>}
            </div>

            <div style={{ ...right, boxSizing: 'border-box' }} />

            {courseEnabled && (
              <Tooltip title={t('copy')} placement="right">
                <Button sx={{ p: 0 }} color="inherit">
                  <Typography style={{ textTransform: 'lowercase' }} onClick={() => handleCopyLink(studentLink)}>
                    {studentLink}
                  </Typography>
                </Button>
              </Tooltip>
            )}
          </div>

          {user.isAdmin && (
            <>
              <Button onClick={() => setShowTeachers(!showTeachers)} style={{ marginTop: 10, marginLeft: -8 }}>
                {showTeachers ? t('admin:hideTeachers') : t('admin:showTeachers')}
              </Button>
              {showTeachers && (
                <Box>
                  <Form onSubmit={handleAddResponsible}>
                    <TextField name="username" placeholder={'käyttäjänimi: '}></TextField>
                    <Button type={'submit'}>Lisää</Button>
                  </Form>
                  <ul>
                    {course.responsibilities.map((responsibility) => (
                      <li key={responsibility.id}>
                        {responsibility.user.last_name} {responsibility.user.first_names}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>

      <Modal open={activityPeriodFormOpen} onClose={() => setActivityPeriodFormOpen(false)}>
        <EditCourseForm course={course} setOpen={setActivityPeriodFormOpen} user={user} />
      </Modal>

      <Box my={2}>
        <RouterTabs>
          <Tab label={t('course:stats')} to={`/courses/${id}`} component={Link} />
          <Tab label={t('course:discussions')} to={`/courses/${id}/discussions`} component={Link} />
          <Tab label={t('course:prompts')} to={`/courses/${id}/prompts`} component={Link} />
          <Tab label={t('course:rag')} to={`/courses/${id}/rag`} component={Link} />
        </RouterTabs>
      </Box>

      <Routes>
        <Route path="/" element={<Stats courseId={id} />} />
        <Route path={`/discussions/*`} element={<Discussion />} />
        <Route path="/prompts" element={<Prompts courseId={id} />} />
        <Route path="/rag" element={<Rag />} />
      </Routes>
    </Container>
  )
}

const Prompts = ({ courseId }: { courseId: string }) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [system, setSystem] = useState('')
  const [messages, setMessages] = useState<MessageType[]>([])
  const [hidden, setHidden] = useState(false)
  const [mandatory, setMandatory] = useState(false)

  const createMutation = useCreatePromptMutation()
  const deleteMutation = useDeletePromptMutation()

  const handleReset = () => {
    setMessages([])
    setName('')
    setSystem('')
    setHidden(false)
    setMandatory(false)
  }

  const { prompts, isLoading: promptsLoading } = usePrompts(courseId)

  const mandatoryPromptId = prompts?.find((prompt) => prompt.mandatory)?.id

  const handleSave = async () => {
    try {
      await createMutation.mutateAsync({
        chatInstanceId: courseId,
        type: 'CHAT_INSTANCE',
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

  return (
    <>
      {promptsLoading ? ( // @todo separate prompts into its own component, like <Rag />
        <Skeleton />
      ) : (
        prompts.map((prompt) => <Prompt key={prompt.id} prompt={prompt} handleDelete={handleDelete} mandatoryPromptId={mandatoryPromptId} />)
      )}

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

        <Input sx={{ mr: 2, mb: 2 }} placeholder={t('promptName') as string} value={name} onChange={({ target }) => setName(target.value)} />

        <SystemMessage system={system} setSystem={setSystem} disabled={false} creation />

        <Conversation messages={messages} completion="" />

        <Box sx={{ paddingBottom: 2 }}>
          {!mandatoryPromptId ? (
            <FormControlLabel
              control={<Checkbox checked={mandatory} onChange={() => setMandatory((prev) => !prev)} />}
              label={t('course:editMandatoryPrompt')}
              sx={{ mr: 5 }}
            />
          ) : (
            <Tooltip title={t('course:oneMandatoryPrompt')}>
              <FormControlLabel control={<Checkbox checked={mandatory} disabled />} label={t('course:editMandatoryPrompt')} sx={{ mr: 5 }} />
            </Tooltip>
          )}
          <FormControlLabel control={<Checkbox value={hidden} onChange={() => setHidden((prev) => !prev)} />} label={t('hidePrompt')} />
        </Box>
        <Button variant="contained" onClick={handleSave} sx={{ mr: 2 }}>
          {t('common:save')}
        </Button>
      </Paper>
    </>
  )
}

export default Course
