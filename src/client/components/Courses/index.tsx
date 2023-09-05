import React from 'react'
import { Link } from 'react-router-dom'
import { Box, Paper, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'

import { ActivityPeriod, Course as CourseType } from '../../types'
import useUserCourses from '../../hooks/useUserCourses'

const fomatDate = ({ startDate, endDate }: ActivityPeriod) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return `${format(start, 'dd.MM.')}–${format(end, 'dd.MM.yyyy')}`
}

const Course = ({ course }: { course: CourseType }) => {
  const { name, description, courseId, activityPeriod } = course

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          padding: '2% 4%',
          mt: 3,
        }}
      >
        <Box mb={1} display="flex" justifyContent="space-between">
          <Box>
            <Link to={`/courses/${courseId}`}>
              <Typography variant="h6">{name}</Typography>
            </Link>

            <Typography variant="body2">
              <code>{courseId}</code>
            </Typography>
          </Box>

          <Typography variant="body1">{fomatDate(activityPeriod)}</Typography>
        </Box>

        <Typography variant="body1">{description}</Typography>
      </Paper>
    </Box>
  )
}

const Courses = () => {
  const { t } = useTranslation()

  const { courses, isLoading } = useUserCourses()

  if (isLoading) return null

  return (
    <Box
      sx={{
        margin: '0 auto',
        width: '90%',
        padding: '5%',
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          padding: '5% 10%',
          mt: 5,
        }}
      >
        <Typography variant="h5" display="inline">
          {t('common:courses')}
        </Typography>
        {courses.map((course) => (
          <Course key={course.id} course={course} />
        ))}
      </Paper>
    </Box>
  )
}

export default Courses
