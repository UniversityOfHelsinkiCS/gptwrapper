import { Component } from "../Courses/Course"
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
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Route, Routes, useParams } from 'react-router-dom'

import { PUBLIC_URL } from '../../../config'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Responsebility, User } from '../../types'
import Rag from '../Rag/Rag'
import { formatDate, getCurTypeLabel } from './util'
import EditCourseForm from '../Courses/Course/EditCourseForm'
import Stats from '../Courses/Course/Stats'
import Discussion from '../Courses/Course/Discussions'
import { ApiErrorView } from '../common/ApiErrorView'
import apiClient from '../../util/apiClient'
import { ResponsibilityActionUserSearch } from '../Admin/UserSearch'
import { OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { RouterTabs } from "../common/RouterTabs"

export const CourseSettingsModal = () => {
  const { courseId } = useParams() as { courseId: string }
  const [showTeachers, setShowTeachers] = useState(false)
  const [addTeacherViewOpen, setAddTeacherViewOpen] = useState(false)
  const [activityPeriodFormOpen, setActivityPeriodFormOpen] = useState(false)
  const [responsibilities, setResponsibilities] = useState<Responsebility[]>([])
  const { t, i18n } = useTranslation()

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

  if (userLoading || !user || !isCourseSuccess) return null

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
    const result = await apiClient.post(`/courses/${courseId}/responsibilities/assign`, { username: username })
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
    const result = await apiClient.post(`/courses/${courseId}/responsibilities/remove`, { username: responsibility.user?.username })
    if (result.status === 200) {
      const filteredResponsibilities = responsibilities.filter((r) => r.id !== responsibility.id)
      setResponsibilities(filteredResponsibilities)
    }
  }
  return (
    <Container maxWidth="xl">
      <Modal open={activityPeriodFormOpen} onClose={() => setActivityPeriodFormOpen(false)}>
        <EditCourseForm course={chatInstance} setOpen={setActivityPeriodFormOpen} user={user} />
      </Modal>
      <RouterTabs>
        <Tab label={t('common:settings')} to={`/courses/${courseId}`} component={Link} />
        <Tab label={t('course:teachers')} to={`/courses/${courseId}`} component={Link} />
        <Tab label={t('course:students')} to={`/courses/${courseId}`} component={Link} />
        <Tab label={t('course:discussions')} to={`/courses/${courseId}/discussions`} component={Link} />
        <Tab label={t('course:sourceMaterials')} to={`/courses/${courseId}/rag`} component={Link} />
      </RouterTabs>
    </Container>
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
