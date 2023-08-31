import React, { useState } from 'react'
import { Box, Button, Typography, Paper } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'

import { Course } from '../../../types'

const EditActivityPeriod = ({ course }: { course: Course }) => {
  const { t } = useTranslation()

  const currentDate = new Date().toISOString()
  const { startDate: defaultStart, endDate: defaultEnd } =
    course?.activityPeriod || { startDate: currentDate, endDate: currentDate }

  const [startDate, setStartDate] = useState(new Date(defaultStart))
  const [endDate, setEndDate] = useState(new Date(defaultEnd))

  return (
    <Box display="flex">
      <Paper
        variant="outlined"
        sx={{
          padding: '5% 5%',
          mt: 5,
        }}
      >
        <Typography mb={2} variant="h5">
          Muokkaa käynnissäoloaikaa
        </Typography>

        <DatePicker
          label="Avautuu"
          sx={{ mr: 2 }}
          value={startDate}
          onChange={(date) => setStartDate(date || new Date())}
        />
        <DatePicker
          label="Sulkeutuu"
          value={endDate}
          onChange={(date) => setEndDate(date || new Date())}
        />

        <Box mt={2}>
          <Button variant="contained">{t('save')}</Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default EditActivityPeriod
