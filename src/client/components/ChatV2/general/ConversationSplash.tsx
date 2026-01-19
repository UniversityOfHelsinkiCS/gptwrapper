import { Box, Typography } from '@mui/material'
import hyLogo from '../../../assets/hy_logo.svg'
import { useTranslation } from 'react-i18next'
import { ActivityPeriod } from '../../../types'

export const ConversationSplash = ({ courseName, courseDate, promptName }: { courseName?: string; courseDate?: ActivityPeriod, promptName?: string }) => {
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
        transition: 'opacity 0.6s, transform 0.6s',
        opacity: 1,
        transform: 'scale(1)',
        animation: 'fadeInScale 0.6s ease',
        '@keyframes fadeInScale': {
          from: { opacity: 0, transform: 'scale(0.8)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
      }}
    >
      <Box
        component="img"
        src={hyLogo}
        alt="University of Helsinki"
        sx={{
          width: { xs: '80px', sm: '120px', md: '200px' },
          opacity: 0.2,
          mb: '2.5rem',
        }}
      />

      <Box sx={{ opacity: 0.5 }}>
        {courseName ? (
          <>
            <Typography
              fontWeight="bold"
              sx={{
                mb: 1,
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
              }}
            >
              {courseName}
            </Typography>
            <Typography fontWeight='medium' sx={{ fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' } }}>
              {promptName}
            </Typography>
          </>
        ) : (
          <Typography variant="h6" fontStyle="italic" sx={{ mb: 1 }}>
            {t('chat:start')}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
