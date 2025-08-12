import React from 'react'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { OutlineButtonBlack } from './ChatV2/general/Buttons'
import { ArrowBack, Replay } from '@mui/icons-material'
import { useRouteError } from 'react-router-dom'
import * as Sentry from '@sentry/react'

export const ErrorPage = () => {
  const error = useRouteError() as Error
  const { t } = useTranslation()

  React.useEffect(() => {
    Sentry.addBreadcrumb({
      category: 'errorPage',
      message: error.message,
      level: 'fatal',
    })
    Sentry.captureException(error)
  }, [error])

  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '80vh',
        gap: 4,
      }}
    >
      <Typography variant="h4" component="h1">
        {t('error:unexpected')}
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ maxWidth: '600px' }}>
        {t('error:description')}
      </Typography>
      {error?.message && (
        <Box
          sx={{
            mt: 2,
            p: 4,
            backgroundColor: 'black',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: 14,
            width: '40%',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <b>{t('error:errorMessage')}:</b> {error.message} <br />
          <b>{t('error:stackTrace')}:</b> {error.stack}
          <br />
          {error.cause ? (
            <>
              <b>{t('error:cause')}:</b> {error.cause + ''}
            </>
          ) : null}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <OutlineButtonBlack startIcon={<ArrowBack />} onClick={handleGoHome}>
          {t('error:goHome')}
        </OutlineButtonBlack>
        <OutlineButtonBlack startIcon={<Replay />} onClick={handleReload}>
          {t('error:reload')}
        </OutlineButtonBlack>
      </Box>
    </Box>
  )
}
