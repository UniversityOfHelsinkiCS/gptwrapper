import React from 'react'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import SettingsButton from './ChatV2/generics/SettingsButton'
import { setErrorStateHandler } from '../util/apiClient'

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
  const navigate = useNavigate()

  const handleReload = () => {
    setErrorState()
    navigate(window.location.pathname, { replace: true })
  }

  const handleGoHome = () => {
    setErrorState()
    navigate('/', { replace: true })
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
          <b>{t('error:errorMessage')}:</b> {error.message}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <SettingsButton onClick={handleGoHome}>{t('error:goHome')}</SettingsButton>
        <SettingsButton onClick={handleReload}>{t('error:reload')}</SettingsButton>
      </Box>
    </Box>
  )
}
