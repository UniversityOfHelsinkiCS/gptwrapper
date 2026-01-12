import { Box, Typography, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'
import toskaColor from '../../assets/toscalogo_color.svg'
import { formatDistanceToNow } from 'date-fns'
import { locales } from '../../locales/locales'
import useCurrentUser from '../../hooks/useCurrentUser'

const Footer = () => {
  const { t, i18n } = useTranslation()
  const { user } = useCurrentUser()

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
        <img src={toskaColor} alt="Toska" width="100%" />
      </Link>
      <Box flex={2} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption">{t('footer:server', { version: serverVersion })}</Typography>
        <Typography variant="caption">{t('footer:client', { version: clientVersion })}</Typography>
        <Typography variant="caption">{t('footer:uptime', { uptime })}</Typography>
        {serverVersion !== clientVersion && <Typography variant="caption">{t('footer:mismatch')}</Typography>}
      </Box>
    </Box>
  )
}

export default Footer
