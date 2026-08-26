import { useState, useEffect } from 'react'
import { Box, Typography, Divider, Stack, Tooltip, IconButton } from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import DoneIcon from '@mui/icons-material/Done'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format, isValid } from 'date-fns'
import { enqueueSnackbar } from 'notistack'
import { Course } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { GreenButton, RedButton } from '../../ChatV2/general/Buttons'
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

  const handleSubmit = async (tokens?: number, activated?: boolean) => {
    try {
      if (activated === undefined) {
        await mutation.mutateAsync({
          activityPeriod: {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
          },
        })
      } else {
        await mutation.mutateAsync({
          usageLimit: tokens ?? course.usageLimit,
          activated,
        })
      }
      enqueueSnackbar(t('course:courseUpdated'), { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const handleCancel = () => {
    setStartDate(new Date(course.activityPeriod?.startDate || new Date()))
    setEndDate(new Date(course.activityPeriod?.endDate || new Date()))
  }

  const handleActivate = () => window.confirm(t('course:activate')) && handleSubmit(DEFAULT_TOKEN_LIMIT, true)
  const handleDeactivate = () => window.confirm(t('course:deActivate')) && handleSubmit(0, false)

  const courseEnded = Date.parse(course.activityPeriod?.endDate) < Date.now()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
      }}
    >
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t('editActivityPeriod')}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <DatePicker
            label={t('opensAt')}
            value={startDate}
            onChange={(date) => date && isValid(date) && setStartDate(date)}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          <DatePicker
            label={t('closesAt')}
            value={endDate}
            onChange={(date) => date && isValid(date) && setEndDate(date)}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
            <Tooltip arrow placement="top" title={t('common:cancel')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleCancel()}
                  disabled={!hasUnsavedChanges}
                  sx={{ '&.Mui-disabled .MuiSvgIcon-root': { color: 'action.disabled', opacity: 0.55 } }}
                >
                  <CancelIcon fontSize="small" color="primary" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip arrow placement="top" title={t('common:save')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleSubmit()}
                  disabled={!hasUnsavedChanges}
                  sx={{ '&.Mui-disabled .MuiSvgIcon-root': { color: 'action.disabled', opacity: 0.55 } }}
                >
                  <DoneIcon fontSize="small" color="primary" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Stack direction="row" justifyContent="space-between">
        {courseEnded ? (
          <Box />
        ) : course.activated ? (
          <RedButton data-testid="course-deactivate-button" onClick={handleDeactivate}>
            {t('course:deActivate')}
          </RedButton>
        ) : (
          <GreenButton data-testid="course-activate-button" onClick={handleActivate}>
            {t('course:activate')}
          </GreenButton>
        )}
      </Stack>
    </Box>
  )
}
