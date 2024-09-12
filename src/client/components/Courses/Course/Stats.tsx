import React from 'react'
import {
  Box,
  Paper,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Table,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { inDevelopment } from '../../../../config'
import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse, { useCourseStatistics } from '../../../hooks/useCourse'

const Stats = ({ courseId }: { courseId: string }) => {
  const { t } = useTranslation()
  const { user, isLoading: isUserLoading } = useCurrentUser()

  const { stats, isLoading } = useCourseStatistics(courseId)
  const { course, isLoading: courseLoading } = useCourse(courseId)

  if (!stats || !user || isLoading || isUserLoading || courseLoading)
    return null

  let statsUsed = stats

  if (!inDevelopment) {
    const dataValues = {
      userId: 'user-1',
    }

    statsUsed = {
      average: 75,
      usagePercentage: 0.85,
      usages: [
        {
          id: 'module-1',
          usageCount: 60,
          userId: 'user-1',
          chatInstanceId: 'chat-1',
          dataValues,
        },
        {
          id: 'module-2',
          usageCount: 80,
          userId: 'user-2',
          chatInstanceId: 'chat-2',
          dataValues,
        },
        {
          id: 'module-3',
          usageCount: 50,
          userId: 'user-3',
          chatInstanceId: 'chat-3',
          dataValues,
        },
        {
          id: 'module-4',
          usageCount: 90,
          userId: 'user-4',
          chatInstanceId: 'chat-4',
          dataValues,
        },
        {
          id: 'module-5',
          usageCount: 70,
          userId: 'user-5',
          chatInstanceId: 'chat-5',
          dataValues,
        },
      ],
    }
  }

  const { average, usagePercentage, usages } = statsUsed

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

      {usages && usages.length !== 0 && user.isAdmin && (
        <>
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t('admin:usageByUser')}
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>{t('course:username')}</strong>
                </TableCell>
                <TableCell>
                  <strong>{t('course:lastName')}</strong>
                </TableCell>
                <TableCell>
                  <strong>{t('course:firstNames')}</strong>
                </TableCell>
                <TableCell>
                  <strong>{t('course:usage')}</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrolledUsers.sort(byLastName).map((enrolled) => (
                <TableRow key={enrolled.id}>
                  <TableCell>{enrolled.username}</TableCell>
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
        </>
      )}
    </Paper>
  )
}

export default Stats
