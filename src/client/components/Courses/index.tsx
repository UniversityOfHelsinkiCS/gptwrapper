import React from 'react'
import { Box, Tab, Tabs, Typography, Container } from '@mui/material'
import { useTranslation } from 'react-i18next'
import useUserCourses from '../../hooks/useUserCourses'
import CourseList from './CourseList'
import { getGroupedCourses } from './util'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const CustomTabPanel = (props: TabPanelProps) => {
  const { children, value, index } = props

  return (
    <Box role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </Box>
  )
}

const Courses = () => {
  const { t } = useTranslation()
  const { courses, isLoading } = useUserCourses()

  const [value, setValue] = React.useState(0)

  if (!courses || isLoading) return null

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const { curreEnabled, ended } = getGroupedCourses(courses)

  const activeCourses = courses.filter((course) => !course.isExpired)

  return (
    <Container sx={{ mt: '8rem', mb: '10rem' }} maxWidth="xl">
      <Box display="flex" gap={2}>
        <Typography variant="h5" display="inline" mb={1}>
          {t('common:courses')}
        </Typography>
      </Box>
      <Tabs value={value} onChange={handleChange}>
        <Tab label={t('course:activeTab')} />
        <Tab label={t('course:curreEnabledTab')} />
        <Tab label={t('course:endedTab')} />
      </Tabs>
      <CustomTabPanel value={value} index={0}>
        <CourseList courseUnits={activeCourses} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <CourseList courseUnits={curreEnabled} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <CourseList courseUnits={ended} />
      </CustomTabPanel>
    </Container>
  )
}

export default Courses
