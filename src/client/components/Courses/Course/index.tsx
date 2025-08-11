import { Edit, OpenInNew } from '@mui/icons-material'
import { Alert, Box, Button, Checkbox, Container, FormControlLabel, Input, Modal, Paper, Skeleton, Stack, Tab, Tooltip, Typography } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Route, Routes, useParams } from 'react-router-dom'

import { PUBLIC_URL } from '../../../../config'
import useCourse from '../../../hooks/useCourse'
import useCurrentUser from '../../../hooks/useCurrentUser'
import { useCreatePromptMutation, useDeletePromptMutation } from '../../../hooks/usePromptMutation'
import usePrompts from '../../../hooks/usePrompts'
import type { Message as MessageType, Responsebility, User } from '../../../types'
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
import { ActionUserSearch } from '../../Admin/UserSearch'

const Course = () => {
  const [showTeachers, setShowTeachers] = useState(false)
  const [addTeacherViewOpen, setAddTeacherViewOpen] = useState(false)
  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)
  const [responsibilities, setResponsibilities] = useState<Responsebility[]>([])
  const { id } = useParams() as { id: string }
  const { t, i18n } = useTranslation()

  const { language } = i18n

  const { user, isLoading: userLoading } = useCurrentUser()
  const { data: chatInstance, isSuccess: isCourseSuccess, error, refetch: refetchCourse } = useCourse(id)
  console.log(chatInstance)
  if (error) {
    return <ApiErrorView error={error} />
  }
  useEffect(() => {
    if (isCourseSuccess) {
      setResponsibilities(chatInstance?.responsibilities)
    }
  }, [isCourseSuccess])

  if (userLoading || !user || !isCourseSuccess) return null

  const studentLink = `${window.location.origin}${PUBLIC_URL}/${chatInstance.courseId}`

  const amongResponsibles = chatInstance.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user.id) : false

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

  const courseEnabled = chatInstance.usageLimit > 0

  const isCourseActive =
    courseEnabled && Date.parse(chatInstance.activityPeriod.endDate) > Date.now() && Date.parse(chatInstance.activityPeriod.startDate) <= Date.now()

  const willBeEnabled = courseEnabled && Date.parse(chatInstance.activityPeriod.startDate) > Date.now()

  const wasEnabled = courseEnabled && Date.parse(chatInstance.activityPeriod.endDate) < Date.now()

  const getInfoSeverity = () => {
    if (!courseEnabled) return 'warning'
    if (isCourseActive) return 'success'
    return 'info'
  }

  const getInfoMessage = () => {
    if (!courseEnabled) return t('course:curreNotOpen')
    if (isCourseActive) return t('course:curreOpen')
    if (willBeEnabled) return `${t('course:curreWillBeOpen')} ${chatInstance.activityPeriod.startDate}`
    if (wasEnabled) return `${t('course:curreWasOpen')} ${chatInstance.activityPeriod.endDate}`
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
  const handleAddResponsible = async (user: User) => {
    const username = user.username
    const result = await apiClient.post(`/courses/${chatInstance.id}/responsibilities/assign`, { username: username })
    if (result.status === 200) {
      const responsibility = result.data
      setResponsibilities([...responsibilities, responsibility])
      refetchCourse()
    }
  }
 const isAlreadyAssigned = (user: User) => {
      const existsAlready: Responsebility | undefined = chatInstance.responsibilities.find((r: Responsebility) => {return r.user.id === user.id})
      console.log(chatInstance.responsibilities)
      console.log(user)
      console.log(existsAlready)
      return existsAlready != undefined
  }

  const drawActionComponent = (user: User) => {
       const isResponsible = isAlreadyAssigned(user)
    return (
      <>
      {!isResponsible ? 
      <Button onClick={() => handleAddResponsible(user)}>
        {t('course:add')}

      </Button>
    :
    <Typography>vastuussa</Typography>
      }
      </>
    )
  }
  const handleRemoveResponsibility = async (responsibility) => {
    const result = await apiClient.post(`/courses/${chatInstance.id}/responsibilities/remove`, { username: responsibility.user?.username })
    if (result.status === 200) {
      const filteredResponsibilities = responsibilities.filter((r) => r.id !== responsibility.id)
      setResponsibilities(filteredResponsibilities)
    }
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
              <Typography variant="h5">{chatInstance.name[language]}</Typography>
            </div>

            <div style={{ ...left, boxSizing: 'border-box', height: '50px' }}>
              <Typography>{chatInstance.courseUnits.map((cu) => cu.code).join(', ')}</Typography>
            </div>
            <div style={{ ...right, boxSizing: 'border-box', height: '50px' }}>
              <Typography style={{ fontStyle: 'italic' }}>{getCurTypeLabel(chatInstance.courseUnitRealisationTypeUrn ?? '', language)}</Typography>
            </div>

            <div style={{ ...left, boxSizing: 'border-box' }}>
              <Typography>
                {t('active')} {formatDate(chatInstance.activityPeriod)}
              </Typography>
            </div>

            <div style={{ ...right, boxSizing: 'border-box' }}>
              <Link to={`https://studies.helsinki.fi/kurssit/toteutus/${chatInstance.courseId}`} target="_blank">
                {t('course:coursePage')} <OpenInNew fontSize="small" />
              </Link>
            </div>

            {courseEnabled && (
              <div style={{ ...left, boxSizing: 'border-box' }}>
                <Typography>
                  {t('admin:model')}: {chatInstance.model} <span style={{ marginRight: 20 }} />
                  {t('admin:usageLimit')}: {chatInstance.usageLimit}
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
                  <Button
                    onClick={() => {
                      setAddTeacherViewOpen(true)
                    }}
                  >
                    {t('course:add')}
                  </Button>
                  <Stack sx={{ margin: 1, padding: 1, borderColor: 'gray', borderWidth: 1, borderStyle: 'solid' }}>
                    {responsibilities.map((responsibility) => (
                      <Box key={responsibility.id} sx={{ display: 'flex', alignItems: 'center', padding: 1 }}>
                        <Typography>
                          {responsibility.user.last_name} {responsibility.user.first_names}
                        </Typography>
                        <AssignedResponsibilityManagement
                          handleRemove={() => {
                            handleRemoveResponsibility(responsibility)
                          }}
                          responsibility={responsibility}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>

      <Modal
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        open={addTeacherViewOpen}
        onClose={() => setAddTeacherViewOpen(false)}
      >
        <Box
          sx={{
            width: '80vw',
            height: '80vh',
            background: 'white',
            padding: '2rem',
            overflowY: 'scroll',
          }}
        >
          <ActionUserSearch
            actionText={t('course:add')}
            drawActionComponent={drawActionComponent}
          />
        </Box>
      </Modal>

      <Modal open={activityPeriodFormOpen} onClose={() => setActivityPeriodFormOpen(false)}>
        <EditCourseForm course={chatInstance} setOpen={setActivityPeriodFormOpen} user={user} />
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
        <Route path="/prompts" element={<Prompts courseId={id} chatInstanceId={chatInstance.id} />} />
        <Route path="/rag" element={<Rag />} />
      </Routes>
    </Container>
  )
}

const AssignedResponsibilityManagement = ({ responsibility, handleRemove }) => {
  const { t } = useTranslation()
  if (!responsibility.createdByUserId) {
    return <Stack direction={'row'} sx={{ marginLeft: 'auto', alignItems: 'center', height: '1rem' }}></Stack>
  }
  return (
    <Stack direction={'row'} sx={{ marginLeft: 'auto', alignItems: 'center', height: '1rem' }}>
      <Typography>{t('course:customResponsibility')}</Typography>
      <Button onClick={handleRemove}>{t('course:remove')}</Button>
    </Stack>
  )
}

const Prompts = ({ courseId, chatInstanceId }: { courseId: string; chatInstanceId: string }) => {
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
        chatInstanceId,
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
