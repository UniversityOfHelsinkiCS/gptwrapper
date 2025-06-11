import { Alert, Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Course } from '../../../types'
import { formatDate } from '../../Courses/util'

export const CourseInfo = ({ course }: { course: Course }) => {
  const { t, i18n } = useTranslation()
  const { language } = i18n

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {course?.name[language] || 'undefined course'}
        </Typography>
        <Typography variant="body2" ml="1rem" fontStyle="italic">
          {course.courseUnits.map((unit) => unit.code).join(', ')}
        </Typography>
      </Box>
      <Typography m="0.5rem 0 1rem 0">{formatDate(course.activityPeriod)}</Typography>

      {course.saveDiscussions && (
        <Alert severity="warning" style={{ marginTop: 20 }}>
          <Typography variant="h6">{course.notOptoutSaving ? t('course:isSavedNotOptOut') : t('course:isSavedOptOut')}</Typography>
        </Alert>
      )}
    </Box>
  )
}
