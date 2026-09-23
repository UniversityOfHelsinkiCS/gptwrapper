import { Box, Chip, Typography, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import toskaColor from '../../assets/toscalogo_color.svg'
import { formatDistanceToNow } from 'date-fns'
import { locales } from '../../locales/locales'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useUnseenReleasesCount } from '../../hooks/useChangelog'

const Footer = () => {
  const { t, i18n } = useTranslation()
  const { user } = useCurrentUser()
  const unseenReleasesCount = useUnseenReleasesCount()

  const uptime = formatDistanceToNow(user?.lastRestart ?? Date.now(), { locale: locales[i18n.language] })
  const serverVersion = user?.serverVersion
  const clientVersion = import.meta.env.VITE_VERSION as string | undefined

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Link flex={1} href="https://toska.dev" target="_blank" rel="noopener" underline="hover">
        <img src={toskaColor} width="100%" alt={t('footer:toska')} />
      </Link>
      <Box flex={2} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption">{t('footer:server', { version: serverVersion })}</Typography>
        <Typography variant="caption">{t('footer:client', { version: clientVersion })}</Typography>
        <Typography variant="caption">{t('footer:uptime', { uptime })}</Typography>
        <Link
          component={RouterLink}
          to="/changelog"
          variant="caption"
          underline="hover"
          sx={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'text.primary',
          }}
        >
          {t('footer:changelog')}
          {unseenReleasesCount > 0 && (
            <Chip
              component="span"
              label={unseenReleasesCount}
              size="small"
              color="primary"
              sx={{ height: 16, fontSize: 10, fontWeight: 600, cursor: 'inherit', '& .MuiChip-label': { px: 0.75 } }}
            />
          )}
        </Link>
        {serverVersion !== clientVersion && <Typography variant="caption">{t('footer:mismatch')}</Typography>}
      </Box>
    </Box>
  )
}

export default Footer
