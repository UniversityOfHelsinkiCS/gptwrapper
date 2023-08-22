import React from 'react'
import { Box, Paper, Typography, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Service } from '../../types'
import useServices from '../../hooks/useServices'

const Course = ({ course }: { course: Service }) => {
  const { id, name, description, courseId } = course

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
          <Link href={`/courses/${id}`}>
            <Typography variant="h6" display="inline">
              {name}
            </Typography>
          </Link>

          <Typography variant="body1" display="inline">
            <code>{courseId}</code>
          </Typography>
        </Box>

        <Typography variant="body1">{description}</Typography>
      </Paper>
    </Box>
  )
}

const Courses = () => {
  const { t } = useTranslation()

  // Temporary
  const { services, isLoading } = useServices()
  const courses = services.filter(({ courseId }) => courseId)

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
