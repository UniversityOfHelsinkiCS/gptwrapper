import React from 'react'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { OutlineButtonBlack } from './ChatV2/general/Buttons'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Replay from '@mui/icons-material/Replay'
import { useRouteError } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import axios from 'axios'
import { usePageTitle } from '../hooks/usePageTitle'

export const SessionExpiredError = () => {
  const { t } = useTranslation()

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: 4,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" component="h1">
        {t('error:sessionExpired')}
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ maxWidth: '600px' }}>
        {t('error:pleaseReload')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
        <OutlineButtonBlack startIcon={<Replay />} onClick={handleReload}>
          {t('error:reload')}
        </OutlineButtonBlack>
      </Box>
    </Box>
  )
}
export const ErrorPage = () => {
  const error = useRouteError() as Error
  const { t } = useTranslation()

  const isAxiosError = axios.isAxiosError(error)
  usePageTitle(isAxiosError && !error.response ? t('error:sessionExpired') : t('error:unexpected'))

  React.useEffect(() => {
    if (!isAxiosError || error.response) {
      Sentry.addBreadcrumb({
        category: 'errorPage',
        message: error.message,
        level: 'fatal',
      })
    }
    Sentry.captureException(error)
  }, [error])

  if (isAxiosError && !error.response) {
    return <SessionExpiredError />
  }

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
        minHeight: '80vh',
        gap: 4,
        px: 2,
        textAlign: 'center',
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
            p: { xs: 2, sm: 4 },
            backgroundColor: 'grey.900',
            color: 'common.white',
            fontFamily: 'monospace',
            fontSize: 14,
            width: '100%',
            maxWidth: '800px',
            borderRadius: 1,
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
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
