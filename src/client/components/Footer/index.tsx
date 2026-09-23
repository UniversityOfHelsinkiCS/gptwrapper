import { Badge, Box, Typography, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import toskaColor from '../../assets/toscalogo_color.svg'
import { formatDistanceToNow } from 'date-fns'
import { locales } from '../../locales/locales'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useHasUnseenReleases } from '../../hooks/useChangelog'

const Footer = () => {
  const { t, i18n } = useTranslation()
  const { user } = useCurrentUser()
  const hasUnseenReleases = useHasUnseenReleases()

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
        <Badge variant="dot" color="primary" invisible={!hasUnseenReleases} sx={{ alignSelf: 'flex-start', '& .MuiBadge-badge': { right: -6 } }}>
          <Link component={RouterLink} to="/changelog" variant="caption" underline="hover">
            {t('footer:changelog')}
          </Link>
        </Badge>
        {serverVersion !== clientVersion && <Typography variant="caption">{t('footer:mismatch')}</Typography>}
      </Box>
    </Box>
  )
}

export default Footer
