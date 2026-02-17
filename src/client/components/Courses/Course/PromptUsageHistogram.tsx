import { useMemo } from 'react'
import { Paper, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PromptUsageData } from '../../../hooks/useCourse'
import type { ActivityPeriod } from '../../../types'

const COLORS = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', '#0097a7', '#c2185b', '#455a64', '#fbc02d', '#512da8']

const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getDate()}.${date.getMonth() + 1}.`
}

type Props = {
  promptUsages: PromptUsageData[]
  activityPeriod: ActivityPeriod
}

const PromptUsageHistogram = ({ promptUsages, activityPeriod }: Props) => {
  const { t } = useTranslation()

  const { chartData, promptNames } = useMemo(() => {
    const promptTotals = new Map<string, number>()
    const promptMap = new Map<string, string>()
    for (const pu of promptUsages) {
      const key = pu.promptId ?? '_custom'
      if (!promptMap.has(key)) {
        promptMap.set(key, pu.promptName ?? t('course:customPrompt'))
      }
      promptTotals.set(key, (promptTotals.get(key) ?? 0) + pu.totalTokens)
    }

    const promptNames = Array.from(promptMap.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => (promptTotals.get(b.key) ?? 0) - (promptTotals.get(a.key) ?? 0))

    const dates = [...new Set(promptUsages.map((pu) => pu.date))].sort()

    const usageByDateAndPrompt = new Map<string, Map<string, number>>()
    for (const pu of promptUsages) {
      const key = pu.promptId ?? '_custom'
      if (!usageByDateAndPrompt.has(pu.date)) {
        usageByDateAndPrompt.set(pu.date, new Map())
      }
      usageByDateAndPrompt.get(pu.date)!.set(key, pu.totalTokens)
    }

    const chartData = dates.map((date) => {
      const row: Record<string, string | number> = { date: formatDateLabel(date) }
      const dayData = usageByDateAndPrompt.get(date)
      for (const { key } of promptNames) {
        row[key] = dayData?.get(key) ?? 0
      }
      return row
    })

    return { chartData, promptNames }
  }, [promptUsages, activityPeriod, t])

  if (!promptUsages || promptUsages.length === 0) {
    return (
      <Paper variant="outlined" sx={{ padding: '2%', mt: 2 }}>
        <Typography variant="h6">{t('course:promptUsageTitle')}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t('course:noData')}
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ padding: '2%', mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('course:promptUsageTitle')}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Legend />
          {promptNames.map(({ key, name }, idx) => (
            <Bar key={key} dataKey={key} name={name} stackId="tokens" fill={COLORS[idx % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}

export default PromptUsageHistogram
