import { Box, Button, CircularProgress, Container, CssBaseline, Snackbar, Typography } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { fi } from 'date-fns/locale'
import { SnackbarProvider } from 'notistack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { initShibbolethPinger } from 'unfuck-spa-shibboleth-session'
import { EmbeddedProvider } from './contexts/EmbeddedContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import useCurrentUser from './hooks/useCurrentUser'
import { AnalyticsProvider } from './stores/analytics'
import useTheme from './theme'
import type { User } from './types'
import { useUpdateUrlLang } from './hooks/useUpdateUrlLang'
import Styles from './GlobalStyles'
import './styles.css'
import GlobalMenu from './components/GlobalMenu'
import HYLoadingSpinner from './components/ChatV2/general/HYLoadingSpinner'
import { DisclaimerModal } from './components/Disclaimer'
import { GlobalSettings } from './components/GlobalSettings'
import { Feedback } from './components/Feedback'
import { SuperSpeedLoginAs } from './components/Admin/SuperSpeedLoginAs'
import { useLoggedInAs } from './hooks/useLoggedInAs'
import NotificationBanner from './components/common/NotificationBanner'
import { resolveContentView, getRedirect } from './util/contentView'

const AdminLoggedInAsBanner = () => {
  const [open, setOpen] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const adminLoggedInAs = localStorage.getItem('adminLoggedInAs')
    if (adminLoggedInAs) {
      setOpen(true)
      setUser(JSON.parse(localStorage.getItem('adminLoggedInAsUser') || 'null'))
    }
  }, [])

  const handleClick = () => {
    setOpen(false)
    localStorage.removeItem('adminLoggedInAs')
    localStorage.removeItem('adminLoggedInAsUser')
    window.location.reload()
  }

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      open={open}
      message={`You are currently logged in as ${user?.studentNumber} ${user?.lastName} ${user?.firstNames}`}
      action={
        <Button color="secondary" onClick={handleClick}>
          {t('back')}
        </Button>
      }
    />
  )
}

const App = () => (
  <DarkModeProvider>
    <ThemedApp />
  </DarkModeProvider>
)

const ThemedApp = () => {
  useUpdateUrlLang()
  const theme = useTheme()

  useEffect(() => {
    initShibbolethPinger()
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Styles />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fi}>
        <SnackbarProvider preventDuplicate autoHideDuration={15_000}>
          <EmbeddedProvider>
            <AnalyticsProvider>
              <Layout />
            </AnalyticsProvider>
          </EmbeddedProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

const Layout = () => {
  const { user, isSuccess } = useCurrentUser()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [disclaimerStatus, setDisclaimerStatus] = React.useState(false)
  useEffect(() => {
    if (user && !user.termsAcceptedAt) {
      setDisclaimerStatus(true)
    }
  }, [isSuccess])
  const { isLoggedInAs } = useLoggedInAs()

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          height: 'auto',
        }}
      >
        <NotificationBanner />
        <Feedback open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
        <GlobalSettings open={settingsOpen} setOpen={setSettingsOpen} />
        <DisclaimerModal disclaimerStatus={disclaimerStatus} setDisclaimerStatus={setDisclaimerStatus} />
        <Box sx={{ top: 20, right: 20, zIndex: 999, position: 'fixed' }}>
          <GlobalMenu openDisclaimer={() => setDisclaimerStatus(true)} openSettings={() => setSettingsOpen(true)} openFeedback={() => setFeedbackOpen(true)} />
        </Box>
        <Content />
      </Box>
      <AdminLoggedInAsBanner />
      {(user?.isAdmin || isLoggedInAs) && <SuperSpeedLoginAs />}
    </>
  )
}

const LoginError = ({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) => {
  const { t } = useTranslation()

  return (
    <Container sx={{ mt: '4rem' }} maxWidth="sm">
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        <Typography variant="h5">{t('common:fetchError')}</Typography>
        <Button variant="contained" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? <CircularProgress size={20} /> : t('common:retryMessage')}
        </Button>
      </Box>
    </Container>
  )
}

const Content = () => {
  const { courseId } = useParams()
  const location = useLocation()
  const { user, isLoading, isError, refetch, isFetching } = useCurrentUser()

  const view = resolveContentView({
    isLoading,
    isError,
    user,
    courseId,
    onNoAccessPage: location.pathname.includes('/noaccess'),
  })

  if (view === 'loading') return <HYLoadingSpinner />
  if (view === 'error') return <LoginError onRetry={() => refetch()} isRetrying={isFetching} />
  if (view === 'redirect') return <Navigate to={getRedirect(user)} />
  if (view === 'nothing') return null

  return (
    <Box sx={{ flex: 1 }}>
      <Outlet />
    </Box>
  )
}

export default App
