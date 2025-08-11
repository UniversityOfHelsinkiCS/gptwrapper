import { Box, Button, CssBaseline, Snackbar } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { fi } from 'date-fns/locale'
import { SnackbarProvider } from 'notistack'
import React, { useEffect, useRef } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { initShibbolethPinger } from 'unfuck-spa-shibboleth-session'
import { PUBLIC_URL } from '../config'
import { Feedback } from './components/Feedback'
import Footer from './components/Footer'
import NavBar from './components/NavBar'
import { AppContext } from './contexts/AppContext'
import { EmbeddedProvider, useIsEmbedded } from './contexts/EmbeddedContext'
import useCurrentUser from './hooks/useCurrentUser'
import { AnalyticsProvider } from './stores/analytics'
import useTheme from './theme'
import type { User } from './types'
import { useUpdateUrlLang } from './hooks/useUpdateUrlLang'
import Styles from './GlobalStyles'

const hasAccess = (user: User | null | undefined, courseId?: string) => {
  if (!user) return false
  if (user.isAdmin) return true
  if (courseId && !user.activeCourseIds.includes(courseId)) return false

  if (!courseId && window.location.pathname.endsWith('/chats')) return true
  if (!courseId && !user.hasIamAccess) return false

  return true
}

const getRedirect = (user: User | null | undefined) => {
  if (!user) return '/noaccess'
  if (user.hasIamAccess) return '/'
  if (user.activeCourseIds.length > 0) return '/chats'

  return '/noaccess'
}

const AdminLoggedInAsBanner = () => {
  const [open, setOpen] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)

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
          Return to yourself
        </Button>
      }
    />
  )
}

const App = () => {
  useUpdateUrlLang()
  const theme = useTheme()
  const { courseId } = useParams()
  const location = useLocation()
  const { user, isLoading } = useCurrentUser()

  useEffect(() => {
    initShibbolethPinger()
  }, [])
  const onNoAccessPage = location.pathname.includes('/noaccess')

  if (isLoading && !onNoAccessPage) return null

  if (!onNoAccessPage && !hasAccess(user, courseId)) {
    window.location.href = PUBLIC_URL + getRedirect(user)
    return null
  }

  if (!user && !onNoAccessPage) return null

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
  const appRef = useRef<HTMLDivElement>(null)
  const isEmbedded = useIsEmbedded()

  return (
    <AppContext.Provider value={appRef}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          height: 'auto',
        }}
        ref={appRef}
      >
        {!isEmbedded && <NavBar />}
        <Box sx={{ flex: 1, overscrollBehavior: 'none' }}>
          <Outlet />
        </Box>
        <Feedback />
      </Box>
      <AdminLoggedInAsBanner />
    </AppContext.Provider>
  )
}

export default App
