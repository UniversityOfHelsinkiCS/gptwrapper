import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import useChatInstanceUsage from '../../../hooks/useChatInstanceUsage'
import useUserCourses from '../../../hooks/useUserCourses'
import type { ChatInstanceUsage, Course } from '../../../types'

const calculateCourseUsage = (usage: ChatInstanceUsage[], courses: Course[]) => {
  const courseUsage = courses.map((course) => ({
    course,
    usageCount: 0,
  }))

  usage.forEach(({ usageCount, chatInstance }) => {
    const course = courseUsage.find(({ course: { id } }) => id === chatInstance.id)
    if (course) course.usageCount += usageCount
  })

  return courseUsage
}

const sortUsage = (language: string) => (a: { course: Course }, b: { course: Course }) => a.course.name[language].localeCompare(b.course.name[language])

const CourseTable = () => {
  const { usage } = useChatInstanceUsage()
  const { courses } = useUserCourses()

  const { t, i18n } = useTranslation()

  if (!courses || !usage) return null

  const { language } = i18n

  const courseUsage = calculateCourseUsage(usage, courses)
  const sortedUsage = courseUsage.sort(sortUsage(language))

  return (
    <Box my={2}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h5">
                  <b>{t('admin:name')}</b>
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h5" align="right">
                  <b>{t('admin:usageCount')}</b>
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedUsage.map(({ course, usageCount }) => (
              <TableRow key={course.id}>
                <TableCell component="th" scope="row">
                  <Typography variant="h6">{course.name[language]}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{usageCount}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default CourseTable
