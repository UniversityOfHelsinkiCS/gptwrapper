import { useState, forwardRef } from 'react'
import { Box, Typography, TextField, FormControlLabel, Switch } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enqueueSnackbar } from 'notistack'
import { Course, SetState, User } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { BlueButton, OutlineButtonBlue } from '../../ChatV2/general/Buttons'

const EditCourseForm = forwardRef(({ course, setOpen, user }: { course: Course; setOpen: SetState<boolean>; user: User }, ref) => {
  const { t } = useTranslation()
  const mutation = useEditCourseMutation(course?.courseId as string)

  const { usageLimit: currentUsageLimit } = course

  const currentDate = new Date().toISOString()
  const { startDate: defaultStart, endDate: defaultEnd } = course?.activityPeriod || { startDate: currentDate, endDate: currentDate }

  const [startDate, setStartDate] = useState(new Date(defaultStart))
  const [endDate, setEndDate] = useState(new Date(defaultEnd))
  const [usageLimit, setUsageLimit] = useState(currentUsageLimit)
  const [saveDiscussions, setSaveDiscussions] = useState(course.saveDiscussions)
  const [notOptoutSaving, setNotOptoutSaving] = useState(course.notOptoutSaving)

  const onUpdate = () => {
    const activityPeriod = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    }

    enqueueSnackbar(t('course:courseUpdated'), { variant: 'success' })
    try {
      mutation.mutate({
        activityPeriod,
        usageLimit,
        saveDiscussions,
        notOptoutSaving,
      })
      setOpen(false)
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box ref={ref} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5">
          {t('editActivityPeriod')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
          <DatePicker label={t('opensAt')} sx={{ width: '40%' }} value={startDate} onChange={(date) => setStartDate(date || new Date())} />
          <DatePicker label={t('closesAt')} sx={{ width: '40%' }} value={endDate} onChange={(date) => setEndDate(date || new Date())} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '40%' }}>
        <Typography variant="h5">
          {t('admin:usageLimit')}
        </Typography>
        <Typography>{t('admin:usageLimitInfo')}</Typography>
        <TextField value={usageLimit} type="number" onChange={(e) => setUsageLimit(Number(e.target.value))} />
      </Box>
      {
        user.isAdmin && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h5">
              {t('course:reseachCourse')}
            </Typography>
            <FormControlLabel
              control={<Switch onChange={() => setSaveDiscussions(!saveDiscussions)} checked={saveDiscussions} />}
              label={t('course:isReseachCourse')}
            />

            <FormControlLabel
              control={<Switch onChange={() => setNotOptoutSaving(!notOptoutSaving)} checked={notOptoutSaving} disabled={!saveDiscussions} />}
              label={t('course:canOptOut')}
            />
          </Box>
        )
      }
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BlueButton onClick={onUpdate} variant="contained">
          {t('save')}
        </BlueButton>
        <OutlineButtonBlue onClick={() => setOpen(false)}>
          {t('common:cancel')}
        </OutlineButtonBlue>
      </Box>
    </Box >
  )
})

export default EditCourseForm
