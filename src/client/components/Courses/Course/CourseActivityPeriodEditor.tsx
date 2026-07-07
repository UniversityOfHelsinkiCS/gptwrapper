import { useState, useEffect } from 'react'
import { Box, Typography, Divider, Stack } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enqueueSnackbar } from 'notistack'
import { Course } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { BlueButton, GreenButton, RedButton } from '../../ChatV2/general/Buttons'
import { DEFAULT_TOKEN_LIMIT } from '@config'

export const CourseActivityPeriodEditor = ({ course }: { course: Course }) => {
  const { t } = useTranslation()
  const mutation = useEditCourseMutation(course.courseId as string)

  const [startDate, setStartDate] = useState(new Date(course.activityPeriod?.startDate || new Date()))
  const [endDate, setEndDate] = useState(new Date(course.activityPeriod?.endDate || new Date()))

  const hasUnsavedChanges =
    format(startDate, 'yyyy-MM-dd') !== format(new Date(course.activityPeriod?.startDate || new Date()), 'yyyy-MM-dd') ||
    format(endDate, 'yyyy-MM-dd') !== format(new Date(course.activityPeriod?.endDate || new Date()), 'yyyy-MM-dd')

  useEffect(() => {
    setStartDate(new Date(course.activityPeriod?.startDate || new Date()))
    setEndDate(new Date(course.activityPeriod?.endDate || new Date()))
  }, [course.courseId])

  const handleSubmit = async (tokens?: number) => {
    const activityPeriod = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    }

    const newLimit = tokens ?? course.usageLimit
    try {
      await mutation.mutateAsync({
        activityPeriod,
        usageLimit: newLimit,
        saveDiscussions: false,
      })
      enqueueSnackbar(t('course:courseUpdated'), { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const handleActivate = () => window.confirm(t('course:activate')) && handleSubmit(DEFAULT_TOKEN_LIMIT)
  const handleDeactivate = () => window.confirm(t('course:deActivate')) && handleSubmit(0)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        p: 2,
      }}
    >
      <Box>
        <Typography variant="h6" gutterBottom>
          {t('editActivityPeriod')}
        </Typography>
        <Stack direction="row" spacing={2}>
          <DatePicker
            label={t('opensAt')}
            value={startDate}
            onChange={(date) => setStartDate(date || new Date())}
            slotProps={{ textField: { fullWidth: true } }}
          />
          <DatePicker
            label={t('closesAt')}
            value={endDate}
            onChange={(date) => setEndDate(date || new Date())}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Stack>
      </Box>

      <Divider />

      <Stack direction="row" justifyContent="space-between">
        {course.activated ? (
          <RedButton onClick={handleDeactivate}>{t('course:deActivate')}</RedButton>
        ) : (
          <GreenButton onClick={handleActivate}>{t('course:activate')}</GreenButton>
        )}
        <BlueButton onClick={() => handleSubmit()} variant="contained" disabled={!hasUnsavedChanges}>
          {t('save')}
        </BlueButton>
      </Stack>
    </Box>
  )
}
