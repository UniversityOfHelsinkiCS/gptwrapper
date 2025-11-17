import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Tooltip,
  Typography,
  TableBody,
  Badge,
} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Route, Routes, useParams } from 'react-router-dom'

import { PUBLIC_URL } from '../../../config'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { ChatInstanceUsage, Responsibility, User } from '../../types'
import Rag from '../Rag/Rag'
import EditCourseForm from '../Courses/Course/EditCourseForm'
import Stats from '../Courses/Course/Stats'
import Discussion from '../Courses/Course/Discussions'
import { ApiErrorView } from '../common/ApiErrorView'
import apiClient from '../../util/apiClient'
import { ResponsibilityActionUserSearch } from '../Admin/UserSearch'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'
import { RouterTabs } from "../common/RouterTabs"
import { RagIndex } from '../Rag/RagIndex'
import { RagFile } from '../Rag/RagFile'
import { useCourseUsage } from '../../hooks/useChatInstanceUsage'
import { filterUsages } from './util'

export const CourseSettingsModal = () => {
  const { courseId } = useParams() as { courseId: string }
  const [addTeacherViewOpen, setAddTeacherViewOpen] = useState(false)
  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([])
  const { t, i18n } = useTranslation()
  const { language } = i18n

  const { user, isLoading: userLoading } = useCurrentUser()
  const { data: chatInstance, isSuccess: isCourseSuccess, error, refetch: refetchCourse } = useCourse(courseId)

  useEffect(() => {
    if (isCourseSuccess) {
      setResponsibilities(chatInstance?.responsibilities)
    }
  }, [isCourseSuccess])

  if (error) {
    console.log(error, courseId)
    return <ApiErrorView error={error} />
  }




  const { chatInstanceUsages, isSuccess: isUsageSuccess } = useCourseUsage(chatInstance?.id)

  if (userLoading || !user || !isCourseSuccess || !isUsageSuccess) return null

  const filteredUsages = filterUsages(chatInstance.usageLimit, chatInstanceUsages as ChatInstanceUsage[])

  const studentLink = `${window.location.origin}${PUBLIC_URL}/${chatInstance.courseId}`

  const amongResponsibles = chatInstance.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user.id) : false

  if (!user.isAdmin && !amongResponsibles) {
    console.log("not admin")
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

  const isAdminOrResponsible = () => {
    return user.isAdmin || chatInstance.responsibilities.find((r) => r.user.username === user.username)
  }
  const userIsAdminOrResponsible = isAdminOrResponsible()

  const handleAddResponsible = async (user: User) => {

    const username = user.username
    const result = await apiClient.post(`/courses/${courseId}/responsibilities/assign`, { username: username })
    if (result.status === 200) {
      const responsibility = result.data
      setResponsibilities([...responsibilities, responsibility])
      refetchCourse()
    }
  }
  const handleRemoveResponsibility = async (responsibility) => {
    const confirmation = window.confirm(t('course:confirmRemoval'))
    if (!confirmation) {
      return
    }
    const result = await apiClient.post(`/courses/${courseId}/responsibilities/remove`, { username: responsibility.user?.username })
    if (result.status === 200) {
      const filteredResponsibilities = responsibilities.filter((r) => r.id !== responsibility.id)
      setResponsibilities(filteredResponsibilities)
    }
  }

  const drawActionComponent = (user: User) => {
    const usersResponsibility: Responsibility | undefined = responsibilities.find((r: Responsibility) => {
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

  return (
    <Container maxWidth="xl">
      <RouterTabs>
        <Tab label={t('common:settings')} to={`/${courseId}/course`} component={Link} />
        <Tab label={t('course:teachers')} to={`/${courseId}/course/teachers`} component={Link} />
        <Tab label={<Badge badgeContent={filteredUsages.length} color='secondary' >{t('course:students')}</Badge>} to={`/${courseId}/course/students`} component={Link} />
        {chatInstance.saveDiscussions && <Tab label={t('course:discussions')} to={`/${courseId}/course/discussions`} component={Link} />}
        <Tab label={t('course:sourceMaterials')} to={`/${courseId}/course/rag`} component={Link} />
      </RouterTabs>
      <Routes>
        <Route index path='/' element={
          <>
            <Alert severity={getInfoSeverity()} sx={{ mt: 1, borderRadius: '1.25', display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{getInfoMessage()}</Typography>
            </Alert>

            <Box>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Typography variant="h4">{chatInstance.name[language]}</Typography>
                {courseEnabled && (
                  <Tooltip title={t('copy')} placement="right">
                    <Button color="inherit">
                      <Typography style={{ textTransform: 'lowercase', color: 'blue' }} onClick={() => handleCopyLink(studentLink)}>
                        {studentLink}
                      </Typography>
                    </Button>
                  </Tooltip>
                )}
              </div>
              <EditCourseForm course={chatInstance} setOpen={setActivityPeriodFormOpen} user={user} />
            </Box>
          </>} />

        <Route path={`/teachers`} element={
          <>
            {userIsAdminOrResponsible && (
              <>
                <Box >
                  <OutlineButtonBlack
                    onClick={() => {
                      setAddTeacherViewOpen((prev) => !prev)
                    }}
                    sx={{ mb: 1, mt: 1 }}
                  >
                    {addTeacherViewOpen ? t('common:cancel') : t('course:addNew')}
                  </OutlineButtonBlack>
                  {!addTeacherViewOpen ? (<Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>{t('rag:name')}</strong></TableCell>
                        <TableCell><strong>{t('course:addedFrom')}</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {responsibilities.map((responsibility) => (
                        <TableRow>
                          <TableCell key={responsibility.id}>
                            <Typography>
                              {responsibility.user.last_name} {responsibility.user.first_names}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <AssignedResponsibilityManagement
                              handleRemove={() => {
                                handleRemoveResponsibility(responsibility)
                              }}
                              responsibility={responsibility}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>)
                    : <ResponsibilityActionUserSearch courseId={courseId} actionText={t('course:add')} drawActionComponent={drawActionComponent} />}
                </Box>
              </>
            )}
          </>} />

        <Route path="/students" element={<Stats />} />
        <Route path="/discussions/*" element={<Discussion />} />
        <Route path="/rag/*" element={<Rag />} />
        <Route path="/rag/:id" element={<RagIndex />} />
        <Route path="/rag/:id/files/:fileId" element={<RagFile />} />
      </Routes>
    </Container >
  )
}

const AssignedResponsibilityManagement = ({ responsibility, handleRemove }) => {
  const { t } = useTranslation()
  if (!responsibility.createdByUsercourseId) {
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
