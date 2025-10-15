import { Box, Typography, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Course } from '../../../types'
import { formatDate } from '../../Courses/util'
import Settings from '@mui/icons-material/Settings'
import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse from '../../../hooks/useCourse'
import { PUBLIC_URL } from '../../../../config'

export const ChatInfo = ({ course }: { course: Course }) => {

  const { user } = useCurrentUser()
  const { data: chatInstance } = useCourse(course.courseId)
  const { t, i18n } = useTranslation()
  const { language } = i18n

  if (!chatInstance || !user) return null

  const amongResponsibles = chatInstance.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user.id) : false

  return (
    <Box mt={2} mb={4}>
      <Typography variant="body1" fontStyle="italic">
        {course.courseUnits.map((unit) => unit.code).join(', ')}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {course?.name[language] || 'undefined course'}
      </Typography>
      <Typography variant="body1">{formatDate(course.activityPeriod)}</Typography>
      {(user.isAdmin && amongResponsibles) &&
        (<Link href={`${PUBLIC_URL}/courses/${course.courseId}`}>
          <Typography >{t('course:settings')}</Typography>
        </Link>)
      }
    </Box >
  )
}

export const ChatInfo2 = ({ course }: { course: Course }) => {
  const { i18n } = useTranslation()
  const { language } = i18n

  return (
    <Box mb={3}>
      <Typography variant="h5" my={0.5} fontWeight="bold">
        {course?.name[language] || 'undefined course'}
      </Typography>
      <Typography variant="body2" color='textSecondary'>
        {`${course.id} | ${formatDate(course.activityPeriod)}`}
      </Typography>
    </Box >
  )
}