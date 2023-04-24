import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { ThemeProvider } from '@mui/material/styles'
import { Box } from '@mui/material'

import useTheme from './theme'
import router from './router'
import NavBar from './components/NavBar'
import Footer from './components/Footer'

const App = () => {
  const theme = useTheme()

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider preventDuplicate>
        <Box>
          <NavBar />
          <RouterProvider router={router} />
          <Footer />
        </Box>
      </SnackbarProvider>
    </ThemeProvider>
)}

export default App
