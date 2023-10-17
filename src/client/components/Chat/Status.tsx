import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'

const Status = ({
  model,
  usage,
  limit,
}: {
  model: string
  usage: number
  limit: number
}) => {
  const { t } = useTranslation()

  return (
    <Box mb={1} padding="2% 10%">
      <Typography variant="body1">
        {t('status:modelInUse')} <code>{model}</code>
      </Typography>
      <Typography variant="body1">
        {usage} / {limit} {t('status:tokensUsed')}
      </Typography>
    </Box>
  )
}

export default Status
