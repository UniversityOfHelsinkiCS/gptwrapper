import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box } from '@mui/material'

import Markdown from './Markdown'
import ShowMore from './ShowMore'

const Banner = () => {
  const { t } = useTranslation()

  const showDisclaimer = !localStorage.getItem('disclaimerClosed')

  return (
    <Box mt="1rem" mb="3rem">
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.3,
          overflowWrap: 'anywhere',
        }}
      >
        <Markdown>{t('info:title')}</Markdown>
        <ShowMore text={t('info:disclaimer')} expanded={showDisclaimer} />
      </Box>
    </Box>
  )
}

export default Banner
