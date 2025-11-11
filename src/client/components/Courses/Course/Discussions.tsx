import { useParams, Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TableBody, TableCell, TableHead, TableRow, Table, Link, Paper, Typography, Alert } from '@mui/material'
import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse, { useCourseDiscussers } from '../../../hooks/useCourse'

const Discussion: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { language } = i18n
  const { courseId } = useParams() as { courseId: string }
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const { data: course, isSuccess: isCourseSuccess } = useCourse(courseId)
  const { discussers, isLoading: discussersLoading } = useCourseDiscussers(courseId)

  if (!course || !isCourseSuccess || isUserLoading || !user || discussersLoading) return null

  return (
    <div>
      {course.saveDiscussions && (
        <Paper
          variant="outlined"
          sx={{
            padding: '2%',
            mt: 2,
            width: '100%',
            borderRadius: '1.25rem',
          }}
        >
          <Typography variant="h6">{t('course:reseachCourse')}</Typography>
          <Alert severity="warning" style={{ marginTop: 20, marginBottom: 20 }}>
            <Typography>{course.notOptoutSaving ? t('course:isSavedNotOptOut') : t('course:isSavedForTeacherOptOut')}</Typography>
          </Alert>
        </Paper>
      )}

      <h2>{course.name[language]}</h2>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>User ID</TableCell>
            <TableCell>Messages</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {discussers.map((d) => (
            <TableRow key={d.user_id}>
              <TableCell>
                <Link to={`/courses/${courseId}/discussions/${d.user_id}`} component={RouterLink}>
                  {d.user_id}
                </Link>
              </TableCell>
              <TableCell>{d.discussion_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default Discussion
