import React from 'react'
import { Outlet } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { Box } from '@mui/material'

import useTheme from './theme'
import NavBar from './components/NavBar'
import Footer from './components/Footer'

const App = () => {
  const theme = useTheme()

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SnackbarProvider preventDuplicate>
          <Box minHeight="100vh" display="flex" flexDirection="column">
            <NavBar />
            <Outlet />
            <Footer />
          </Box>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
