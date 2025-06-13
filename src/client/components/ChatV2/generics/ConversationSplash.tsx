import { Box, Typography } from '@mui/material'
import hyLogo from '../../../assets/hy_logo.svg'
import { useTranslation } from 'react-i18next'
import { formatDate } from '../../Courses/util'
import { ActivityPeriod } from '../../../types'

export const ConversationSplash = ({ courseName, courseDate }: { courseName?: string; courseDate?: ActivityPeriod }) => {
  const { t, i18n } = useTranslation()
  const { language } = i18n
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
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
      <img src={hyLogo} alt="University of Helsinki" width="240" style={{ opacity: 0.2, marginBottom: '2rem' }} />
      {courseName ? (
        <>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, opacity: 0.5 }}>
            {courseName}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            {formatDate(courseDate)}
          </Typography>
        </>
      ) : (
        <Typography variant="h6" fontStyle="italic" sx={{ mb: 1, opacity: 0.5 }}>
          {t("chat:start")}
        </Typography>
      )}
    </Box>
  )
}
