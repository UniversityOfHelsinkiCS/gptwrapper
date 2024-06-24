import React from 'react'
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import useCourseUsage from '../../../hooks/useCourseStudents'
import { filterUsages } from '../util'
import useCourse from '../../../hooks/useCourse'

const MaxTokenUsageStudents = ({ courseId }: { courseId: string }) => {
  const { chatInstanceUsages, isLoading: usagesLoading } = useCourseUsage(
    courseId as string
  )
  const { course } = useCourse(courseId as string)
  const { t } = useTranslation()

  if (usagesLoading || !chatInstanceUsages || !course) return null

  const filteredUsages = filterUsages(course.usageLimit, chatInstanceUsages)
  return (
    <Paper
      variant="outlined"
      sx={{
        padding: '2%',
        mt: 2,
      }}
    >
      <Typography variant="h6">{t('course:closeToMaxTokenLimit')}</Typography>
      {filteredUsages.length === 0 ? (
        <Typography>{t('course:noStudentsCloseToMaxTokenLimit')}</Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableBody>
              {filteredUsages.map(({ id, usageCount, user }) => (
                <TableRow key={id}>
                  <TableCell component="th" scope="row">
                    <Typography>{user.username}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography>{usageCount}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button color="error">{t('admin:reset')}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}

export default MaxTokenUsageStudents
