import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { fi } from 'date-fns/locale'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'
import { Box, Button, Container, CssBaseline, Snackbar } from '@mui/material'

import useTheme from './theme'
import NavBar from './components/NavBar'
import Footer from './components/Footer'

const AdminLoggedInAsBanner = () => {
  const [open, setOpen] = React.useState(false)

  useEffect(() => {
    const adminLoggedInAs = localStorage.getItem('adminLoggedInAs')
    if (adminLoggedInAs) {
      setOpen(true)
    }
  }, [])

  const handleClick = () => {
    setOpen(false)
    localStorage.removeItem('adminLoggedInAs')
    window.location.reload()
  }

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      open={open}
      message="You are logged in as someone else!"
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
