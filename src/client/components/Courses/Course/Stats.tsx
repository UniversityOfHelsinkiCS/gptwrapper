import React from 'react'
import { Paper, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const Stats = ({ stats }: { stats: any }) => {
  const { t } = useTranslation()

  if (!stats || (!stats.average && !stats.usagePercentage)) return null

  const { average, usagePercentage } = stats

  return (
    <Paper
      variant="outlined"
      sx={{
        padding: '2%',
        mt: 2,
      }}
    >
      <Typography variant="h6" display="inline">
        {t('course:statistics')}
      </Typography>

      {average && (
        <Typography>
          {t('course:averageTokenUsage')} {parseInt(average, 10)}
        </Typography>
      )}

      {usagePercentage && (
        <Typography>
          {t('course:usagePercentage')}
          {usagePercentage * 100}%
        </Typography>
      )}
    </Paper>
  )
}

export default Stats
