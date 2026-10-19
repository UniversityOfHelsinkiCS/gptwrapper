import type { Theme } from '@mui/material/styles'

const SERIES_COLORS = {
  light: ['#1565c0', '#c62828', '#2e7d32', '#b45309', '#7b1fa2', '#00796b', '#ad1457', '#455a64', '#7a5f00', '#512da8'],
  dark: ['#90caf9', '#ef9a9a', '#a5d6a7', '#ffcc80', '#ce93d8', '#80deea', '#f48fb1', '#b0bec5', '#fff59d', '#b39ddb'],
} as const

export const chartSeriesColor = (theme: Theme, index: number) => {
  const colors = SERIES_COLORS[theme.palette.mode]
  return colors[index % colors.length]
}

export const chartAxisColor = (theme: Theme) => theme.palette.text.secondary

export const chartTooltipStyle = (theme: Theme) => ({
  contentStyle: { backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider },
  labelStyle: { color: theme.palette.text.primary },
})
