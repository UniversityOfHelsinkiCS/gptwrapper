import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useCourseDailyUsage } from '../../../hooks/useCourse'
import { format, parseISO } from 'date-fns'

const UsageHistogram: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { courseId } = useParams()
  const { dailyUsage, isLoading } = useCourseDailyUsage(courseId)

  if (isLoading) return null

  if (!dailyUsage || dailyUsage.length === 0) {
    return (
      <Box py={3}>
        <Typography variant="h6">{t('course:usageHistogramTitle')}</Typography>
        <Typography color="text.secondary">{t('course:noData')}</Typography>
      </Box>
    )
  }

  const chartData = dailyUsage.map((d) => ({
    date: d.date,
    count: d.count,
    formattedDate: format(parseISO(d.date), 'dd.MM.yyyy'),
  }))

  return (
    <Box py={3}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('course:usageHistogramTitle')}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="formattedDate" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} label={{ value: t('course:discussionCount'), angle: -90, position: 'insideLeft' }} />
          <Tooltip
            labelFormatter={(label) => `${t('course:date')}: ${label}`}
            formatter={(value: number) => [value, t('course:discussions')]}
          />
          <Bar dataKey="count" fill="#1976d2" name={t('course:discussions')} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default UsageHistogram
