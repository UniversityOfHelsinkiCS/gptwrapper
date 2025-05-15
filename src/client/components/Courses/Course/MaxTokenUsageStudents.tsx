import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { enqueueSnackbar } from 'notistack'
import { filterUsages } from '../util'
import { useCourseUsage } from '../../../hooks/useChatInstanceUsage'
import { useResetChatInstanceUsageMutation } from '../../../hooks/useChatInstanceUsageMutation'
import { Course } from '../../../types'

const MaxTokenUsageStudents = ({ course }: { course: Course }) => {
  const { chatInstanceUsages, isLoading: usagesLoading } = useCourseUsage(course.id as string)
  const resetUsage = useResetChatInstanceUsageMutation()
  const { t } = useTranslation()

  if (usagesLoading || !chatInstanceUsages || !course) return null

  const filteredUsages = filterUsages(course.usageLimit, chatInstanceUsages)

  const onResetUsage = (id: string) => {
    try {
      resetUsage.mutate(id)
      enqueueSnackbar(t('course:usageResetSuccess'), { variant: 'success' })
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
                    <Typography>{user.studentNumber}</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <Typography>{user.lastName}</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <Typography>{user.firstNames}</Typography>
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
