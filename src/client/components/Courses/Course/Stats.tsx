import { useState } from 'react'
import HelpOutline from '@mui/icons-material/HelpOutline'
import { Box, Tooltip as MUITooltip, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import useCourse, { useCourseEnrolments, useCourseStatistics } from '../../../hooks/useCourse'
import useCurrentUser from '../../../hooks/useCurrentUser'
import MaxTokenUsageStudents from './MaxTokenUsageStudents'

type SortConfig = {
  key: 'last_name' | 'usageCount' | 'totalUsageCount'
  direction: 'asc' | 'desc'
}

const Stats: React.FC = () => {
  const { t } = useTranslation()
  const { courseId } = useParams()
  const { user, isLoading: isUserLoading } = useCurrentUser()

  const { stats, isLoading } = useCourseStatistics(courseId)
  const { data: course, isSuccess: isCourseSuccess } = useCourse(courseId)
  const { data: enrolments } = useCourseEnrolments(courseId)

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'last_name', direction: 'asc' })

  if (!stats || !user || isLoading || isUserLoading || !isCourseSuccess) return null

  const { average, usagePercentage, usages } = stats

  const usageByUser = usages.map((usage) => usage.dataValues).reduce((acc, u) => ({ ...acc, [u.userId]: u }), {}) ?? []

  const enrolledUsers =
    enrolments?.map((enrolment) => ({
      ...enrolment.user,
      usageCount: usageByUser[enrolment.user.id]?.usageCount || 0,
      totalUsageCount: usageByUser[enrolment.user.id]?.totalUsageCount || 0,
    })) ?? []

  const requestSort = (key: 'last_name' | 'usageCount' | 'totalUsageCount') => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const sortedUsers = [...enrolledUsers].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  return (
    <Box py={3} data-testid="students-stats-container">
      <Typography variant="h5" display="inline" data-testid="statistics-heading">
        {t('course:statistics')}
      </Typography>
      <Typography sx={{ my: 1 }} data-testid="average-token-usage">
        {t('course:averageTokenUsage')}: <strong>{Math.round(average) ?? t('course:noData')}</strong>
      </Typography>
      <Typography data-testid="usage-percentage">
        {t('course:usagePercentage')}: <strong>{usagePercentage ? `${Math.round(usagePercentage * 100 * 10) / 10}%` : t('course:noData')}</strong>
      </Typography>
      <MaxTokenUsageStudents course={course} />
      {usages && !course.saveDiscussions && (
        <>
          <Table sx={{ mt: 2 }} data-testid="students-table">
            <TableHead sx={{ borderRadius: 1, backgroundColor: 'grey.100' }}>
              <TableRow>
                <TableCell />
                <TableCell>
                  <strong>{t('admin:studentNumber')}</strong>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'last_name'}
                    direction={sortConfig.direction}
                    onClick={() => requestSort('last_name')}
                    data-testid="sort-by-last-name"
                  >
                    <strong>{t('admin:lastName')}</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <strong>{t('admin:firstNames')}</strong>
                </TableCell>
                <TableCell align="right">
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <TableSortLabel
                      active={sortConfig.key === 'usageCount'}
                      direction={sortConfig.direction}
                      onClick={() => requestSort('usageCount')}
                      data-testid="sort-by-usage"
                    >
                      <strong>{t('admin:usage')}</strong>
                    </TableSortLabel>
                    <MUITooltip
                      arrow
                      placement="top"
                      title={
                        <Typography variant="body2" sx={{ p: 1 }}>
                          {t('course:usageToolTip')}
                        </Typography>
                      }
                    >
                      <HelpOutline fontSize="small" sx={{ color: 'inherit', opacity: 0.7 }} />
                    </MUITooltip>
                  </Box>
                </TableCell>

                <TableCell align="right">
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <TableSortLabel
                      active={sortConfig.key === 'totalUsageCount'}
                      direction={sortConfig.direction}
                      onClick={() => requestSort('totalUsageCount')}
                      data-testid="sort-by-total-usage"
                    >
                      <strong>{t('admin:totalUsage')}</strong>
                    </TableSortLabel>
                    <MUITooltip
                      arrow
                      placement="top"
                      title={
                        <Typography variant="body2" sx={{ p: 1 }}>
                          {t('course:totalUsageToolTip')}
                        </Typography>
                      }
                    >
                      <HelpOutline fontSize="small" sx={{ color: 'inherit', opacity: 0.7 }} />
                    </MUITooltip>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody data-testid="students-table-body">
              {sortedUsers.map((enrolled, idx) => (
                <TableRow key={enrolled.id} data-testid={`student-row-${enrolled.id}`}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell data-testid="student-number">{enrolled.student_number}</TableCell>
                  <TableCell data-testid="student-last-name">{enrolled.last_name}</TableCell>
                  <TableCell data-testid="student-first-names">{enrolled.first_names}</TableCell>
                  <TableCell align="right" data-testid="student-usage">
                    {usageByUser[enrolled.id] ? usageByUser[enrolled.id].usageCount : 0}
                  </TableCell>
                  <TableCell align="right" data-testid="student-total-usage">
                    {usageByUser[enrolled.id] ? usageByUser[enrolled.id].totalUsageCount : 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Box>
  )
}

export default Stats
