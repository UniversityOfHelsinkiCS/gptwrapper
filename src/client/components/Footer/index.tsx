import { Box, Typography, Link } from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'

import toskaColor from '../../assets/toscalogo_color.svg'

const supportEmail = 'opetusteknologia@helsinki.fi'

const styles = {
  supportBox: {
    py: '2rem',
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
  useTranslation()

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
