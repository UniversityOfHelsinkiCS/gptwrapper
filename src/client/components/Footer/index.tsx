import { Box, Typography, Link } from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'

import toskaColor from '../../assets/toscalogo_color.svg'
import { useQuery } from '@tanstack/react-query'
import { maxBy } from 'lodash'
import { Release } from '../../../shared/types'
import { formatDistanceToNow } from 'date-fns'
import { locales } from '../../locales/locales'

const supportEmail = 'opetusteknologia@helsinki.fi'

const styles = {
  supportBox: {
    py: '1rem',
    px: '3rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: '1rem',
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
      sx={(theme) => ({
        backgroundColor: theme.palette.toskaDark.main,
        color: theme.palette.toskaDark.contrastText,
        mt: 'auto',
        width: '100%',
      })}
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

        <Box sx={styles.imageBox}>
          <Link href="https://toska.dev" target="_blank" rel="noopener" underline="hover">
            <img src={toskaColor} alt="Toska" width="70" />
          </Link>
        </Box>
      </Box>
    </Box>
  )
}

export default Footer
