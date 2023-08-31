import React, { useState } from 'react'
import { Box, Button, Typography, Paper } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enqueueSnackbar } from 'notistack'

import { Course } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'

const EditActivityPeriod = ({ course }: { course: Course }) => {
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
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box display="flex">
      <Paper
        variant="outlined"
        sx={{
          padding: '3% 5%',
          mt: 5,
        }}
      >
        <Typography mb={2} variant="h5">
          {t('editActivityPeriod')}
        </Typography>

        <DatePicker
          label={t('opensAt')}
          sx={{ mr: 2 }}
          value={startDate}
          onChange={(date) => setStartDate(date || new Date())}
        />
        <DatePicker
          label={t('closesAt')}
          value={endDate}
          onChange={(date) => setEndDate(date || new Date())}
        />

        <Box mt={2}>
          <Button onClick={onUpdate} variant="contained">
            {t('save')}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default EditActivityPeriod
