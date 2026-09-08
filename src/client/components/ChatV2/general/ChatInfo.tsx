import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Course } from '../../../types'
import { formatDate } from '../../Courses/util'

export const ChatInfo = ({ course }: { course: Course }) => {
  const { i18n } = useTranslation()
  const { language } = i18n

  return (
    <Box mt={2} mb={4}>
      <Typography variant="body1" fontStyle="italic">
        {course.courseUnits.map((unit) => unit.code).join(', ')}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {course.name[language] || 'undefined course'}
      </Typography>
      <Typography variant="body1">{formatDate(course.activityPeriod)}</Typography>
    </Box>
  )
}
