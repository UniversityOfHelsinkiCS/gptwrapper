import { Box, Typography } from '@mui/material'
import { HYLogo } from './HYLogo'
import { useTranslation } from 'react-i18next'
import { ActivityPeriod } from '../../../types'

export const ConversationSplash = ({
  courseName,
  courseDate: _courseDate,
  promptName,
}: {
  courseName?: string
  courseDate?: ActivityPeriod
  promptName?: string
}) => {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
        alignItems: 'center',
        transition: 'transform 0.6s',
        transform: 'scale(1)',
        animation: 'fadeInScale 0.6s ease',
        '@keyframes fadeInScale': {
          from: { transform: 'scale(0.8)' },
          to: { transform: 'scale(1)' },
        },
      }}
    >
      <HYLogo
        sx={{
          width: { xs: '80px', sm: '120px', md: '200px' },
          color: 'text.primary',
          opacity: 0.2,
          mb: '2.5rem',
          animation: 'spinOnce 0.8s ease-out',
          '@keyframes spinOnce': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' },
          },
        }}
      />

      <Box>
        {courseName ? (
          <>
            <Typography
              fontWeight="bold"
              color="text.secondary"
              sx={{
                mb: 1,
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
              }}
            >
              {courseName}
            </Typography>
            <Typography fontWeight="medium" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' } }}>
              {promptName}
            </Typography>
          </>
        ) : (
          <Typography variant="h6" fontStyle="italic" color="text.primary" sx={{ mb: 1 }}>
            {t('chat:start')}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
