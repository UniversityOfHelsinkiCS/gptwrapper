import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box } from '@mui/material'

import Markdown from './Markdown'
import ShowMore from './ShowMore'

const Banner = () => {
  const { t } = useTranslation()

  const showDisclaimer = !localStorage.getItem('disclaimerClosed') ?? true

  return (
    <Box sx={{ m: 2, maxWidth: 1560 }}>
      <Box
        sx={{
          my: 2,
          mx: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.3,
        }}
      >
        <Markdown>{t('info:title')}</Markdown>
        <ShowMore text={t('info:disclaimer')} expanded={showDisclaimer} />
      </Box>
    </Box>
  )
}

export default Banner
