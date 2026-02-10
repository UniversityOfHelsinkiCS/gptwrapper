import { useState, forwardRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Stack,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enqueueSnackbar } from 'notistack'
import { Course, SetState, User } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { BlueButton, GreenButton, RedButton } from '../../ChatV2/general/Buttons'
import { DEFAULT_TOKEN_LIMIT } from '@config'
import useCourse from '../../../hooks/useCourse'

interface EditCourseFormProps {
  course: Course
  setOpen: SetState<boolean>
  user: User
}

const EditCourseForm = forwardRef<HTMLElement, EditCourseFormProps>(
  ({ course, setOpen, user }, ref) => {
    const { t } = useTranslation()
    /*
    edit course form sometimes renders just before the new version of a mutated course comes back, this useCourse hook helps to make sure that the newest version of the course is rendered
    */
  const { data: chatInstance } = useCourse(course.courseId)
    const mutation = useEditCourseMutation(course.courseId as string)

    const [startDate, setStartDate] = useState(new Date(course.activityPeriod?.startDate || new Date()))
    const [endDate, setEndDate] = useState(new Date(course.activityPeriod?.endDate || new Date()))
    const [saveDiscussions, setSaveDiscussions] = useState(course.saveDiscussions)
    const [notOptoutSaving, setNotOptoutSaving] = useState(course.notOptoutSaving)

    const hasUnsavedChanges = 
      format(startDate, 'yyyy-MM-dd') !== format(new Date(course.activityPeriod?.startDate || new Date()), 'yyyy-MM-dd') ||
      format(endDate, 'yyyy-MM-dd') !== format(new Date(course.activityPeriod?.endDate || new Date()), 'yyyy-MM-dd') ||
      saveDiscussions !== course.saveDiscussions ||
      notOptoutSaving !== course.notOptoutSaving

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
          saveDiscussions,
          notOptoutSaving,
        })
        enqueueSnackbar(t('course:courseUpdated'), { variant: 'success' })
        setOpen(false)
      } catch (error: any) {
        enqueueSnackbar(error.message, { variant: 'error' })
      }
    }

    const handleActivate = () => window.confirm(t('course:activate')) && handleSubmit(DEFAULT_TOKEN_LIMIT)
    const handleDeactivate = () => window.confirm(t('course:deActivate')) && handleSubmit(0)
    if(!chatInstance){
      return <></>
    }
    return (
      <Box
        ref={ref}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          p: 2,
        }}
      >
        {chatInstance?.usageLimit <= 0 && (
          <Stack direction="row" justifyContent="flex-end">
            <GreenButton onClick={handleActivate}>
              {t('course:activate')}
            </GreenButton>
          </Stack>
        )}

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

        {course.usageLimit > 0 && (
          <>
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('admin:usageLimit')}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {DEFAULT_TOKEN_LIMIT.toLocaleString()}
              </Typography>
            </Box>

            <Divider />
          </>
        )}

        {user.isAdmin && (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('course:reseachCourse')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={saveDiscussions}
                  onChange={() => setSaveDiscussions(!saveDiscussions)}
                />
              }
              label={t('course:isReseachCourse')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notOptoutSaving}
                  onChange={() => setNotOptoutSaving(!notOptoutSaving)}
                  disabled={!saveDiscussions}
                />
              }
              label={t('course:canOptOut')}
            />
          </Box>
        )}

        <Divider />

        <Stack direction="row" justifyContent="space-between">
          {course.usageLimit > 0 && (
            <RedButton onClick={handleDeactivate}>
              {t('course:deActivate')}
            </RedButton>
          )}
          <BlueButton 
            onClick={() => handleSubmit()} 
            variant="contained"
            disabled={!hasUnsavedChanges}
          >
            {t('save')}
          </BlueButton>
        </Stack>
      </Box>
    )
  }
)

export default EditCourseForm
