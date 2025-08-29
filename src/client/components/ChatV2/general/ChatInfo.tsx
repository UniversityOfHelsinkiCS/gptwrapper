import { Box, Typography, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Course } from '../../../types'
import { formatDate } from '../../Courses/util'
import { Settings } from '@mui/icons-material'
import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse from '../../../hooks/useCourse'

export const ChatInfo = ({ course }: { course: Course }) => {
  const { user } = useCurrentUser()
  const { data: chatInstance } = useCourse(course.courseId)
  const { t, i18n } = useTranslation()
  const { language } = i18n

  if (!chatInstance || !user) return null

  const amongResponsibles = chatInstance.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user.id) : false
  return (
    <Box mb={3}>
      <Typography variant="body2" fontStyle="italic">
        {course.courseUnits.map((unit) => unit.code).join(', ')}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {course?.name[language] || 'undefined course'}
        {(user.isAdmin && amongResponsibles) && (<Link href={`/courses/${course.courseId}`}>
          <Settings />
        </Link>)
        }
      </Typography>
      <Typography variant="body2">{formatDate(course.activityPeriod)}</Typography>
    </Box >
  )
}
