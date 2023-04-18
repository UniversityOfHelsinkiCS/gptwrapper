import React from 'react'
import { Box, Typography, Link } from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import styles from '../../styles'

import toskaColor from '../../assets/toscalogo_color.svg'

const supportEmail = 'grp-toska@helsinki.fi'

const Footer = () => {
  useTranslation()

  const { footerStyles } = styles

  return (
    <Box
      component="footer"
      sx={(theme) => ({
        backgroundColor: theme.palette.toskaDark.main,
        color: theme.palette.toskaDark.contrastText,
      })}
    >
      <Box sx={footerStyles.supportBox}>
        <Box>
          <Typography>
            <Trans
              i18nKey="footer:contactSupport"
              values={{ supportEmail }}
              components={{
                mailTo: (
                  <Link
                    href={`mailto:${supportEmail}`}
                    underline="hover"
                    color="toskaPrimary.main"
                  />
                ),
              }}
            />
          </Typography>
        </Box>

        <Box sx={footerStyles.imageBox}>
          <Link
            href="https://toska.dev"
            target="_blank"
            rel="noopener"
            underline="hover"
          >
            <img src={toskaColor} alt="Toska" width="70" />
          </Link>
        </Box>
      </Box>
    </Box>
  )
}

export default Footer
