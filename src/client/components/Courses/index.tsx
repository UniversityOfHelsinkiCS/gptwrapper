/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { Box, Tab, Tabs, Typography } from '@mui/material'
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
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const Courses = () => {
  const { t } = useTranslation()
  const { courses } = useUserCourses()

  const [value, setValue] = React.useState(0)

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const { curreEnabled, ended } = getGroupedCourses(courses)

  return (
    <>
      <Box display="flex" gap={2}>
        <Typography variant="h5" display="inline" mb={1}>
          {t('common:courses')}
        </Typography>
      </Box>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="basic tabs example"
      >
        <Tab label="Kaikki" />
        <Tab label="CurreChat käytössä" />
        <Tab label="Päättyneet" />
      </Tabs>
      <CustomTabPanel value={value} index={0}>
        <CourseList courseUnits={courses} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <CourseList courseUnits={curreEnabled} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <CourseList courseUnits={ended} />
      </CustomTabPanel>
    </>
  )
}

export default Courses
