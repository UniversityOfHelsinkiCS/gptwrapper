import { Box, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'

export const NotFound = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '80vh',
        textAlign: 'center',
        gap: 6,
      }}
    >
      <Typography variant="h1">{404}</Typography>
      <Typography variant="h4">{t('error:notFoundTitle')}</Typography>
      <OutlineButtonBlack onClick={handleGoHome}>{t('error:goHome')}</OutlineButtonBlack>
    </Box>
  )
}
