import React, { useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { initShibbolethPinger } from 'unfuck-spa-shibboleth-session'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { fi } from 'date-fns/locale'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'
import { Box, Button, Container, CssBaseline, Snackbar } from '@mui/material'

import { PUBLIC_URL } from '../config'
import { User } from './types'
import useTheme from './theme'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import useCurrentUser from './hooks/useCurrentUser'

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
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fi}>
        <SnackbarProvider preventDuplicate>
          <Box minHeight="100vh" display="flex" flexDirection="column">
            <NavBar />
            <Container component="main" sx={{ mt: '4rem', mb: '10rem' }}>
              <Outlet />
            </Container>
            <Footer />
          </Box>
          <AdminLoggedInAsBanner />
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
