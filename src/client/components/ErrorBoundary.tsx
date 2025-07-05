import React from 'react'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { setErrorStateHandler } from '../util/apiClient'
import { OutlineButtonBlack } from './ChatV2/generics/Buttons'
import { ArrowBack, Replay } from '@mui/icons-material'

// todo: setup sentry

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }

    setErrorStateHandler((error: Error) => {
      this.setState({ hasError: true, error })
    })
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  emptyErrorState = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} setErrorState={this.emptyErrorState} />
    }

    return this.props.children
  }
}

const ErrorPage = ({ error, setErrorState }: { error?: Error; setErrorState: VoidFunction }) => {
  const { t } = useTranslation()

  const handleReload = () => {
    setErrorState()
    window.location.reload()
  }

  const handleGoHome = () => {
    setErrorState()
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
          <b>{t('error:errorName')}:</b> {error.name} <br />
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
