import React, { useState, forwardRef } from 'react'
import { Box, Button, Typography, Paper } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enqueueSnackbar } from 'notistack'

import { Course, SetState } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'

const EditActivityPeriod = forwardRef(
  (
    { course, setOpen }: { course: Course; setOpen: SetState<boolean> },
    ref
  ) => {
    const { t } = useTranslation()
    const mutation = useEditCourseMutation(course?.courseId as string)

    const currentDate = new Date().toISOString()
    const { startDate: defaultStart, endDate: defaultEnd } =
      course?.activityPeriod || { startDate: currentDate, endDate: currentDate }

    const [startDate, setStartDate] = useState(new Date(defaultStart))
    const [endDate, setEndDate] = useState(new Date(defaultEnd))

    const onUpdate = () => {
      const activityPeriod = {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }

      enqueueSnackbar('Activity period updated', { variant: 'success' })
      try {
        mutation.mutate({ activityPeriod })
        setOpen(false)
      } catch (error: any) {
        enqueueSnackbar(error.message, { variant: 'error' })
      }
    }

    return (
      <Box ref={ref} display="flex" tabIndex={-1}>
        <Paper
          variant="outlined"
          sx={{ margin: 'auto', padding: 5, width: '600px', mt: '20vh' }}
        >
          <Typography mb={2} variant="h5">
            {t('editActivityPeriod')}
          </Typography>

          <DatePicker
            label={t('opensAt')}
            sx={{ m: 1, width: '90%' }}
            value={startDate}
            onChange={(date) => setStartDate(date || new Date())}
          />
          <DatePicker
            label={t('closesAt')}
            sx={{ m: 1, width: '90%' }}
            value={endDate}
            onChange={(date) => setEndDate(date || new Date())}
          />

          <Box m={1}>
            <Button onClick={onUpdate} variant="contained">
              {t('save')}
            </Button>
          </Box>
        </Paper>
      </Box>
    )
  }
)

export default EditActivityPeriod
