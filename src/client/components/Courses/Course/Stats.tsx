import { useState } from 'react'
import { Box, Paper, Typography, TableBody, TableCell, TableHead, TableRow, Table, Button, Tooltip as MUITooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse, { useCourseEnrolments, useCourseStatistics } from '../../../hooks/useCourse'
import MaxTokenUsageStudents from './MaxTokenUsageStudents'
import HelpOutline from '@mui/icons-material/HelpOutline'
import { BlueButton, OutlineButtonBlue } from '../../ChatV2/general/Buttons'
import { useParams } from 'react-router-dom'

const Stats: React.FC = () => {
  const { t } = useTranslation()
  const { courseId } = useParams()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const [studentListOpen, setStudentListOpen] = useState(false)

  const { stats, isLoading } = useCourseStatistics(courseId)
  const { data: course, isSuccess: isCourseSuccess } = useCourse(courseId)
  const { data: enrolments } = useCourseEnrolments(courseId)

  if (!stats || !user || isLoading || isUserLoading || !isCourseSuccess) return null

  const { average, usagePercentage, usages } = stats

  usages.sort((a, b) => a.usageCount - b.usageCount)

  const usageByUser = usages.map((usage) => usage.dataValues).reduce((acc, u) => ({ ...acc, [u.userId]: u }), {})

  const enrolledUsers = enrolments?.map((enrolment) => enrolment.user) ?? []

  const byLastName = (a: { last_name: string }, b: { last_name: string }) => {
    if (a.last_name < b.last_name) {
      return -1
    }
    return 1
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        padding: '2%',
        mt: 2,
        width: '100%',
        borderRadius: '1.25rem',
      }}
    >
      <Typography variant="h5" display="inline">
        {t('course:statistics')}
      </Typography>

      <Typography sx={{ my: 1 }}>
        {t('course:averageTokenUsage')}: <strong>{Math.round(average) ?? t('course:noData')}</strong>
      </Typography>

      <Typography>
        {t('course:usagePercentage')}: <strong>{usagePercentage ? `${Math.round(usagePercentage * 100 * 10) / 10}%` : t('course:noData')}</strong>
      </Typography>

      {usages && usages.length > 3 && usagePercentage > 0.2 && (
        <>
          <ResponsiveContainer width="99%" height={300}>
            <BarChart
              data={usages.map((u) => ({
                ...u,
                usageCount: u.usageCount.toFixed(2),
              }))}
              margin={{ top: 50, right: 20, bottom: 20, left: 0 }}
            >
              <Tooltip />
              <YAxis domain={[0, 100]} allowDataOverflow />

              <Bar dataKey="usageCount" name={t('course:percentageUsed')} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          <Box textAlign="center" ml={8} mr={6}>
            <Box
              sx={{
                width: '100%',
                height: '1px',
                backgroundColor: 'lightgray',
                mb: 1,
              }}
            />
            <Typography>{t('course:usageChartTitle')}</Typography>
          </Box>
        </>
      )}

      {usages && !course.saveDiscussions && (
        <>
          <OutlineButtonBlue onClick={() => setStudentListOpen(!studentListOpen)} sx={{ mt: 1 }} color="primary" style={{ marginTop: 10 }}>
            {studentListOpen ? t('admin:hideStudentList') : t('admin:showStudentList')}
          </OutlineButtonBlue>
          {studentListOpen && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>{t('admin:studentNumber')}</strong>
                  </TableCell>
                  <TableCell>
                    <strong>{t('admin:lastName')}</strong>
                  </TableCell>
                  <TableCell>
                    <strong>{t('admin:firstNames')}</strong>
                  </TableCell>
                  <TableCell align='right'>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <strong>{t('admin:usage')}</strong>
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

                  <TableCell align='right'>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <strong>{t('admin:totalUsage')}</strong>
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
              <TableBody>
                {enrolledUsers.sort(byLastName).map((enrolled) => (
                  <TableRow key={enrolled.id}>
                    <TableCell>{enrolled.student_number}</TableCell>
                    <TableCell>{enrolled.last_name}</TableCell>
                    <TableCell>{enrolled.first_names}</TableCell>
                    <TableCell align='right'>{usageByUser[enrolled.id] ? usageByUser[enrolled.id].usageCount : 0}</TableCell>
                    <TableCell align='right'>{usageByUser[enrolled.id] ? usageByUser[enrolled.id].totalUsageCount : 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      <MaxTokenUsageStudents course={course} />
    </Paper>
  )
}

export default Stats
