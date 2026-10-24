import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

import type { Locales } from '../../../shared/types'
import useCourseParticipants from '../../hooks/useCourseParticipants'
import { useResetChatInstanceUsageMutation, useResetCourseUsageMutation } from '../../hooks/useChatInstanceUsageMutation'
import useResetUsageMutation from '../../hooks/useResetUsageMutation'
import { enqueueSnackbar } from '../common/Snackbar'

const CourseParticipants = () => {
  const { courseId } = useParams()
  const { t, i18n } = useTranslation()
  const language = i18n.language as keyof Locales

  const { data, isLoading, error, refetch } = useCourseParticipants(courseId)

  const resetCourseUsage = useResetChatInstanceUsageMutation()
  const resetUsage = useResetUsageMutation()
  const resetAllCourseUsage = useResetCourseUsageMutation()

  const [confirmOpen, setConfirmOpen] = useState(false)

  const mutationCallbacks = (successMessage: string) => ({
    onSuccess: () => {
      enqueueSnackbar(successMessage, { variant: 'success' })
      refetch()
    },
    onError: (err: Error) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  if (isLoading) return null

  if (error || !data) {
    const notFound = axios.isAxiosError(error) && error.response?.status === 404

    return (
      <Box my={2}>
        <Typography>{notFound ? t('admin:courseNotFound', { courseId }) : t('error:unexpected')}</Typography>
      </Box>
    )
  }

  const { course, participants } = data

  const onResetAll = () => {
    setConfirmOpen(false)
    resetAllCourseUsage.mutate(course.courseId, mutationCallbacks(t('admin:courseUsageResetDone')))
  }

  return (
    <Box my={2}>
      <Typography variant="h4" component="h3">
        {course.name[language] || course.name.en}
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {course.courseId} · {t('admin:usageLimit')}: {course.usageLimit}
      </Typography>

      <Button variant="outlined" color="error" sx={{ mb: 2 }} onClick={() => setConfirmOpen(true)}>
        {t('admin:resetAllCourseUsage')}
      </Button>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('admin:resetAllCourseUsage')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('admin:resetAllCourseUsageConfirm', { count: participants.length })}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t('common:cancel')}</Button>
          <Button color="error" onClick={onResetAll}>
            {t('admin:reset')}
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('admin:participantName')}</TableCell>
              <TableCell>{t('admin:username')}</TableCell>
              <TableCell>{t('admin:studentNumber')}</TableCell>
              <TableCell>{t('admin:role')}</TableCell>
              <TableCell align="right">{t('admin:courseUsage')}</TableCell>
              <TableCell align="right">{t('admin:courseTotalUsage')}</TableCell>
              <TableCell align="right">{t('admin:generalUsage')}</TableCell>
              <TableCell>{t('admin:actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell component="th" scope="row">
                  {participant.lastName} {participant.firstNames}
                </TableCell>
                <TableCell>{participant.username}</TableCell>
                <TableCell>{participant.studentNumber}</TableCell>
                <TableCell>{t(`admin:role_${participant.role}`)}</TableCell>
                <TableCell align="right">
                  {participant.courseUsage}
                  {course.usageLimit > 0 && ` (${Math.round((participant.courseUsage / course.usageLimit) * 100)} %)`}
                </TableCell>
                <TableCell align="right">{participant.courseTotalUsage}</TableCell>
                <TableCell align="right">{participant.usage}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!participant.courseUsageId || participant.courseUsage === 0}
                      onClick={() => resetCourseUsage.mutate(participant.courseUsageId as string, mutationCallbacks(t('admin:courseUsageResetDone')))}
                    >
                      {t('admin:resetCourseUsage')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={participant.usage === 0}
                      onClick={() => resetUsage.mutate(participant.id, mutationCallbacks(t('admin:generalUsageResetDone')))}
                    >
                      {t('admin:resetGeneralUsage')}
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default CourseParticipants
