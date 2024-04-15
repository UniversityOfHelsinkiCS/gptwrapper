import React from 'react'
import { Link } from 'react-router-dom'
import { Box, Pagination, Paper, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Course as CourseType } from '../../types'
import useUserCourses from '../../hooks/useUserCourses'
import { formatDate, sortCourses } from './util'

const Course = ({ course }: { course: CourseType }) => {
  if (!course) return null

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

          <Typography variant="body1">{formatDate(activityPeriod)}</Typography>
        </Box>

        <Typography variant="body1">{description}</Typography>
      </Paper>
    </Box>
  )
}

const Courses = () => {
  const { t } = useTranslation()

  const [page, setPage] = React.useState(1)
  const itemsPerPage = 20
  const { courses = [], count } = useUserCourses({
    limit: itemsPerPage,
    offset: (page - 1) * itemsPerPage,
  })

  const sortedCourses = courses.sort(sortCourses)

  return (
    <Box>
      <Typography variant="h5" display="inline">
        {t('common:courses')}
      </Typography>
      <Pagination
        count={Math.ceil(count / itemsPerPage) ?? 0}
        onChange={(_ev, value) => setPage(value)}
        page={page}
      />
      {sortedCourses?.map((course) => (
        <Course key={course.id} course={course} />
      ))}
    </Box>
  )
}

export default Courses
