import React from 'react'
import { Paper, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  YAxis,
  Tooltip,
  XAxis,
  Label,
  ResponsiveContainer,
} from 'recharts'
import { useCourseStatistics } from '../../../hooks/useCourse'

const Stats = ({ courseId }: { courseId: string }) => {
  const { t } = useTranslation()

  const { stats, isLoading } = useCourseStatistics(courseId)

  if (!stats || isLoading) return null

  const { average, usagePercentage, usages } = stats

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
        {t('course:averageTokenUsage')} {average ?? t('course:noData')}
      </Typography>

      <Typography>
        {t('course:usagePercentage')}{' '}
        {usagePercentage ? `${usagePercentage * 100}%` : t('course:noData')}
      </Typography>

      {usages && usages.length !== 0 && (
        <ResponsiveContainer width="99%" height={300}>
          <BarChart
            data={usages}
            margin={{ top: 50, right: 20, bottom: 20, left: 0 }}
          >
            <Tooltip />
            <YAxis domain={[0, 100]} />
            <XAxis>
              <Label value={t('course:usageChartTitle')} position="bottom" />
            </XAxis>
            <Bar dataKey="usageCount" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  )
}

export default Stats
