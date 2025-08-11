import { Box, Typography, Link } from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'

import toskaColor from '../../assets/toscalogo_color.svg'
import { useQuery } from '@tanstack/react-query'
import { maxBy } from 'lodash'
import type { Release } from '../../../shared/types'
import { formatDistanceToNow } from 'date-fns'
import { locales } from '../../locales/locales'

const supportEmail = 'opetusteknologia@helsinki.fi'

const styles = {
  supportBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}

const Footer = () => {
  const { t, i18n } = useTranslation()

  const { data: changelog } = useQuery<Release[]>({
    queryKey: ['/changelog'],
    select: (data) => {
      const last = maxBy(data, (d) => Date.parse(d.time))
      return last ? [last] : []
    },
  })

  const publishedAgo = formatDistanceToNow(changelog?.[0]?.time ?? new Date().getTime(), { addSuffix: true, locale: locales[i18n.language] })

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        width: '100%',
        py: '1rem',
        px: '1rem',
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
          <Typography variant="caption">{t('footer:version', { version: changelog?.[0]?.version, publishedAgo })}</Typography>
        </Box>
      </Box>
      <Box display="flex" flexDirection="column">
        {/*<Typography variant="caption">Locally and responsibly produced software from University of Helsinki.</Typography>*/}

        <Link href="https://toska.dev" target="_blank" rel="noopener" underline="hover">
          <img src={toskaColor} alt="Toska" width="40" />
        </Link>
      </Box>
    </Box>
  )
}

export default Footer
