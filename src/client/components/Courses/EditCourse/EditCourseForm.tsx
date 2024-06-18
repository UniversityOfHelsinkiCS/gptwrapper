import React, { useState, forwardRef } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Select,
  MenuItem,
  TextField,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enqueueSnackbar } from 'notistack'

import { Course, SetState } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { validModels } from '../../../../config'

const EditCourseForm = forwardRef(
  (
    { course, setOpen }: { course: Course; setOpen: SetState<boolean> },
    ref
  ) => {
    const { t } = useTranslation()
    const mutation = useEditCourseMutation(course?.courseId as string)

    const { model: currentModel, usageLimit: currentUsageLimit } = course

    const currentDate = new Date().toISOString()
    const { startDate: defaultStart, endDate: defaultEnd } =
      course?.activityPeriod || { startDate: currentDate, endDate: currentDate }

    const [startDate, setStartDate] = useState(new Date(defaultStart))
    const [endDate, setEndDate] = useState(new Date(defaultEnd))
    const [model, setModel] = useState(currentModel)
    const [usageLimit, setUsageLimit] = useState(currentUsageLimit)

    const onUpdate = () => {
      const activityPeriod = {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }

      enqueueSnackbar('Activity period updated', { variant: 'success' })
      try {
        mutation.mutate({ activityPeriod, model, usageLimit })
        setOpen(false)
      } catch (error: any) {
        enqueueSnackbar(error.message, { variant: 'error' })
      }
    }

    return (
      <Box ref={ref} display="flex" tabIndex={-1}>
        <Paper
          variant="outlined"
          sx={{ margin: 'auto', padding: 5, mt: '20vh' }}
        >
          <Box>
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
          </Box>

          <Box
            my={3}
            display="flex"
            justifyContent="space-between"
            flexDirection="row"
          >
            <Box>
              <Typography mb={1} variant="h5">
                {t('admin:model')}
              </Typography>
              <Typography mb={1}>{t('admin:modelInfo')}</Typography>
              <Select
                sx={{ m: 1, width: '300px' }}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {validModels.map(({ name: modelName }) => (
                  <MenuItem key={modelName} value={modelName}>
                    {modelName}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography mb={1} variant="h5">
                {t('admin:usageLimit')}
              </Typography>
              <Typography mb={1}>{t('admin:usageLimitInfo')}</Typography>
              <TextField
                sx={{ m: 1, width: '300px' }}
                value={usageLimit}
                type="number"
                onChange={(e) => setUsageLimit(Number(e.target.value))}
              />
            </Box>
          </Box>

          <Box m={1}>
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
  }
)

export default EditCourseForm
