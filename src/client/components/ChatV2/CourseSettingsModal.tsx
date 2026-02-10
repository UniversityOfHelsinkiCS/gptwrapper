import { ContentCopy } from '@mui/icons-material'
import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import { PUBLIC_URL } from '../../../config'
import { useCourseUsage } from '../../hooks/useChatInstanceUsage'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { ChatInstanceUsage, Responsibility, User } from '../../types'
import apiClient from '../../util/apiClient'
import { ResponsibilityActionUserSearch } from '../Admin/UserSearch'
import { OutlineButtonBlack, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import CourseEmbedding from '../Courses/Course/CourseEmbedding'
import Discussion from '../Courses/Course/Discussions'
import EditCourseForm from '../Courses/Course/EditCourseForm'
import Stats from '../Courses/Course/Stats'
import { ApiErrorView } from '../common/ApiErrorView'
import { RouterTabs } from '../common/RouterTabs'
import Rag from '../Rag/Rag'
import { filterUsages } from './util'

export const CourseSettingsModal = () => {
  const { courseId } = useParams() as { courseId: string }
  const [addTeacherViewOpen, setAddTeacherViewOpen] = useState(false)
  const [_activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)
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
        <Tab label={t('common:settings')} to={`/${courseId}/course`} component={Link} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />
        <Tab label={t('course:teachers')} to={`/${courseId}/course/teachers`} component={Link} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />
        <Tab
          label={
            <Badge badgeContent={filteredUsages.length} color="secondary">
              {t('course:students')}
            </Badge>
          }
          to={`/${courseId}/course/students`}
          component={Link}
          sx={{ '&.Mui-selected': { fontWeight: 'bold' } }}
        />
        {chatInstance.saveDiscussions && (
          <Tab label={t('course:discussions')} to={`/${courseId}/course/discussions`} component={Link} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />
        )}
        <Tab
          label={t('course:sourceMaterials')}
          to={`/${courseId}/course/rag`}
          component={Link}
          sx={{ '&.Mui-selected': { fontWeight: 'bold' } }}
          data-testid="sourceMaterialsTab"
        />
        <Tab label={t('course:moodleEmbedding')} to={`/${courseId}/course/moodle`} component={Link} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />
      </RouterTabs>
      <Routes>
        <Route
          index
          path="/"
          element={
            <Box py={3} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {chatInstance.name[language]}
                </Typography>
              </Box>

              {courseEnabled && (
                <>
                  <Divider />
                  <Box>
                    <Typography fontWeight="bold" mb={1}>
                      {t('course:studentLink')}
                    </Typography>
                    <Tooltip title={t('copy')} placement="right">
                      <Button
                        onClick={() => handleCopyLink(studentLink)}
                        color="inherit"
                        sx={{
                          gap: 1,
                          borderRadius: '1.25rem',
                          p: 1,
                          textTransform: 'none',
                        }}
                        endIcon={<ContentCopy />}
                      >
                        <Typography variant="body2" color="primary">
                          {studentLink}
                        </Typography>
                      </Button>
                    </Tooltip>
                  </Box>
                </>
              )}

              <Divider />
              <EditCourseForm course={chatInstance} setOpen={setActivityPeriodFormOpen} user={user} />
            </Box>
          }
        />

        <Route
          path={`/teachers`}
          element={
            <>
              {userIsAdminOrResponsible && (
                <>
                  <Box py={3}>
                    <OutlineButtonBlack
                      onClick={() => {
                        setAddTeacherViewOpen((prev) => !prev)
                      }}
                      sx={{ mb: 2 }}
                    >
                      {addTeacherViewOpen ? t('common:cancel') : t('course:addNew')}
                    </OutlineButtonBlack>
                    {!addTeacherViewOpen ? (
                      <TableContainer sx={{ borderRadius: 1, minWidth: 800 }}>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ backgroundColor: 'grey.100' }}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{t('rag:name')}</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>{t('course:addedFrom')}</TableCell>
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
                        </Table>
                      </TableContainer>
                    ) : (
                      <ResponsibilityActionUserSearch courseId={courseId} actionText={t('course:add')} drawActionComponent={drawActionComponent} />
                    )}
                  </Box>
                </>
              )}
            </>
          }
        />

        <Route path="/students" element={<Stats />} />
        <Route path="/discussions/*" element={<Discussion />} />
        <Route path="/rag/*" element={<Rag />} />
        <Route path="/moodle/*" element={<CourseEmbedding />} />
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
    <Stack direction={'row'} sx={{ marginLeft: 'auto', alignItems: 'center', height: '1rem', gap: 1 }}>
      <Typography>{t('course:customResponsibility')}</Typography>
      <OutlineButtonBlue onClick={handleRemove}>{t('course:remove')}</OutlineButtonBlue>
    </Stack>
  )
}
