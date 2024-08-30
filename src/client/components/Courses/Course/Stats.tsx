import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { inDevelopment } from '../../../../config'
import { useCourseStatistics } from '../../../hooks/useCourse'

const Stats = ({ courseId }: { courseId: string }) => {
  const { t } = useTranslation()

  const { stats, isLoading } = useCourseStatistics(courseId)

  if (!stats || isLoading) return null

  let statsUsed = stats

  if (inDevelopment) {
    statsUsed = {
      average: 75,
      usagePercentage: 0.85,
      usages: [
        {
          id: 'module-1',
          usageCount: 60,
          userId: 'user-1',
          chatInstanceId: 'chat-1',
        },
        {
          id: 'module-2',
          usageCount: 80,
          userId: 'user-2',
          chatInstanceId: 'chat-2',
        },
        {
          id: 'module-3',
          usageCount: 50,
          userId: 'user-3',
          chatInstanceId: 'chat-3',
        },
        {
          id: 'module-4',
          usageCount: 90,
          userId: 'user-4',
          chatInstanceId: 'chat-4',
        },
        {
          id: 'module-5',
          usageCount: 70,
          userId: 'user-5',
          chatInstanceId: 'chat-5',
        },
      ],
    }
  }

  const { average, usagePercentage, usages } = statsUsed

  usages.sort((a, b) => a.usageCount - b.usageCount)

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

      {usages && usages.length !== 0 && (
        <ResponsiveContainer width="99%" height={300}>
          <BarChart
            data={usages}
            margin={{ top: 50, right: 20, bottom: 20, left: 0 }}
          >
            <Tooltip />
            <YAxis domain={[0, 100]} allowDataOverflow />

            <Bar dataKey="usageCount" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      )}
      {usages && usages.length !== 0 && (
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
      )}
    </Paper>
  )
}

export default Stats
