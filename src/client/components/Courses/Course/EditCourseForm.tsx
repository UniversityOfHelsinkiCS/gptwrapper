import { useState, forwardRef } from 'react'
import { Box, Button, Typography, Paper, Select, MenuItem, TextField, FormControlLabel, Switch } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enqueueSnackbar } from 'notistack'

import { Course, SetState, User } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { ValidModelName, validModels } from '../../../../config'

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
    <Box ref={ref} display="flex" tabIndex={-1}>
      <Paper variant="outlined" sx={{ margin: 'auto', padding: 5, mt: '20vh' }}>
        <Box>
          <Typography mb={2} variant="h5">
            {t('editActivityPeriod')}
          </Typography>

          <DatePicker label={t('opensAt')} sx={{ m: 1, width: '90%' }} value={startDate} onChange={(date) => setStartDate(date || new Date())} />
          <DatePicker label={t('closesAt')} sx={{ m: 1, width: '90%' }} value={endDate} onChange={(date) => setEndDate(date || new Date())} />
        </Box>

        <Box my={3} display="flex" justifyContent="space-between" flexDirection="row">
          <Typography mb={1} variant="h5">
            {t('admin:usageLimit')}
          </Typography>
          <Typography mb={1}>{t('admin:usageLimitInfo')}</Typography>
          <TextField sx={{ m: 1, width: '300px' }} value={usageLimit} type="number" onChange={(e) => setUsageLimit(Number(e.target.value))} />
        </Box>

        {user.isAdmin && (
          <Box m={1}>
            <Typography mb={1} variant="h5">
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
        )}

        <Box m={1} style={{ marginBottom: 10 }}>
          <Button onClick={onUpdate} variant="contained">
            {t('save')}
          </Button>
          <Button sx={{ px: 2, py: 1 }} onClick={() => setOpen(false)}>
            {t('common:cancel')}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
})

export default EditCourseForm
