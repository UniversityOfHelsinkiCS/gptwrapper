import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Course } from '../../../types'
import { formatDate } from '../../Courses/util'

export const ChatInfo = ({ course }: { course: Course }) => {
  const { t, i18n } = useTranslation()
  const { language } = i18n

  return (
    <Box mb={5}>
      <Typography variant="body2" fontStyle="italic">
        {course.courseUnits.map((unit) => unit.code).join(', ')}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
        {course?.name[language] || 'undefined course'}
      </Typography>

      <Typography variant="body2">{formatDate(course.activityPeriod)}</Typography>
    </Box>
  )
}
