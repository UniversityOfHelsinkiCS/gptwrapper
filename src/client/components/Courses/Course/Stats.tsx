import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Table,
  Button,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse, { useCourseStatistics } from '../../../hooks/useCourse'

const Stats = ({ courseId }: { courseId: string }) => {
  const { t } = useTranslation()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const [studentListOpen, setStudentListOpen] = useState(false)

  const { stats, isLoading } = useCourseStatistics(courseId)
  const { course, isLoading: courseLoading } = useCourse(courseId)

  if (!stats || !user || isLoading || isUserLoading || courseLoading)
    return null

  const { average, usagePercentage, usages } = stats

  usages.sort((a, b) => a.usageCount - b.usageCount)

  const usageByUser = usages
    .map((usage) => usage.dataValues)
    .reduce((acc, u) => ({ ...acc, [u.userId]: u }), {})

  const enrolledUsers =
    course.enrolments && course.enrolments.map((enrolment) => enrolment.user)

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
      }}
    >
      <Typography variant="h5" display="inline">
        {t('course:statistics')}
      </Typography>

      <Typography sx={{ my: 1 }}>
        {t('course:averageTokenUsage')}{' '}
        {Math.round(average) ?? t('course:noData')}
      </Typography>

      <Typography>
        {t('course:usagePercentage')}{' '}
        {usagePercentage
          ? `${Math.round(usagePercentage * 100 * 10) / 10}%`
          : t('course:noData')}
      </Typography>

      {usages && usages.length !== 0 && usagePercentage > 0.2 && (
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

              <Bar
                dataKey="usageCount"
                name={t('course:percentageUsed')}
                fill="#8884d8"
              />
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

      {usages && (
        <>
          <Button
            onClick={() => setStudentListOpen(!studentListOpen)}
            sx={{ mt: 1 }}
            color="primary"
            style={{ marginTop: 10, marginLeft: -8 }}
          >
            {studentListOpen
              ? t('admin:hideStudentList')
              : t('admin:showStudentList')}
          </Button>
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
                  <TableCell>
                    <strong>{t('admin:usage')}</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {enrolledUsers.sort(byLastName).map((enrolled) => (
                  <TableRow key={enrolled.id}>
                    <TableCell>{enrolled.student_number}</TableCell>
                    <TableCell>{enrolled.last_name}</TableCell>
                    <TableCell>{enrolled.first_names}</TableCell>
                    <TableCell>
                      {usageByUser[enrolled.id]
                        ? usageByUser[enrolled.id].usageCount
                        : 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </Paper>
  )
}

export default Stats
