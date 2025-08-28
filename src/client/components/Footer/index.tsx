import { Box, Typography, Link } from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'

import toskaColor from '../../assets/toscalogo_color.svg'
import { formatDistanceToNow, formatDuration, interval } from 'date-fns'
import { locales } from '../../locales/locales'
import useCurrentUser from '../../hooks/useCurrentUser'

const supportEmail = 'opetusteknologia@helsinki.fi'

const styles = {
  supportBox: {
    p: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}

const Footer = () => {
  const { t, i18n } = useTranslation()
  const { user } = useCurrentUser()

  const uptime = formatDistanceToNow(user?.lastRestart ?? Date.now(), { locale: locales[i18n.language] })
  const serverVersion = user?.serverVersion
  const clientVersion = import.meta.env.VITE_VERSION as string | undefined

  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
      }}
    >
      <Box sx={styles.supportBox}>
        <Box>
          <Typography>
            <Trans
              i18nKey="footer:contactSupport"
              values={{ supportEmail }}
              components={{
                mailTo: <Link href={`mailto:${supportEmail}`} underline="hover" color="toskaPrimary.main" />,
              }}
            />
          </Typography>
          <Box display="flex" gap="1rem" mt="1rem">
            <Box display="flex" flexDirection="column">
              <Typography variant="caption">{t('footer:server', { version: serverVersion })}</Typography>
              <Typography variant="caption">{t('footer:client', { version: clientVersion })}</Typography>
              {user?.isAdmin && <Typography variant="caption">{t('footer:uptime', { uptime })}</Typography>}
              {serverVersion !== clientVersion && <Typography variant="caption">{t('footer:mismatch')}</Typography>}
            </Box>
            <Link href="https://toska.dev" target="_blank" rel="noopener" underline="hover">
              <img src={toskaColor} alt="Toska" width="40" />
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default Footer
