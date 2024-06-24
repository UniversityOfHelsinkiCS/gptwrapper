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
import { enqueueSnackbar } from 'notistack'
import { filterUsages } from '../util'
import useCourse from '../../../hooks/useCourse'
import {
  useCourseUsage,
  useResetChatInstanceUsageMutation,
} from '../../../hooks/useChatInstanceStudents'

const MaxTokenUsageStudents = ({ courseId }: { courseId: string }) => {
  const { chatInstanceUsages, isLoading: usagesLoading } = useCourseUsage(
    courseId as string
  )
  const resetUsage = useResetChatInstanceUsageMutation()
  const { course } = useCourse(courseId as string)
  const { t } = useTranslation()

  if (usagesLoading || !chatInstanceUsages || !course) return null

  const filteredUsages = filterUsages(course.usageLimit, chatInstanceUsages)

  const onResetUsage = (id: string) => {
    try {
      resetUsage.mutate(id)
      enqueueSnackbar('Usage reset successfully', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

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
                    <Button color="error" onClick={() => onResetUsage(id)}>
                      {t('admin:reset')}
                    </Button>
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
