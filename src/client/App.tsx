import { Box, Button, CircularProgress, CssBaseline, Snackbar } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { fi } from 'date-fns/locale'
import { SnackbarProvider } from 'notistack'
import React, { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { initShibbolethPinger } from 'unfuck-spa-shibboleth-session'
import { EmbeddedProvider } from './contexts/EmbeddedContext'
import useCurrentUser from './hooks/useCurrentUser'
import { AnalyticsProvider } from './stores/analytics'
import useTheme from './theme'
import type { User } from './types'
import { useUpdateUrlLang } from './hooks/useUpdateUrlLang'
import Styles from './GlobalStyles'
import './styles.css'
import GlobalMenu from './components/GlobalMenu'
import HYLoadingSpinner from './components/ChatV2/general/HYLoadingSpinner'

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
        <Box sx={{ top: 20, right: 20, zIndex: 999, position: 'fixed' }}>
          <GlobalMenu />
        </Box>
        <Content />
      </Box>
      <AdminLoggedInAsBanner />
    </>
  )
}

const Content = () => {
  const { courseId } = useParams()
  const location = useLocation()
  const { user, isLoading } = useCurrentUser()

  const onNoAccessPage = location.pathname.includes('/noaccess')

  if (isLoading && !onNoAccessPage) return <HYLoadingSpinner />

  if (!onNoAccessPage && !hasAccess(user, courseId)) {
    return <Navigate to={getRedirect(user)} />
  }

  if (!user && !onNoAccessPage) return null

  return (
    <Box sx={{ flex: 1 }}>
      <Outlet />
    </Box>
  )
}

export default App
