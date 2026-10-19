import { useMemo } from 'react'
import { Paper, Typography, Box, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PromptUsageData } from '../../../hooks/useCourse'
import type { ActivityPeriod } from '../../../types'
import { chartAxisColor, chartSeriesColor, chartTooltipStyle } from '../../../util/charts'

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
  const theme = useTheme()

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="subtitle1" component="h4" fontWeight="bold">
            {t('course:promptUsageTitle')}
          </Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t('course:noData')}
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ padding: '2%', mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle1" component="h4" fontWeight="bold">
          {t('course:promptUsageTitle')}
        </Typography>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke={chartAxisColor(theme)} tick={{ fontSize: 12 }} />
            <YAxis stroke={chartAxisColor(theme)} />
            <Tooltip {...chartTooltipStyle(theme)} cursor={{ fill: theme.palette.action.hover }} formatter={(value: number) => value.toLocaleString()} />
            {promptNames.map(({ key, name }, idx) => (
              <Bar key={key} dataKey={key} name={name} stackId="tokens" fill={chartSeriesColor(theme, idx)} stroke={theme.palette.background.paper} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Box component="ul" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, columnGap: 2, listStyle: 'none', p: 0, m: 0, mt: 1 }}>
        {promptNames.map(({ key, name }, idx) => (
          <Box component="li" key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Box sx={{ width: 12, height: 12, flexShrink: 0, bgcolor: chartSeriesColor(theme, idx) }} />
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

export default PromptUsageHistogram
