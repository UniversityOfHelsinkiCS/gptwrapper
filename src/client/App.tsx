import { Box, Button, CircularProgress, Container, CssBaseline, Snackbar, Typography } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import { ThemeProvider } from '@mui/material/styles'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { fi } from 'date-fns/locale'
import { SnackbarProvider } from 'notistack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { initShibbolethPinger } from 'unfuck-spa-shibboleth-session'
import { EmbeddedProvider } from './contexts/EmbeddedContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import useCurrentUser from './hooks/useCurrentUser'
import { AnalyticsProvider } from './stores/analytics'
import useTheme, { focusVisibleOutline } from './theme'
import type { User } from './types'
import { useUpdateUrlLang } from './hooks/useUpdateUrlLang'
import Styles from './GlobalStyles'
import './styles.css'
import GlobalMenu from './components/GlobalMenu'
import HYLoadingSpinner from './components/ChatV2/general/HYLoadingSpinner'
import { DisclaimerModal } from './components/Disclaimer'
import { GlobalSettings } from './components/GlobalSettings'
import { ApiKeysDialog } from './components/ApiKeys/ApiKeysDialog'
import { Feedback } from './components/Feedback'
import { SuperSpeedLoginAs } from './components/Admin/SuperSpeedLoginAs'
import { useLoggedInAs } from './hooks/useLoggedInAs'
import NotificationBanner from './components/common/NotificationBanner'
import { announceSnackbar } from './components/common/accessibility/SnackbarAnnouncer'
import { MAX_SNACKBARS, forgetClosedSnackbar, snackbarComponents } from './components/common/Snackbar'
import { resolveContentView, getRedirect } from './util/contentView'
import safeLocalStorage from './util/safeLocalStorage'
import { useMediaQuery } from '@mui/material'

const AdminLoggedInAsBanner = () => {
  const [open, setOpen] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const adminLoggedInAs = safeLocalStorage.getItem('adminLoggedInAs')
    if (adminLoggedInAs) {
      setOpen(true)
      setUser(JSON.parse(safeLocalStorage.getItem('adminLoggedInAsUser') || 'null'))
    }
  }, [])

  const handleClick = () => {
    setOpen(false)
    safeLocalStorage.removeItem('adminLoggedInAs')
    safeLocalStorage.removeItem('adminLoggedInAsUser')
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

const skipLinkSx = {
  ...visuallyHidden,
  '&:focus-visible': {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    zIndex: 1300,
    width: 'auto',
    height: 'auto',
    bgcolor: 'primary.main',
    borderRadius: '0.5rem',
    p: 1.8,
    color: 'white',
    margin: 1,
    overflow: 'visible',
    clip: 'auto',
    clipPath: 'none',
    whiteSpace: 'normal',
    ...focusVisibleOutline,
  },
}

const SkipToContent = () => {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const target = document.querySelector<HTMLElement>('[data-skip-target]') ?? document.getElementById('main-content')
    target?.focus()
  }
  if (isMobile) return

  return (
    <Box component="a" href="#main-content" onClick={handleClick} sx={skipLinkSx}>
      {t('accessibility:skipToContent')}
    </Box>
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
        <SnackbarProvider
          maxSnack={MAX_SNACKBARS}
          autoHideDuration={null}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          Components={snackbarComponents}
          onEnter={announceSnackbar}
          onClose={forgetClosedSnackbar}
        >
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
  const { t } = useTranslation()
  const { user, isSuccess } = useCurrentUser()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [apiKeysOpen, setApiKeysOpen] = React.useState(false)
  const [disclaimerStatus, setDisclaimerStatus] = React.useState(false)
  const headerRef = React.useRef<HTMLElement>(null)
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
        <SkipToContent />
        <Box component="header" ref={headerRef}>
          <Typography component="h1" sx={visuallyHidden}>
            {t('common:appName')}
          </Typography>
          <Box sx={{ top: 20, right: 20, zIndex: 999, position: 'fixed' }}>
            <GlobalMenu
              openDisclaimer={() => setDisclaimerStatus(true)}
              openSettings={() => setSettingsOpen(true)}
              openFeedback={() => setFeedbackOpen(true)}
              openApiKeys={() => setApiKeysOpen(true)}
              container={headerRef}
            />
          </Box>
        </Box>
        <NotificationBanner />
        <Feedback open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
        <GlobalSettings open={settingsOpen} setOpen={setSettingsOpen} />
        <ApiKeysDialog open={apiKeysOpen} setOpen={setApiKeysOpen} />
        <DisclaimerModal disclaimerStatus={disclaimerStatus} setDisclaimerStatus={setDisclaimerStatus} />
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
        <Typography variant="h5" component="h2">
          {t('common:fetchError')}
        </Typography>
        <Button variant="contained" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? <CircularProgress size={20} /> : t('common:retryMessage')}
        </Button>
      </Box>
    </Container>
  )
}

const Content = () => {
  const location = useLocation()
  const { user, isLoading, isError, refetch, isFetching } = useCurrentUser()

  const view = resolveContentView({
    isLoading,
    isError,
    user,
    onNoAccessPage: location.pathname.includes('/noaccess'),
  })

  if (view === 'redirect') return <Navigate to={getRedirect(user)} />

  return (
    <Box component="main" id="main-content" tabIndex={-1} sx={{ flex: 1, '&:focus-visible': { outline: 'none' } }}>
      {view === 'loading' && <HYLoadingSpinner />}
      {view === 'error' && <LoginError onRetry={() => refetch()} isRetrying={isFetching} />}
      {view !== 'loading' && view !== 'error' && <Outlet />}
    </Box>
  )
}

export default App
