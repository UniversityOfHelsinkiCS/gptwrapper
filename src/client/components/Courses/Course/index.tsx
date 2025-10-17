import Close from '@mui/icons-material/Close'
import Edit from '@mui/icons-material/Edit'
import OpenInNew from '@mui/icons-material/OpenInNew'
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Modal,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tooltip,
  Typography,
} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Route, Routes, useParams } from 'react-router-dom'

import { PUBLIC_URL } from '../../../../config'
import useCourse from '../../../hooks/useCourse'
import useCurrentUser from '../../../hooks/useCurrentUser'
import usePrompts from '../../../hooks/usePrompts'
import type { Prompt as PromptType, Responsebility, User } from '../../../types'
import Rag from '../../Rag/Rag'
import { formatDate, getCurTypeLabel } from '../util'
import EditCourseForm from './EditCourseForm'
import Prompt from './Prompt'
import Stats from './Stats'
import { RouterTabs } from '../../common/RouterTabs'
import Discussion from './Discussions'
import { ApiErrorView } from '../../common/ApiErrorView'
import apiClient from '../../../util/apiClient'
import { ResponsibilityActionUserSearch } from '../../Admin/UserSearch'
import { useCourseRagIndices } from '../../../hooks/useRagIndices'
import { PromptEditor } from '../../Prompt/PromptEditor'
import { OutlineButtonBlack, OutlineButtonBlue } from '../../ChatV2/general/Buttons'

/**
 * React-router compatible lazy loaded component for Course page
 */

export function Component() {
  const [showTeachers, setShowTeachers] = useState(false)
  const [addTeacherViewOpen, setAddTeacherViewOpen] = useState(false)
  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)
  const [responsibilities, setResponsibilities] = useState<Responsebility[]>([])
  const { id } = useParams() as { id: string }
  const { t, i18n } = useTranslation()

  const { language } = i18n

  const { user, isLoading: userLoading } = useCurrentUser()
  const { data: chatInstance, isSuccess: isCourseSuccess, error, refetch: refetchCourse } = useCourse(id)

  useEffect(() => {
    if (isCourseSuccess) {
      setResponsibilities(chatInstance?.responsibilities)
    }
  }, [isCourseSuccess])

  if (error) {
    return <ApiErrorView error={error} />
  }

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

  const isAdminOrResponsible = () => {
    return user.isAdmin || chatInstance.responsibilities.find((r) => r.user.username === user.username)
  }
  const userIsAdminOrResponsible = isAdminOrResponsible()

  const handleAddResponsible = async (user: User) => {

    const username = user.username
    const result = await apiClient.post(`/courses/${id}/responsibilities/assign`, { username: username })
    if (result.status === 200) {
      const responsibility = result.data
      setResponsibilities([...responsibilities, responsibility])
      refetchCourse()
    }
  }
  const drawActionComponent = (user: User) => {
    const usersResponsibility: Responsebility | undefined = responsibilities.find((r: Responsebility) => {
      return r.user.id === user.id
    })
    const isResponsible = usersResponsibility !== undefined
    return (
      <>
        {!isResponsible ? (
          <Button onClick={() => handleAddResponsible(user)}>{t('course:add')}</Button>
        ) : (
          <AssignedResponsibilityManagement
            handleRemove={() => {
              handleRemoveResponsibility(usersResponsibility)
            }}
            responsibility={usersResponsibility}
          />
        )}
      </>
    )
  }
  const handleRemoveResponsibility = async (responsibility) => {
    const confirmation = window.confirm(t('course:confirmRemoval'))
    if (!confirmation) {
      return
    }
    const result = await apiClient.post(`/courses/${id}/responsibilities/remove`, { username: responsibility.user?.username })
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
            borderRadius: '1.25rem',
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
                <OutlineButtonBlue onClick={() => setActivityPeriodFormOpen(true)}>
                  {t('course:editCourse')} <Edit />
                </OutlineButtonBlue>
              )}
              {!courseEnabled && <Typography style={{ fontStyle: 'italic' }}>{t('course:howToActive')}</Typography>}
            </div>

            <div style={{ ...right, boxSizing: 'border-box' }} />

            {courseEnabled && (
              <Tooltip title={t('copy')} placement="right">
                <Button sx={{ p: 0 }} color="inherit">
                  <Typography style={{ textTransform: 'lowercase', color: 'blue' }} onClick={() => handleCopyLink(studentLink)}>
                    {studentLink}
                  </Typography>
                </Button>
              </Tooltip>
            )}
          </div>

          {userIsAdminOrResponsible && (
            <>
              <OutlineButtonBlue onClick={() => setShowTeachers(!showTeachers)} style={{ marginTop: 10 }}>
                {showTeachers ? t('admin:hideTeachers') : t('admin:showTeachers')}
              </OutlineButtonBlue>
              {showTeachers && (
                <Box>
                  <Button
                    onClick={() => {
                      setAddTeacherViewOpen(true)
                    }}
                    sx={{ borderRadius: '1.25rem' }}
                  >
                    {t('course:add')}
                  </Button>
                  <Stack sx={{ mb: 0, padding: 1, borderColor: 'gray', borderWidth: 1, borderStyle: 'solid', borderRadius: '0.5rem' }}>
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
            width: '90vw',
            height: '90vh',
            background: 'white',
            padding: '2rem',
            overflowY: 'scroll',
          }}
        >
          <ResponsibilityActionUserSearch courseId={id} actionText={t('course:add')} drawActionComponent={drawActionComponent} />
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
          <Tab label={t('course:sourceMaterials')} to={`/courses/${id}/rag`} component={Link} />
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
    return (
      <Stack direction={'row'} sx={{ marginLeft: 'auto', alignItems: 'center', height: '1rem' }}>
        sisu
      </Stack>
    )
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
  const { ragIndices } = useCourseRagIndices(chatInstanceId)

  const { prompts, isLoading: promptsLoading } = usePrompts(courseId)

  const [editorOpen, setEditorOpen] = useState(false)
  const [promptToEdit, setPromptToEdit] = useState<PromptType>()

  return (
    <>
      <OutlineButtonBlack
        data-testid="create-prompt-button"
        onClick={() => {
          setEditorOpen(true)
          setPromptToEdit(undefined)
        }}
      >
        {t('prompt:createNew')}
      </OutlineButtonBlack>
      {promptsLoading ? (
        <Skeleton />
      ) : (
        prompts.map((prompt) => (
          <Prompt
            key={prompt.id}
            prompt={prompt}
            handleEdit={() => {
              setPromptToEdit(prompt)
              setEditorOpen(true)
            }}
          />
        ))
      )}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          {promptToEdit ? t('prompt:editPrompt', { name: promptToEdit.name }) : t('prompt:createNew')}
          <IconButton
            onClick={() => setEditorOpen(false)}
            sx={{ position: 'absolute', top: 10, right: 20, color: 'grey.500', background: '#FFF', opacity: 0.9, zIndex: 1 }}
            data-testid="close-prompt-editor"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <PromptEditor ragIndices={ragIndices} setEditorOpen={setEditorOpen} type="CHAT_INSTANCE" chatInstanceId={chatInstanceId} prompt={promptToEdit} />
        </DialogContent>
      </Dialog>
    </>
  )
}
