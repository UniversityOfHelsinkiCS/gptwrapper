import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Service } from '../../types'

const Course = ({ name }: { name: string }) => (
  <Box>
    <Paper
      variant="outlined"
      sx={{
        padding: '2% 4%',
        mt: 3,
      }}
    >
      <Typography variant="h6" display="inline">
        {name}
      </Typography>
    </Paper>
  </Box>
)

const Courses = () => {
  const { t } = useTranslation()

  const courses: Service[] = []

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
          <Course key={course.id} name={course.name} />
        ))}
      </Paper>
    </Box>
  )
}

export default Courses
