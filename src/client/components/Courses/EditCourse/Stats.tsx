import React from 'react'
import { Paper, Typography } from '@mui/material'
import { TFunction } from 'i18next/typescript/t'

const Stats = ({
  stats,
  t,
}: {
  stats: any
  t: TFunction<'translation', undefined>
}) => {
  if (!stats) return null

  const { average, usagePercentage } = stats

  if (!average && !usagePercentage) return null

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
          CurreChatin käyttöön ottaneiden opiskelijoiden osuus:
          {usagePercentage}
        </Typography>
      )}
    </Paper>
  )
}

export default Stats
