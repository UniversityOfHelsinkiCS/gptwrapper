import { useState, forwardRef, useRef } from 'react'
import { Box, Typography, TextField, FormControlLabel, Switch, Divider } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enqueueSnackbar } from 'notistack'
import { Course, SetState, User } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { BlueButton, GreenButton, RedButton } from '../../ChatV2/general/Buttons'
import { DEFAULT_TOKEN_LIMIT } from '@config'

const EditCourseForm = forwardRef(({ course, setOpen, user }: { course: Course; setOpen: SetState<boolean>; user: User }, ref) => {
  const { t } = useTranslation()
  const mutation = useEditCourseMutation(course?.courseId as string)

  const { usageLimit: currentUsageLimit } = course

  const currentDate = new Date().toISOString()
  const { startDate: defaultStart, endDate: defaultEnd } = course?.activityPeriod || { startDate: currentDate, endDate: currentDate }

  const [startDate, setStartDate] = useState(new Date(defaultStart))
  const [endDate, setEndDate] = useState(new Date(defaultEnd))
  const [usageLimit, setUsageLimit] = useState(currentUsageLimit)
  const usageRef = useRef(null)

  const [saveDiscussions, setSaveDiscussions] = useState(course.saveDiscussions)
  const [notOptoutSaving, setNotOptoutSaving] = useState(course.notOptoutSaving)

  /*
   ugly but works since if the functions
   setUsageLimit(10000)
   onUpdate()
   are called then the onUpdate does not always see the new usage limit
  */
  const openCourse = async () => {
    console.log(usageLimit)
    const activityPeriod = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    }

    enqueueSnackbar(t('course:courseUpdated'), { variant: 'success' })
    try {
      const limit = DEFAULT_TOKEN_LIMIT
      setUsageLimit(limit)
      const response = mutation.mutate({
        activityPeriod,
        usageLimit: limit,
        saveDiscussions,
        notOptoutSaving,
      })
      console.log(response)
      setOpen(false)
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const onUpdate = async () => {
    console.log(usageLimit)
    const activityPeriod = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    }

    enqueueSnackbar(t('course:courseUpdated'), { variant: 'success' })
    try {
      const response = mutation.mutate({
        activityPeriod,
        usageLimit,
        saveDiscussions,
        notOptoutSaving,
      })
      console.log(response)
      setOpen(false)
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box ref={ref} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {
    course.usageLimit <= 0 ?
  <GreenButton
    onClick={openCourse}
  >
    {t('course:activate')}
  </GreenButton>
:
<>
</>
  }
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ml: 2 }}>
        <Typography variant="h5">
          {t('editActivityPeriod')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
          <DatePicker label={t('opensAt')} sx={{ width: '40%' }} value={startDate} onChange={(date) => setStartDate(date || new Date())} />
          <DatePicker label={t('closesAt')} sx={{ width: '40%' }} value={endDate} onChange={(date) => setEndDate(date || new Date())} />
        </Box>
      </Box>
      <Divider />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '40%', ml: 2 }}>
        <Typography variant="h5">
          {t('admin:usageLimit')}
        </Typography>
        <Typography>{t('admin:usageLimitInfo')}</Typography>
        <TextField ref={usageRef} value={usageLimit} type="number" onChange={(e) => setUsageLimit(Number(e.target.value))} />
      </Box>
      {
        user.isAdmin && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ml: 2 }}>
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
          </>
        )
      }
      <Box sx={{ display: 'flex', justifyContent: 'right', mr: 2 }}>
        <BlueButton onClick={onUpdate} variant="contained">
          {t('save')}
        </BlueButton>
      </Box>
    </Box>
  )
})

export default EditCourseForm
