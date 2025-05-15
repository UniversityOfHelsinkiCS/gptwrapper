import { useParams, Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TableBody, TableCell, TableHead, TableRow, Table, Link } from '@mui/material'
import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse, { useCourseDiscussers } from '../../../hooks/useCourse'

const Usage = () => {
  const { i18n } = useTranslation()
  const { language } = i18n
  const { id } = useParams()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const { course, isLoading: courseLoading } = useCourse(id)
  const { discussers, isLoading: discussersLoading } = useCourseDiscussers(id)

  if (!course || courseLoading || isUserLoading || !user || discussersLoading) return null

  return (
    <div>
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
                <Link to={`/courses/${id}/discussions/${d.user_id}`} component={RouterLink}>
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

export default Usage
